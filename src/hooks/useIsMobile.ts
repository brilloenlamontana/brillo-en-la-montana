import { useState, useEffect } from 'react';

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;

    // Check URL override: ?mobile=true / ?mobile=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') === 'true' || params.get('mobile') === '1') {
      return true;
    }

    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isSmallScreen = window.innerWidth <= 1024;

    return hasTouch && (isMobileUA || isCoarse || isSmallScreen);
  });

  useEffect(() => {
    const checkIsMobile = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mobile') === 'true' || params.get('mobile') === '1') {
        setIsMobile(true);
        return;
      }

      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const isSmallScreen = window.innerWidth <= 1024;

      setIsMobile(hasTouch && (isMobileUA || isCoarse || isSmallScreen));
    };

    window.addEventListener('resize', checkIsMobile);

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkIsMobile);
    }

    // If a touch event occurs, ensure mobile controls are activated
    const onTouch = () => {
      setIsMobile(true);
      window.removeEventListener('touchstart', onTouch);
    };
    window.addEventListener('touchstart', onTouch, { passive: true, once: true });

    return () => {
      window.removeEventListener('resize', checkIsMobile);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', checkIsMobile);
      }
      window.removeEventListener('touchstart', onTouch);
    };
  }, []);

  return isMobile;
};
