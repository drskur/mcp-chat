import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollState {
  isAtBottom: boolean;
  autoScrollEnabled: boolean;
  showScrollButton: boolean;
}

interface UseScrollControlOptions {
  offset?: number;
  smooth?: boolean;
  content?: React.ReactNode;
  showButtonThreshold?: number;
}

export function useScrollControl(options: UseScrollControlOptions = {}) {
  const { 
    offset = 20, 
    smooth = true, 
    content,
    showButtonThreshold = 150 
  } = options;
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastContentHeight = useRef(0);
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

      setScrollState(prev => ({
        ...prev,
        isAtBottom: true,
        autoScrollEnabled: true,
        showScrollButton: false,
      }));
      
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

  // Auto-scroll on content change
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const currentHeight = scrollElement.scrollHeight;
    const hasNewContent = currentHeight !== lastContentHeight.current;

    if (hasNewContent) {
      if (scrollState.autoScrollEnabled) {
        requestAnimationFrame(() => {
          scrollToBottom(lastContentHeight.current === 0);
        });
      }
      lastContentHeight.current = currentHeight;
    }
  }, [content, scrollState.autoScrollEnabled, scrollToBottom]);

  // Handle resize
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(() => {
      if (scrollState.autoScrollEnabled) {
        scrollToBottom(true);
      }
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [scrollState.autoScrollEnabled, scrollToBottom]);

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