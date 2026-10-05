import React, { useState } from 'react';
import { Logout } from '../components/auth/Logout';
import { MobileControls } from '../components/ui/MobileControls';
import { MobileControlsToggle } from '../components/ui/MobileControlsToggle';
import { WorldScene } from '../components/scene/WorldScene';
import { HealthUI } from '../components/models-3d/avatar/HealthUI';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { BackpackButton } from '../components/ui/backpack/BackpackButton';
import { Toast } from '../components/ui/Toast';
import { QuickItemBar } from '../components/ui/backpack/QuickItemBar';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAuthGuard } from '../hooks/useAuthGuard';

export const WorldPage: React.FC = () => {
  const isAllowed = useAuthGuard();
  const detectedMobile = useIsMobile();
  const [manualControlsToggle, setManualControlsToggle] = useState<boolean | null>(null);

  // If not mobile, always hide controls. If mobile, respect toggle.
  const showMobileControls = detectedMobile && (manualControlsToggle !== null ? manualControlsToggle : detectedMobile);

  if (!isAllowed) return null;

  return (
    <main style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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
      <LoadingScreen />
    </main>
  );
};
