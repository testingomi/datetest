
import { useState, useRef, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface SwipeOptions {
  threshold?: number;
}

export function useSwipeGesture(
  elementRef: React.RefObject<HTMLElement>, 
  handlers: SwipeHandlers, 
  options: SwipeOptions = {}
) {
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const animationFrame = useRef<number>();
  
  const threshold = options.threshold || 100;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      setSwiping(false);
      setDirection(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX.current) return;
      
      const currentX = e.touches[0].clientX;
      const diff = touchStartX.current - currentX;
      
      if (Math.abs(diff) > 20) {
        setSwiping(true);
        setDirection(diff > 0 ? 'left' : 'right');
      }

      // Use requestAnimationFrame for smooth animations
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      animationFrame.current = requestAnimationFrame(() => {
        if (Math.abs(diff) > 20 && element) {
          const translateX = -diff / 3;
          const rotation = -diff / 30;
          const opacity = 1 - (Math.abs(diff) / (threshold * 3));
          
          element.style.transform = `translateX(${translateX}px) rotate(${rotation}deg)`;
          element.style.opacity = opacity.toString();
        }
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }

      touchEndX.current = e.changedTouches[0].clientX;
      
      if (touchStartX.current && touchEndX.current) {
        const diff = touchStartX.current - touchEndX.current;
        
        if (Math.abs(diff) > threshold && element) {
          const translateX = diff > 0 ? -1000 : 1000;
          const rotation = diff > 0 ? -30 : 30;
          
          element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
          element.style.transform = `translateX(${translateX}px) rotate(${rotation}deg)`;
          element.style.opacity = '0';
          
          // Call handler after animation
          setTimeout(() => {
            if (diff > 0 && handlers.onSwipeLeft) {
              handlers.onSwipeLeft();
            } else if (diff < 0 && handlers.onSwipeRight) {
              handlers.onSwipeRight();
            }
            
            // Reset styles with delay to ensure smooth transition
            requestAnimationFrame(() => {
              if (element) {
                element.style.transition = 'none';
                element.style.transform = '';
                element.style.opacity = '1';
              }
            });
          }, 300);
        } else if (element) {
          // Reset position with animation if threshold not met
          element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
          element.style.transform = '';
          element.style.opacity = '1';
          
          setTimeout(() => {
            if (element) {
              element.style.transition = 'none';
            }
          }, 300);
        }
      }
      
      // Reset states
      touchStartX.current = null;
      touchEndX.current = null;
      setSwiping(false);
      setDirection(null);
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    // Cleanup
    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, handlers.onSwipeLeft, handlers.onSwipeRight, threshold]);

  return { direction, swiping };
}
