import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Enhanced debounced state hook with mobile-optimized performance
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300,
): [T, T, (value: T) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      setIsPending(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setDebouncedValue(newValue);
        setIsPending(false);
      }, delay);
    },
    [delay],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, debouncedValue, updateValue, isPending];
}

/**
 * Optimized search hook for large datasets
 */
export function useOptimizedSearch<T>(
  items: T[],
  searchFields: (keyof T)[],
  initialQuery: string = "",
) {
  const [query, debouncedQuery, setQuery, isSearching] = useDebouncedState(
    initialQuery,
    200,
  );
  const [filteredItems, setFilteredItems] = useState<T[]>(items);
  const workerRef = useRef<Worker | null>(null);

  // Use Web Worker for heavy search operations on large datasets
  useEffect(() => {
    if (typeof window !== "undefined" && items.length > 1000) {
      // Create a simple Web Worker for search
      const workerCode = `
        self.onmessage = function(e) {
          const { items, query, fields } = e.data;
          const queryLower = query.toLowerCase();
          
          const filtered = items.filter(item => {
            return fields.some(field => {
              const value = item[field];
              if (typeof value === 'string') {
                return value.toLowerCase().includes(queryLower);
              }
              if (typeof value === 'object' && value !== null) {
                return JSON.stringify(value).toLowerCase().includes(queryLower);
              }
              return false;
            });
          });
          
          self.postMessage(filtered);
        };
      `;

      const blob = new Blob([workerCode], { type: "application/javascript" });
      workerRef.current = new Worker(URL.createObjectURL(blob));

      workerRef.current.onmessage = (e) => {
        setFilteredItems(e.data);
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [items.length]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    // Use Web Worker for large datasets, regular filter for smaller ones
    if (workerRef.current && items.length > 1000) {
      workerRef.current.postMessage({
        items,
        query: debouncedQuery,
        fields: searchFields,
      });
    } else {
      // Regular filtering for smaller datasets
      const queryLower = debouncedQuery.toLowerCase();
      const filtered = items.filter((item) => {
        return searchFields.some((field) => {
          const value = item[field];
          if (typeof value === "string") {
            return value.toLowerCase().includes(queryLower);
          }
          if (typeof value === "object" && value !== null) {
            return JSON.stringify(value).toLowerCase().includes(queryLower);
          }
          return false;
        });
      });
      setFilteredItems(filtered);
    }
  }, [items, debouncedQuery, searchFields]);

  return {
    query,
    setQuery,
    filteredItems,
    isSearching: isSearching || debouncedQuery !== query,
    hasQuery: debouncedQuery.trim().length > 0,
    resultCount: filteredItems.length,
  };
}

/**
 * Virtual scrolling hook for large lists
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    onScroll: (e: React.UIEvent<HTMLElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = { threshold: 0.1 },
) {
  const [entries, setEntries] = useState<IntersectionObserverEntry[]>([]);
  const observer = useRef<IntersectionObserver | null>(null);

  const observe = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.observe(element);
    }
  }, []);

  const unobserve = useCallback((element: Element) => {
    if (observer.current) {
      observer.current.unobserve(element);
    }
  }, []);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (observedEntries) => setEntries(observedEntries),
      options,
    );

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [options]);

  return { entries, observe, unobserve };
}
