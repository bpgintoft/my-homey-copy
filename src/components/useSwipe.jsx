import { useEffect, useRef } from 'react';

export function useSwipe(onSwipe, elementRef) {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const minSwipeDistance = 50;

  useEffect(() => {
    const element = elementRef?.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      touchStartX.current = e.changedTouches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      touchEndX.current = e.changedTouches[0].clientX;
      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        onSwipe('left');
      } else if (isRightSwipe) {
        onSwipe('right');
      }
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipe, elementRef]);
}