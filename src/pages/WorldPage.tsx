import React, { useEffect, useState } from 'react';
import { Logout } from '../components/auth/Logout';
import { MobileControls } from '../components/ui/MobileControls';
import { MobileControlsToggle } from '../components/ui/MobileControlsToggle';
import { WorldScene } from '../components/scene/WorldScene';
import { HealthUI } from '../components/models-3d/avatar/HealthUI';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { BackpackButton } from '../components/ui/backpack/BackpackButton';
import { Toast } from '../components/ui/Toast';
import { QuickItemBar } from '../components/ui/backpack/QuickItemBar';
import { AnnouncementModal, MAYOR_ANNOUNCEMENT_IMAGE_URL } from '../components/models-3d/objects/card/AnnouncementModal';
import { AldeanoModal, ALDEANO_IMAGE_URL } from '../components/models-3d/npcs/aldeano/AldeanoModal';
import { ImeriModal } from '../components/models-3d/npcs/imeri/ImeriModal';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuthGuard } from '../hooks/useAuthGuard';

// Las imágenes de los diálogos se decodifican al entrar al mundo: abrirlos después no congela ningún cuadro.
const DIALOG_IMAGES = [MAYOR_ANNOUNCEMENT_IMAGE_URL, ALDEANO_IMAGE_URL];

export const WorldPage: React.FC = () => {
  const isAllowed = useAuthGuard();
  const detectedMobile = useIsMobile();
  const [manualControlsToggle, setManualControlsToggle] = useState<boolean | null>(null);

  // If not mobile, always hide controls. If mobile, respect toggle.
  const showMobileControls = detectedMobile && (manualControlsToggle !== null ? manualControlsToggle : detectedMobile);

  useEffect(() => {
    DIALOG_IMAGES.forEach((url) => {
      const image = new Image();
      image.src = url;
      image.decode?.().catch(() => undefined);
    });
  }, []);

  if (!isAllowed) return null;

  return (
    <main className="w-screen h-screen relative overflow-hidden select-none">
      {detectedMobile && (
        <MobileControlsToggle
          showMobileControls={showMobileControls}
          detectedMobile={detectedMobile}
          setManualControlsToggle={setManualControlsToggle}
        />
      )}
      <WorldScene />
      <Logout leading={<BackpackButton />} />
      <MobileControls show={showMobileControls} />
      <QuickItemBar raised={showMobileControls} />
      <Toast />
      <HealthUI />
      <AnnouncementModal />
      <AldeanoModal />
      <ImeriModal />
      <LoadingScreen />
    </main>
  );
};
