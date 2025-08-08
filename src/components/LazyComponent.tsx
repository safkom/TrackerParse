'use client';

import React, { useRef, useEffect, useState } from 'react';

interface IntersectionObserverProps {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  fallback?: React.ReactNode;
}

export const LazyComponent: React.FC<IntersectionObserverProps> = ({
  children,
  threshold = 0.1,
  rootMargin = '50px',
  fallback = null
}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          // Once intersected, stop observing
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin]);

  return (
    <div ref={ref}>
      {isIntersecting ? children : fallback}
    </div>
  );
};

export default LazyComponent;
