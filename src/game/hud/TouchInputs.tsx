import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { useButtonStore, useJoystickStore } from 'ecctrl/input';

// The joystick and the held buttons of the touch controls. They write to the same stores as ecctrl's own (which
// PlayerController reads), but they never get stuck: ecctrl's ignore every new touch while they believe an old one is
// still down, so one lost "finger lifted" event (the browser drops them when the game stalls for a moment, loading a
// place, or when the screen turns) left the avatar walking by itself with the controls dead. Here:
//  - a new touch always takes the control, whatever happened to the one before;
//  - the end of a touch is also read from the window and from the list of fingers really on the screen;
//  - leaving the page, turning the screen or a stalled frame lets go of everything. After a stall the joystick takes
//    its push again from the next movement of the thumb that still holds it.

const JOYSTICK_ID = 'default';
// A frame this long (ms) is the game stalling: what was held is let go.
const STALL_MS = 400;
const CENTRED = 'translate(-50%, -50%)';
const SPRING = 'transform 0.2s cubic-bezier(0.25, 1.5, 0.5, 1)';
const NO_TOUCH: CSSProperties = { touchAction: 'none', overscrollBehavior: 'none', userSelect: 'none', WebkitUserSelect: 'none' };

type Hold = { pointer: number; finger: boolean };

// Tells when what a finger holds on `element` has to be let go though its own pointer events never said so: `drop`
// for good (the finger is gone), `stall` for a moment (the game froze; the finger may still be there).
function useLostTouch(element: RefObject<HTMLElement | null>, held: RefObject<Hold | null>, drop: () => void, stall: () => void) {
  const handlers = useRef({ drop, stall });
  useEffect(() => {
    handlers.current = { drop, stall };
  });

  useEffect(() => {
    const ended = (event: PointerEvent) => {
      if (held.current?.pointer === event.pointerId) handlers.current.drop();
    };
    // No finger left on the control, whatever the pointer events said.
    const fingers = (event: TouchEvent) => {
      const node = element.current;
      if (!held.current?.finger || !node) return;
      for (const touch of Array.from(event.touches)) if (touch.target instanceof Node && node.contains(touch.target)) return;
      handlers.current.drop();
    };
    const away = () => {
      if (held.current) handlers.current.drop();
    };
    const hidden = () => {
      if (document.hidden) away();
    };
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      if (now - last > STALL_MS && held.current) handlers.current.stall();
      last = now;
      frame = requestAnimationFrame(tick);
    });

    window.addEventListener('pointerup', ended, true);
    window.addEventListener('pointercancel', ended, true);
    window.addEventListener('touchend', fingers, { capture: true, passive: true });
    window.addEventListener('touchcancel', fingers, { capture: true, passive: true });
    window.addEventListener('blur', away);
    window.addEventListener('orientationchange', away);
    document.addEventListener('visibilitychange', hidden);
    document.addEventListener('fullscreenchange', away);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointerup', ended, true);
      window.removeEventListener('pointercancel', ended, true);
      window.removeEventListener('touchend', fingers, true);
      window.removeEventListener('touchcancel', fingers, true);
      window.removeEventListener('blur', away);
      window.removeEventListener('orientationchange', away);
      document.removeEventListener('visibilitychange', hidden);
      document.removeEventListener('fullscreenchange', away);
    };
  }, [element, held]);
}

const capture = (event: ReactPointerEvent<HTMLElement>) => {
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // The pointer is already gone: the window listeners end the touch.
  }
};

type TouchJoystickProps = {
  // How far the knob travels from the centre (px): pushed that far is a full push.
  maxRadius: number;
  wrapperStyle: CSSProperties;
  baseStyle: CSSProperties;
  knobStyle: CSSProperties;
};

// The walking joystick: dragging the knob writes its push (x right, y forward, -1..1) to ecctrl's joystick store.
export function TouchJoystick({ maxRadius, wrapperStyle, baseStyle, knobStyle }: TouchJoystickProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const held = useRef<Hold | null>(null);
  const centre = useRef({ x: 0, y: 0 });

  // The knob goes back to the middle and the avatar stops.
  const rest = () => {
    if (knob.current) {
      knob.current.style.transition = SPRING;
      knob.current.style.transform = CENTRED;
    }
    useJoystickStore.getState().resetJoystick(JOYSTICK_ID);
  };
  const drop = () => {
    held.current = null;
    rest();
  };
  const push = (clientX: number, clientY: number) => {
    let dx = clientX - centre.current.x;
    let dy = clientY - centre.current.y;
    const distance = Math.hypot(dx, dy);
    if (distance > maxRadius) {
      dx *= maxRadius / distance;
      dy *= maxRadius / distance;
    }
    if (knob.current) {
      knob.current.style.transition = 'none';
      knob.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    useJoystickStore.getState().setJoystick(dx / maxRadius, -dy / maxRadius, JOYSTICK_ID);
  };

  useLostTouch(wrapper, held, drop, rest);
  useEffect(() => () => useJoystickStore.getState().resetJoystick(JOYSTICK_ID), []);

  const end = (event: ReactPointerEvent) => {
    if (held.current?.pointer === event.pointerId) drop();
  };

  return (
    <div
      ref={wrapper}
      style={{ ...NO_TOUCH, ...wrapperStyle }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = base.current?.getBoundingClientRect();
        if (!rect) return;
        // A new touch always takes the joystick.
        held.current = { pointer: event.pointerId, finger: event.pointerType === 'touch' };
        centre.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        capture(event);
        push(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (held.current?.pointer === event.pointerId) push(event.clientX, event.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div ref={base} style={{ position: 'absolute', top: '50%', left: '50%', transform: CENTRED, touchAction: 'none', ...baseStyle }}>
        <div ref={knob} style={{ position: 'absolute', top: '50%', left: '50%', transform: CENTRED, transition: SPRING, willChange: 'transform', pointerEvents: 'none', ...knobStyle }} />
      </div>
    </div>
  );
}

type TouchButtonProps = {
  // Name of the button in ecctrl's button store ('jump').
  id: string;
  children: ReactNode;
  wrapperStyle: CSSProperties;
  capStyle: CSSProperties;
};

// A button that acts while it is held (jump).
export function TouchButton({ id, children, wrapperStyle, capStyle }: TouchButtonProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLDivElement>(null);
  const held = useRef<Hold | null>(null);

  const press = (down: boolean) => {
    useButtonStore.getState().setButtonActive(id, down);
    if (cap.current) {
      cap.current.style.transform = down ? `${CENTRED} scale(1.3)` : CENTRED;
      cap.current.style.opacity = down ? '0.5' : '1';
    }
  };
  const drop = () => {
    held.current = null;
    press(false);
  };

  useLostTouch(wrapper, held, drop, drop);
  useEffect(() => () => useButtonStore.getState().setButtonActive(id, false), [id]);

  const end = (event: ReactPointerEvent) => {
    if (held.current?.pointer === event.pointerId) drop();
  };

  return (
    <div
      ref={wrapper}
      style={{ ...NO_TOUCH, ...wrapperStyle }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        held.current = { pointer: event.pointerId, finger: event.pointerType === 'touch' };
        capture(event);
        press(true);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      <div ref={cap} style={{ position: 'absolute', top: '50%', left: '50%', transform: CENTRED, transition: SPRING, willChange: 'transform', pointerEvents: 'none', ...capStyle }}>
        {children}
      </div>
    </div>
  );
}
