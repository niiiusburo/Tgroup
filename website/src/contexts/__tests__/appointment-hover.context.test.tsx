/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppointmentHoverProvider, useAppointmentHover } from '../AppointmentHoverContext';
import React from 'react';

describe('AppointmentHoverContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppointmentHoverProvider>{children}</AppointmentHoverProvider>
  );

  beforeEach(() => {
    // Reset any state between tests
  });

  it('should provide null hoveredId by default', () => {
    const { result } = renderHook(() => useAppointmentHover(), { wrapper });
    
    expect(result.current.hoveredId).toBeNull();
  });

  it('should set hoveredId when setHoveredId is called', () => {
    const { result } = renderHook(() => useAppointmentHover(), { wrapper });
    
    act(() => {
      result.current.setHoveredId('apt-123');
    });
    
    expect(result.current.hoveredId).toBe('apt-123');
  });

  it('should clear hoveredId when setHoveredId is called with null', () => {
    const { result } = renderHook(() => useAppointmentHover(), { wrapper });
    
    act(() => {
      result.current.setHoveredId('apt-123');
    });
    
    act(() => {
      result.current.setHoveredId(null);
    });
    
    expect(result.current.hoveredId).toBeNull();
  });

  it('should provide refs map for scrolling', () => {
    const { result } = renderHook(() => useAppointmentHover(), { wrapper });
    
    expect(result.current.appointmentRefs).toBeDefined();
    expect(typeof result.current.appointmentRefs.current).toBe('object');
  });

  it('should provide registerRef function', () => {
    const { result } = renderHook(() => useAppointmentHover(), { wrapper });
    
    expect(result.current.registerRef).toBeDefined();
    expect(typeof result.current.registerRef).toBe('function');
  });

  it('should provide scrollToAppointment function', () => {
    const { result } = renderHook(() => useAppointmentHover(), { wrapper });
    
    expect(result.current.scrollToAppointment).toBeDefined();
    expect(typeof result.current.scrollToAppointment).toBe('function');
  });

  it('should scroll to appointment when scrollToAppointment is called', () => {
    const { result } = renderHook(() => useAppointmentHover(), { wrapper });
    
    // Create a mock element with scrollIntoView
    const mockElement = {
      scrollIntoView: (options: ScrollIntoViewOptions) => {
        expect(options.behavior).toBe('smooth');
        expect(options.block).toBe('center');
      },
    };
    
    // Register the mock ref
    act(() => {
      result.current.registerRef('apt-123', mockElement as HTMLElement);
    });
    
    // Call scrollToAppointment
    act(() => {
      result.current.scrollToAppointment('apt-123');
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = () => {};
    
    expect(() => {
      renderHook(() => useAppointmentHover());
    }).toThrow('useAppointmentHover must be used within AppointmentHoverProvider');
    
    console.error = consoleError;
  });
});
