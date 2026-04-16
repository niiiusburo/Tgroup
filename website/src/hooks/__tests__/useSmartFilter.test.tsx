import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSmartFilter } from '../useSmartFilter';

describe('useSmartFilter', () => {
  it('toggles items and manages all-selected state', () => {
    const { result } = renderHook(() => useSmartFilter<string>());

    act(() => result.current.toggle('A'));
    expect(result.current.selected).toEqual(['A']);

    act(() => result.current.toggle('B'));
    expect(result.current.selected).toEqual(['A', 'B']);

    act(() => result.current.toggle('A'));
    expect(result.current.selected).toEqual(['B']);

    act(() => result.current.clear());
    expect(result.current.selected).toEqual([]);
    expect(result.current.isAllSelected).toBe(true);
  });

  it('supports setSelected for batch updates', () => {
    const { result } = renderHook(() => useSmartFilter<string>());
    act(() => result.current.setSelected(['X', 'Y']));
    expect(result.current.selected).toEqual(['X', 'Y']);
    expect(result.current.isAllSelected).toBe(false);
  });
});
