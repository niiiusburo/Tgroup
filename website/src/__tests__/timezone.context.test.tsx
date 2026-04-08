/**
 * TDD Tests for TimezoneContext
 * Agent 1: Core Timezone Infrastructure
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TimezoneProvider, useTimezone } from '@/contexts/TimezoneContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('TimezoneContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should provide default timezone (Asia/Ho_Chi_Minh)', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TimezoneProvider, null, children);
    
    const { result } = renderHook(() => useTimezone(), { wrapper });

    expect(result.current.timezone).toBe('Asia/Ho_Chi_Minh');
  });

  it('should load timezone from localStorage if available', () => {
    localStorageMock.setItem('tdental_timezone', 'America/New_York');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TimezoneProvider, null, children);
    
    const { result } = renderHook(() => useTimezone(), { wrapper });

    expect(result.current.timezone).toBe('America/New_York');
  });

  it('should update timezone and persist to localStorage', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TimezoneProvider, null, children);
    
    const { result } = renderHook(() => useTimezone(), { wrapper });

    act(() => {
      result.current.setTimezone('UTC');
    });

    expect(result.current.timezone).toBe('UTC');
    expect(localStorageMock.getItem('tdental_timezone')).toBe('UTC');
  });

  it('should provide getToday function returning YYYY-MM-DD format', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TimezoneProvider, null, children);
    
    const { result } = renderHook(() => useTimezone(), { wrapper });

    const today = result.current.getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should provide formatDate function', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TimezoneProvider, null, children);
    
    const { result } = renderHook(() => useTimezone(), { wrapper });

    const testDate = new Date('2026-04-08T03:00:00Z');
    const formatted = result.current.formatDate(testDate, 'yyyy-MM-dd');
    expect(formatted).toBe('2026-04-08');
  });

  it('should provide available timezones list', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(TimezoneProvider, null, children);
    
    const { result } = renderHook(() => useTimezone(), { wrapper });

    expect(result.current.availableTimezones.length).toBeGreaterThan(0);
    expect(result.current.availableTimezones[0].value).toBe('Asia/Ho_Chi_Minh');
  });
});
