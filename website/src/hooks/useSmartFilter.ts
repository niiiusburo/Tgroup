import { useState, useCallback, useMemo } from 'react';

export interface UseSmartFilterReturn<T> {
  selected: T[];
  isAllSelected: boolean;
  toggle: (value: T) => void;
  clear: () => void;
  setSelected: (values: T[]) => void;
}

export function useSmartFilter<T>(initialSelected: T[] = []) {
  const [selected, setSelected] = useState<T[]>(initialSelected);

  const toggle = useCallback((value: T) => {
    setSelected((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      return [...prev, value];
    });
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
  }, []);

  const isAllSelected = useMemo(() => selected.length === 0, [selected]);

  return { selected, isAllSelected, toggle, clear, setSelected };
}
