import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

/**
 * Hook for detecting when an element enters the viewport
 * Useful for infinite scroll, lazy loading, animations
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0, root = null, rootMargin = '0px', freezeOnceVisible = false } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [node, setNode] = useState<Element | null>(null);

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  useEffect(() => {
    if (!node || frozen) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      { threshold, root, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node, threshold, root, rootMargin, frozen]);

  return {
    ref: setNode,
    entry,
    isIntersecting: !!entry?.isIntersecting,
  };
}

/**
 * Hook for infinite scroll functionality
 * Triggers callback when user scrolls near bottom
 */
export function useInfiniteScroll(
  callback: () => void,
  options: {
    threshold?: number;
    rootMargin?: string;
    enabled?: boolean;
  } = {}
) {
  const { threshold = 0.1, rootMargin = '100px', enabled = true } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [targetRef, setTargetRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !targetRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(targetRef);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [targetRef, callback, threshold, rootMargin, enabled]);

  return setTargetRef;
}
