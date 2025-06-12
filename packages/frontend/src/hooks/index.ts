/**
 * Centralized Hooks Export
 * 
 * Organized hook exports with clear categorization
 */

// Core functionality hooks (reusable across components)
export * from './core';

// UI-specific hooks
export * from './ui';

// Business logic hooks
export * from './business';

// Chat feature hooks
export * from './chat';

// Backward compatibility exports
// These maintain compatibility with existing imports
export { useIsMobile } from './core/useDeviceDetection';
export { useAutoResizeTextarea } from './ui/useAutoResize';

// Legacy hooks (deprecated - use new organized structure)
// These will be phased out in future versions
export { useChatState } from './chat/useChatState';
export { useFileManager as useFileAttachment } from './core/useFileManager';
export { useModelManager } from './business/useModelManager';
export { useUserSettings } from './business/useUserSettings';