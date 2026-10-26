// First: the GLTF loader must know where the Draco decoder is before the challenges preload their models.
import '@/game/engine/models/dracoDecoder';
import { useState } from 'react';
import { useOnboardingRedirect } from '@/app/onboarding';
import { UserMenu } from '@/components/auth/UserMenu';
import { Toast } from '@/components/Toast';
import { CHALLENGES } from '@/game/challenges/registry';
import { useWebGPUSupport } from '@/game/engine/rendering/useWebGPUSupport';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { GameCanvas } from '@/game/GameCanvas';
import { BackpackButton } from '@/game/hud/backpack/BackpackButton';
import { BajoDialog } from '@/game/hud/BajoDialog';
import { QuickItemBar } from '@/game/hud/backpack/QuickItemBar';
import { MobileControls } from '@/game/hud/MobileControls';
import { MobileControlsToggle } from '@/game/hud/MobileControlsToggle';
import { PlayerStatus } from '@/game/hud/PlayerStatus';
import { RendererErrorScreen } from '@/game/hud/RendererErrorScreen';
import { WorldLoadingScreen } from '@/game/hud/WorldLoadingScreen';
import { useIsMobile } from '@/hooks/useIsMobile';

// The game: the 3D world with its HUD and the dialogs of every challenge drawn over it.
export default function WorldPage() {
  const step = useOnboardingRedirect('/mundo');
  const webgpu = useWebGPUSupport();
  const rendererError = useWorldStore((state) => state.rendererError);
  const ready = useWorldStore((state) => state.ready);
  const isMobile = useIsMobile();
  // On touch devices the joystick shows unless the player hides it.
  const [touchControls, setTouchControls] = useState<boolean | null>(null);
  const showTouchControls = isMobile && (touchControls ?? true);

  if (step !== 'mundo') return null;
  if (webgpu === 'unsupported') return <RendererErrorScreen error="unsupported" />;
  if (rendererError) return <RendererErrorScreen error={rendererError} />;

  return (
    <main className="w-screen h-screen relative overflow-hidden select-none">
      {webgpu === 'ok' && <GameCanvas />}
      {CHALLENGES.map(({ id, Hud }) => Hud && <Hud key={id} />)}
      {isMobile && (
        <MobileControlsToggle showMobileControls={showTouchControls} detectedMobile={isMobile} setManualControlsToggle={setTouchControls} />
      )}
      <UserMenu leading={<BackpackButton />} />
      <MobileControls show={showTouchControls} />
      <QuickItemBar raised={showTouchControls} />
      <PlayerStatus />
      <Toast />
      {CHALLENGES.map(({ id, Dialogs }) => Dialogs && <Dialogs key={id} />)}
      <BajoDialog />
      {!ready && <WorldLoadingScreen />}
    </main>
  );
}
