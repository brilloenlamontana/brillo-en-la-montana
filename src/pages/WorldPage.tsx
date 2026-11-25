// First: the GLTF loader must know where the Draco decoder is before the challenges preload their models.
import '@/game/engine/models/dracoDecoder';
import { useOnboardingRedirect } from '@/app/onboarding';
import { UserMenu } from '@/components/auth/UserMenu';
import { Toast } from '@/components/Toast';
import { CHALLENGES } from '@/game/challenges/registry';
import { useRenderBackend } from '@/game/engine/rendering/useRenderBackend';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { GameCanvas } from '@/game/GameCanvas';
import { BackpackButton } from '@/game/hud/backpack/BackpackButton';
import { BajoDialog } from '@/game/hud/BajoDialog';
import { IntroVideo } from '@/game/hud/IntroVideo';
import { QuickItemBar } from '@/game/hud/backpack/QuickItemBar';
import { Minimap } from '@/game/hud/Minimap';
import { MobileControls } from '@/game/hud/MobileControls';
import { ObjectiveLine } from '@/game/hud/ObjectiveLine';
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

// The game: the 3D world with its HUD and the dialogs of every challenge drawn over it.
export default function WorldPage() {
  const step = useOnboardingRedirect('/mundo');
  // WebGPU, or WebGL 2 where the device has none (see rendering/backend.ts).
  const backend = useRenderBackend();
  const rendererError = useWorldStore((state) => state.rendererError);
  const ready = useWorldStore((state) => state.ready);
  const introVista = useProgressStore((state) => state.progress.introVista);
  // On touch devices: the joystick and its buttons, and the game is played with the screen on its side.
  const showTouchControls = useIsMobile();

  if (step !== 'mundo') return null;
  if (backend === 'none') return <RendererErrorScreen error="unsupported" />;
  if (rendererError) return <RendererErrorScreen error={rendererError} />;
  // First visit: the introduction plays before anything of the world is mounted; the world loads when it ends. The
  // video is square and is watched with the phone held either way: turning it is only asked for the world.
  if (!introVista) return <IntroVideo onDone={() => void saveProgress({ introVista: true })} />;

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
            <TutorialButton />
            <SoundToggle />
            <BackpackButton />
          </>
        }
      />
      <MobileControls show={showTouchControls} />
      <QuickItemBar touch={showTouchControls} />
      <PlayerStatus />
      <Minimap touch={showTouchControls} />
      <ObjectiveLine touch={showTouchControls} />
      <Tutorial touch={showTouchControls} />
      <Toast />
      {CHALLENGES.map(({ id, Dialogs }) => Dialogs && <Dialogs key={id} />)}
      <BajoDialog />
      {!ready && <WorldLoadingScreen />}
      <LandscapeOnly />
    </main>
  );
}
