import { useState, useCallback, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/core/useDeviceDetection';

interface UseSidebarOptions {
  defaultOpen?: boolean;
  cookieName?: string;
  cookieMaxAge?: number;
  keyboardShortcut?: string;
}

interface SidebarState {
  state: 'expanded' | 'collapsed';
  open: boolean;
  openMobile: boolean;
  isMobile: boolean;
}

interface SidebarActions {
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleDesktop: () => void;
  toggleMobile: () => void;
}

const DEFAULT_OPTIONS: Required<UseSidebarOptions> = {
  defaultOpen: true,
  cookieName: 'sidebar_state',
  cookieMaxAge: 60 * 60 * 24 * 7, // 7 days
  keyboardShortcut: 'b',
};

export function useSidebar(options: UseSidebarOptions = {}) {
  const {
    defaultOpen,
    cookieName,
    cookieMaxAge,
    keyboardShortcut,
  } = { ...DEFAULT_OPTIONS, ...options };

  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);
  const [open, _setOpen] = useState(() => {
    // Try to get initial state from cookie
    if (typeof document !== 'undefined') {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${cookieName}=`));
      
      if (cookie) {
        return cookie.split('=')[1] === 'true';
      }
    }
    return defaultOpen;
  });

  const setOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value;
      _setOpen(openState);

      // Save to cookie
      if (typeof document !== 'undefined') {
        document.cookie = `${cookieName}=${openState}; path=/; max-age=${cookieMaxAge}`;
      }
    },
    [open, cookieName, cookieMaxAge]
  );

  const toggleDesktop = useCallback(() => {
    setOpen(prev => !prev);
  }, [setOpen]);

  const toggleMobile = useCallback(() => {
    setOpenMobile(prev => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    return isMobile ? toggleMobile() : toggleDesktop();
  }, [isMobile, toggleMobile, toggleDesktop]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === keyboardShortcut &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, keyboardShortcut]);

  // Auto-close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile && openMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, openMobile]);

  const state: SidebarState = useMemo(
    () => ({
      state: open ? 'expanded' : 'collapsed',
      open,
      openMobile,
      isMobile,
    }),
    [open, openMobile, isMobile]
  );

  const actions: SidebarActions = useMemo(
    () => ({
      setOpen,
      setOpenMobile,
      toggleSidebar,
      toggleDesktop,
      toggleMobile,
    }),
    [setOpen, setOpenMobile, toggleSidebar, toggleDesktop, toggleMobile]
  );

  return {
    ...state,
    ...actions,
  };
}

// Constants for consistent sidebar styling
export const SIDEBAR_CONSTANTS = {
  WIDTH: '16rem',
  WIDTH_MOBILE: '18rem',
  WIDTH_ICON: '3rem',
  COOKIE_NAME: 'sidebar_state',
  COOKIE_MAX_AGE: 60 * 60 * 24 * 7,
  KEYBOARD_SHORTCUT: 'b',
} as const;