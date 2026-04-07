import { useState, useEffect, useRef } from 'react';

export function useCountUp(
  target: number,
  duration: number = 2000,
  startOnMount: boolean = true
): { value: number; start: () => void } {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  const start = () => {
    startTimeRef.current = null;
    setValue(0);
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }
      
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      setValue(Math.floor(easeOutQuart * target));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (startOnMount) {
      start();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, duration, startOnMount]);

  return { value, start };
}
