import { useState, useRef, useEffect, useCallback } from 'react';

export const useScrollManager = () => {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // 하단으로 스크롤하는 함수
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
      
      setUserHasScrolled(false);
      isNearBottomRef.current = true;
    }
  };

  // 스크롤 위치 감지 함수
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    
    setShowScrollButton(!isNearBottom);
    
    if (!isNearBottom && !userHasScrolled) {
      setUserHasScrolled(true);
    } else if (isNearBottom && userHasScrolled) {
      setUserHasScrolled(false);
    }
    
    isNearBottomRef.current = isNearBottom;
  }, [userHasScrolled]);

  // 스크롤 이벤트 리스너 등록
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  return {
    showScrollButton,
    userHasScrolled,
    messagesEndRef,
    scrollContainerRef,
    isNearBottomRef,
    scrollToBottom,
    handleScroll
  };
};