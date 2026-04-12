import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CurrencyInput } from './CurrencyInput';

describe('CurrencyInput', () => {
  it('renders formatted value with dots', () => {
    render(<CurrencyInput value={1000000} onChange={() => {}} aria-label="amount" />);
    expect(screen.getByLabelText('amount')).toHaveValue('1.000.000');
  });

  it('fires onChange as digits are typed', () => {
    const handle = vi.fn();
    render(<CurrencyInput value={null} onChange={handle} aria-label="amount" />);
    const input = screen.getByLabelText('amount');
    fireEvent.change(input, { target: { value: '1000' } });
    expect(handle).toHaveBeenLastCalledWith(1000);
  });

  it('normalizes pasted formatted value', () => {
    const handle = vi.fn();
    render(<CurrencyInput value={null} onChange={handle} aria-label="amount" />);
    const input = screen.getByLabelText('amount');
    fireEvent.paste(input, {
      clipboardData: { getData: () => '1.500.000' },
    });
    expect(handle).toHaveBeenCalledWith(1500000);
  });

  it('ignores pasted garbage', () => {
    const handle = vi.fn();
    render(<CurrencyInput value={null} onChange={handle} aria-label="amount" />);
    const input = screen.getByLabelText('amount');
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'abc' },
    });
    expect(handle).not.toHaveBeenCalled();
  });

  it('rejects decimal keystroke', () => {
    const handle = vi.fn();
    render(<CurrencyInput value={null} onChange={handle} aria-label="amount" />);
    const input = screen.getByLabelText('amount');
    const evt = fireEvent.keyDown(input, { key: '.' });
    // keyDown returns false when default was prevented
    expect(evt).toBe(false);
    expect(handle).not.toHaveBeenCalled();
  });

  it('clearing fires onChange(null)', () => {
    const handle = vi.fn();
    render(<CurrencyInput value={1000} onChange={handle} aria-label="amount" />);
    const input = screen.getByLabelText('amount');
    fireEvent.change(input, { target: { value: '' } });
    expect(handle).toHaveBeenLastCalledWith(null);
  });
});
