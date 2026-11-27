// First: the GLTF loader must know where the Draco decoder is before the challenges preload their models.
import '@/game/engine/models/dracoDecoder';
import { useEffect } from 'react';
import { useOnboardingRedirect } from '@/app/onboarding';
import { UserMenu } from '@/components/auth/UserMenu';
import { Toast } from '@/components/Toast';
import { CHALLENGES } from '@/game/challenges/registry';
import { useRenderBackend } from '@/game/engine/rendering/useRenderBackend';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { GameCanvas } from '@/game/GameCanvas';
import { BackpackButton } from '@/game/hud/backpack/BackpackButton';
import { BajoDialog } from '@/game/hud/BajoDialog';
import { IntroButton, IntroVideo } from '@/game/hud/IntroVideo';
import { QuickItemBar } from '@/game/hud/backpack/QuickItemBar';
import { Minimap } from '@/game/hud/Minimap';
import { MobileControls } from '@/game/hud/MobileControls';
import { ObjectiveButton, ObjectiveLine } from '@/game/hud/ObjectiveLine';
import { LandscapeOnly } from '@/game/hud/LandscapeOnly';
import { PlayerStatus } from '@/game/hud/PlayerStatus';
import { RendererErrorScreen } from '@/game/hud/RendererErrorScreen';
import { SoundToggle } from '@/game/hud/SoundToggle';
import { Tutorial, TutorialButton } from '@/game/hud/Tutorial';
import { WorldLoadingScreen } from '@/game/hud/WorldLoadingScreen';
import { GameSound } from '@/game/sound/GameSound';
import { DangerWarnings } from '@/game/challenges/DangerWarnings';
import { StoryFlags } from '@/game/challenges/StoryFlags';
import { useIsMobile } from '@/hooks/useIsMobile';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';

// The game: the 3D world with its HUD and the dialogs of every challenge drawn over it.
export default function WorldPage() {
  const step = useOnboardingRedirect('/mundo');
  // WebGPU, or WebGL 2 where the device has none (see rendering/backend.ts).
  const backend = useRenderBackend();
  const rendererError = useWorldStore((state) => state.rendererError);
  const ready = useWorldStore((state) => state.ready);
  const introVista = useProgressStore((state) => state.progress.introVista);
  // The player asked to watch the introduction again (IntroButton): it plays over the game, which waits under it.
  const introOpen = useUIStore((state) => state.introOpen);
  // While the first showing plays the game waits under it, as it does under a replay.
  useEffect(() => {
    if (!introVista) useUIStore.getState().setIntroOpen(true);
  }, [introVista]);
  // On touch devices: the joystick and its buttons, and the game is played with the screen on its side.
  const showTouchControls = useIsMobile();

  if (step !== 'mundo') return null;
  if (backend === 'none') return <RendererErrorScreen error="unsupported" />;
  if (rendererError) return <RendererErrorScreen error={rendererError} />;
  // First visit: the introduction plays over the world, which loads and gets ready behind it meanwhile (the video is
  // long: by its end nothing is left to load). The game waits under it (uiStore.introOpen) and it cannot be skipped. It
  // is square and is watched with the phone held either way: turning it is only asked for the world.
  const firstIntro = !introVista;

  return (
    <main className="w-screen h-dvh relative overflow-hidden select-none">
      {backend !== 'checking' && <GameCanvas />}
      <GameSound />
      <StoryFlags />
      <DangerWarnings />
      {CHALLENGES.map(({ id, Hud }) => Hud && <Hud key={id} />)}
      <UserMenu
        leading={
          <>
            <ObjectiveButton />
            <TutorialButton />
            <IntroButton />
            <SoundToggle />
            <BackpackButton />
          </>
        }
      />
      <MobileControls show={showTouchControls} />
      <QuickItemBar touch={showTouchControls} />
      <PlayerStatus />
      <Minimap touch={showTouchControls} />
      <ObjectiveLine />
      <Tutorial touch={showTouchControls} />
      <Toast />
      {CHALLENGES.map(({ id, Dialogs }) => Dialogs && <Dialogs key={id} />)}
      <BajoDialog />
      {!ready && <WorldLoadingScreen />}
      {!firstIntro && <LandscapeOnly />}
      {firstIntro && (
        <IntroVideo
          onDone={() => {
            void saveProgress({ introVista: true });
            useUIStore.getState().setIntroOpen(false);
          }}
        />
      )}
      {!firstIntro && introOpen && <IntroVideo replay onDone={() => useUIStore.getState().setIntroOpen(false)} />}
    </main>
  );
}
