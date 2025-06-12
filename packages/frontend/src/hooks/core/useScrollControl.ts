import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollState {
  isAtBottom: boolean;
  autoScrollEnabled: boolean;
  showScrollButton: boolean;
}

interface UseScrollControlOptions {
  offset?: number;
  smooth?: boolean;
  showButtonThreshold?: number;
}

export function useScrollControl(options: UseScrollControlOptions = {}) {
  const { 
    offset = 20, 
    smooth = true, 
    showButtonThreshold = 150 
  } = options;
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userHasScrolled = useRef(false);

  const [scrollState, setScrollState] = useState<ScrollState>({
    isAtBottom: true,
    autoScrollEnabled: true,
    showScrollButton: false,
  });

  const checkIsAtBottom = useCallback(
    (element: HTMLElement) => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceToBottom = Math.abs(scrollHeight - scrollTop - clientHeight);
      return distanceToBottom <= offset;
    },
    [offset]
  );

  const checkShowButton = useCallback(
    (element: HTMLElement) => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceToBottom = scrollHeight - scrollTop - clientHeight;
      return distanceToBottom > showButtonThreshold;
    },
    [showButtonThreshold]
  );

  const scrollToBottom = useCallback(
    (instant?: boolean) => {
      const element = scrollRef.current;
      if (!element) return;

      if (messagesEndRef.current) {
        // Use messagesEndRef if available (chat-style scrolling)
        messagesEndRef.current.scrollIntoView({
          behavior: instant ? 'auto' : (smooth ? 'smooth' : 'auto'),
          block: 'end'
        });
      } else {
        // Fallback to direct scrolling
        const targetScrollTop = element.scrollHeight - element.clientHeight;
        
        if (instant) {
          element.scrollTop = targetScrollTop;
        } else {
          element.scrollTo({
            top: targetScrollTop,
            behavior: smooth ? 'smooth' : 'auto',
          });
        }
      }

      // Don't update state here - let the scroll event handler do it
      userHasScrolled.current = false;
    },
    [smooth]
  );

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const atBottom = checkIsAtBottom(element);
    const shouldShowButton = checkShowButton(element);

    setScrollState(prev => ({
      isAtBottom: atBottom,
      autoScrollEnabled: atBottom ? true : prev.autoScrollEnabled,
      showScrollButton: shouldShowButton,
    }));

    if (!atBottom && !userHasScrolled.current) {
      userHasScrolled.current = true;
    } else if (atBottom && userHasScrolled.current) {
      userHasScrolled.current = false;
    }
  }, [checkIsAtBottom, checkShowButton]);

  const disableAutoScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const atBottom = checkIsAtBottom(element);
    
    if (!atBottom) {
      userHasScrolled.current = true;
      setScrollState(prev => ({
        ...prev,
        autoScrollEnabled: false,
      }));
    }
  }, [checkIsAtBottom]);

  const enableAutoScroll = useCallback(() => {
    setScrollState(prev => ({
      ...prev,
      autoScrollEnabled: true,
    }));
    userHasScrolled.current = false;
  }, []);

  // Scroll event listener
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);


  // Handle resize
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(() => {
      // Only scroll if currently at bottom to avoid interrupting user
      const atBottom = checkIsAtBottom(element);
      if (atBottom) {
        scrollToBottom(true);
      }
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [checkIsAtBottom, scrollToBottom]);

  return {
    // Refs
    scrollRef,
    messagesEndRef,
    
    // State
    isAtBottom: scrollState.isAtBottom,
    autoScrollEnabled: scrollState.autoScrollEnabled,
    showScrollButton: scrollState.showScrollButton,
    userHasScrolled: userHasScrolled.current,
    
    // Actions
    scrollToBottom: () => scrollToBottom(false),
    scrollToBottomInstant: () => scrollToBottom(true),
    disableAutoScroll,
    enableAutoScroll,
    handleScroll,
  };
}