import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  orientation: 'portrait' | 'landscape';
}

interface UseDeviceDetectionOptions {
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
}

const DEFAULT_MOBILE_BREAKPOINT = 768;
const DEFAULT_TABLET_BREAKPOINT = 1024;

export function useDeviceDetection(options: UseDeviceDetectionOptions = {}) {
  const {
    mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
    tabletBreakpoint = DEFAULT_TABLET_BREAKPOINT,
  } = options;

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        screenWidth: 1920,
        orientation: 'landscape',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < mobileBreakpoint,
      isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
      isDesktop: width >= tabletBreakpoint,
      screenWidth: width,
      orientation: width > height ? 'landscape' : 'portrait',
    };
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < mobileBreakpoint,
        isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
        isDesktop: width >= tabletBreakpoint,
        screenWidth: width,
        orientation: width > height ? 'landscape' : 'portrait',
      });
    };

    // Create media query listeners
    const mobileQuery = window.matchMedia(`(max-width: ${mobileBreakpoint - 1}px)`);
    const tabletQuery = window.matchMedia(`(max-width: ${tabletBreakpoint - 1}px)`);
    const orientationQuery = window.matchMedia('(orientation: landscape)');

    // Add listeners
    mobileQuery.addEventListener('change', updateDeviceInfo);
    tabletQuery.addEventListener('change', updateDeviceInfo);
    orientationQuery.addEventListener('change', updateDeviceInfo);
    window.addEventListener('resize', updateDeviceInfo);

    // Initial check
    updateDeviceInfo();

    // Cleanup
    return () => {
      mobileQuery.removeEventListener('change', updateDeviceInfo);
      tabletQuery.removeEventListener('change', updateDeviceInfo);
      orientationQuery.removeEventListener('change', updateDeviceInfo);
      window.removeEventListener('resize', updateDeviceInfo);
    };
  }, [mobileBreakpoint, tabletBreakpoint]);

  return deviceInfo;
}

// Backward compatibility - simple mobile detection hook
export function useIsMobile(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT): boolean {
  const { isMobile } = useDeviceDetection({ mobileBreakpoint: breakpoint });
  return isMobile;
}