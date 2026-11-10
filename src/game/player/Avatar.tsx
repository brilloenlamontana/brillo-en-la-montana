import { useEffect, useMemo, useRef, useState } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Vector3, type AnimationClip, type Group, type Mesh } from 'three';
import { avatarModelUrl, findCharacter, genderFolder } from '@/data/characters';
import { playOnceAndHold, setPace } from '@/game/engine/models/animation';
import { useAuthStore, type AvatarGender } from '@/store/authStore';
import { usePlayerStore } from './playerStore';

const FADE_SECONDS = 0.25;
const ANIMATIONS_DIR = '/models-3d/animations';
// Every character shares the Mixamo skeleton, so the clips are skeleton-only files reused by all of them: the
// locomotion set of the character's gender plus the clips common to everyone.
const GENDER_CLIPS = ['Idle', 'Walking', 'Running'] as const;
const SHARED_CLIPS = ['Death'] as const;
const CLIP_NAMES = [...GENDER_CLIPS, ...SHARED_CLIPS];
type ClipName = (typeof CLIP_NAMES)[number];

// Ground speed each locomotion clip was animated for, in meters per second per meter of character height (measured
// on the feet of the canonical skeleton). Each clip is played faster or slower so the feet keep up with the real
// speed of the capsule instead of sliding or spinning.
const CLIP_SPEED: Record<AvatarGender, { Walking: number; Running: number }> = {
  female: { Walking: 0.84, Running: 3.0 },
  male: { Walking: 0.92, Running: 2.95 },
};
const TIME_SCALE_RANGE: [number, number] = [0.65, 1.6];
// The run clip takes over once the avatar is really running (it accelerates from the walk for a moment), and gives way
// to the walk again a little lower, so the two never flicker.
const RUN_FROM_SPEED = 3.4;
const RUN_UNTIL_SPEED = 2.8;

const clipUrls = (gender: AvatarGender) => [
  ...GENDER_CLIPS.map((clip) => `${ANIMATIONS_DIR}/${genderFolder(gender)}/${clip}.glb`),
  ...SHARED_CLIPS.map((clip) => `${ANIMATIONS_DIR}/shared/${clip}.glb`),
];

// The character chosen by the player, animated from playerStore.action (crossfading between clips) and from how fast
// it is really moving. Taking damage plays no animation of its own.
export function Avatar() {
  const avatarRef = useRef<Group>(null);
  const avatarName = useAuthStore((state) => state.user?.avatarName);
  const action = usePlayerStore((state) => state.action);
  // Really running: the capsule has picked up running speed.
  const [atRunSpeed, setAtRunSpeed] = useState(false);
  const motion = useRef({ previous: new Vector3(), placed: false, speed: 0, atRunSpeed: false });

  const character = findCharacter(avatarName);
  const { scene } = useGLTF(avatarModelUrl(avatarName));
  const clipFiles = useGLTF(clipUrls(character.gender));
  // Each file holds one clip; it is renamed after its action so useAnimations exposes actions.Idle, actions.Walking...
  const clips = useMemo(
    () =>
      clipFiles.flatMap(({ animations }, i): AnimationClip[] => {
        if (!animations.length) return [];
        const clip = animations[0].clone();
        clip.name = CLIP_NAMES[i];
        return [clip];
      }),
    [clipFiles],
  );
  const { actions } = useAnimations(clips, avatarRef);

  // The skinned body follows the bones far from its rest bounding box (death, big strides): never cull it.
  useEffect(() => {
    scene.traverse((object) => {
      if ((object as Mesh).isMesh) object.frustumCulled = false;
    });
  }, [scene]);

  useEffect(() => {
    if (actions.Death) playOnceAndHold(actions.Death);
  }, [actions]);

  const shown: ClipName = action === 'Running' && !atRunSpeed ? 'Walking' : action;
  useEffect(() => {
    const current = actions[shown];
    current?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      current?.fadeOut(FADE_SECONDS);
    };
  }, [shown, actions]);

  // Shares the player's position every frame without re-renders or allocations (zones, enemies, items read it), and
  // matches the pace of the walk and run clips to the real ground speed.
  useFrame((_, delta) => {
    const avatar = avatarRef.current;
    if (!avatar) return;
    const position = usePlayerStore.getState().position;
    avatar.getWorldPosition(position);

    const m = motion.current;
    if (m.placed && delta > 0) {
      const instant = Math.hypot(position.x - m.previous.x, position.z - m.previous.z) / delta;
      // A teleport is not a sprint.
      if (instant < 15) m.speed = MathUtils.damp(m.speed, instant, 10, delta);
    }
    m.previous.copy(position);
    m.placed = true;

    const running = m.atRunSpeed ? m.speed > RUN_UNTIL_SPEED : m.speed > RUN_FROM_SPEED;
    if (running !== m.atRunSpeed) {
      m.atRunSpeed = running;
      setAtRunSpeed(running);
    }

    const natural = CLIP_SPEED[character.gender];
    for (const clip of ['Walking', 'Running'] as const) {
      setPace(actions[clip], MathUtils.clamp(m.speed / (natural[clip] * character.height), ...TIME_SCALE_RANGE));
    }
  });

  return (
    <group ref={avatarRef} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(clipUrls('female'));
