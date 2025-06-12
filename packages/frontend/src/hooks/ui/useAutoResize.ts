import { useCallback, useEffect, useRef } from 'react';

interface UseAutoResizeOptions {
  minHeight: number;
  maxHeight?: number;
  element?: 'textarea' | 'div';
}

export function useAutoResize(options: UseAutoResizeOptions) {
  const { minHeight, maxHeight } = options;
  const elementRef = useRef<HTMLTextAreaElement | HTMLDivElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const targetElement = elementRef.current;
      if (!targetElement) return;

      if (reset) {
        targetElement.style.height = `${minHeight}px`;
        return;
      }

      // Temporarily shrink to get the right scrollHeight
      targetElement.style.height = `${minHeight}px`;

      // Calculate new height
      const newHeight = Math.max(
        minHeight,
        Math.min(
          targetElement.scrollHeight,
          maxHeight ?? Number.POSITIVE_INFINITY,
        ),
      );

      targetElement.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  const adjustWidth = useCallback((reset?: boolean) => {
    const targetElement = elementRef.current;
    if (!targetElement) return;

    if (reset) {
      targetElement.style.width = 'auto';
      return;
    }

    // For horizontal auto-resize if needed
    targetElement.style.width = 'auto';
    targetElement.style.width = `${targetElement.scrollWidth}px`;
  }, []);

  // Set initial height
  useEffect(() => {
    const targetElement = elementRef.current;
    if (targetElement) {
      targetElement.style.height = `${minHeight}px`;
      targetElement.style.resize = 'none'; // Disable manual resize
    }
  }, [minHeight]);

  // Adjust height on window resize
  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  return {
    elementRef,
    adjustHeight,
    adjustWidth,
  };
}

// Specific hook for textarea auto-resize (backward compatibility)
export function useAutoResizeTextarea(
  options: Omit<UseAutoResizeOptions, 'element'>,
) {
  const { elementRef, adjustHeight, adjustWidth } = useAutoResize({
    ...options,
    element: 'textarea',
  });

  return {
    textareaRef: elementRef as React.RefObject<HTMLTextAreaElement>,
    adjustHeight,
    adjustWidth,
  };
}
