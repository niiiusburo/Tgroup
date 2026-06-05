import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { useCtvCreationForm } from './useCtvCreationForm';
import type { CtvCreationConfig } from './types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

async function setupI18n() {
  await i18n.changeLanguage('vi');
}

describe('useCtvCreationForm (TDD: tests describe expected behavior first)', () => {
  beforeEach(async () => {
    await setupI18n();
    vi.clearAllMocks();
  });

  const makeConfig = (mode: CtvCreationConfig['mode'], requireEmail = false): CtvCreationConfig => ({
    mode,
    requireEmail,
  });

  function renderUseCtvCreationForm(overrides: Partial<{ config: CtvCreationConfig; onSubmit: any }> = {}) {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const config = overrides.config ?? makeConfig('admin');
    const { result, rerender } = renderHook(
      () => useCtvCreationForm({ config, onSubmit: overrides.onSubmit ?? onSubmit }),
      { wrapper }
    );
    return { result, onSubmit, rerender };
  }

  it('initial state: empty fields, dental forced in lob_scope, no errors, not submitting, no success', () => {
    const { result } = renderUseCtvCreationForm();
    expect(result.current.values.name).toBe('');
    expect(result.current.values.phone).toBe('');
    expect(result.current.values.email).toBe('');
    expect(result.current.values.password).toBe('');
    expect(result.current.values.lob_scope).toEqual(['dental']);
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.canSubmit).toBe(false);
  });

  it('immutable updates: setters return new values objects, never mutate prior', () => {
    const { result } = renderUseCtvCreationForm();
    const before = result.current.values;
    act(() => {
      result.current.setName('Nguyễn Văn A');
    });
    expect(result.current.values).not.toBe(before);
    expect(before.name).toBe(''); // prior snapshot unchanged
    expect(result.current.values.name).toBe('Nguyễn Văn A');
  });

  it('toggleLob: dental always forced and cannot be removed; cosmetic toggles on/off idempotently', () => {
    const { result } = renderUseCtvCreationForm();
    expect(result.current.values.lob_scope).toEqual(['dental']);

    act(() => {
      result.current.toggleLob('cosmetic');
    });
    expect(result.current.values.lob_scope).toEqual(['dental', 'cosmetic']);

    act(() => {
      result.current.toggleLob('cosmetic');
    });
    expect(result.current.values.lob_scope).toEqual(['dental']);

    // cannot remove dental
    act(() => {
      result.current.toggleLob('dental');
    });
    expect(result.current.values.lob_scope).toEqual(['dental']);

    // adding cosmetic again
    act(() => {
      result.current.toggleLob('cosmetic');
    });
    expect(result.current.values.lob_scope).toContain('dental');
    expect(result.current.values.lob_scope).toContain('cosmetic');
  });

  it('submit with all core missing sets per-field errors + reusable core form error (Vietnamese from ctv ns)', async () => {
    const { result, onSubmit } = renderUseCtvCreationForm();
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.errors.name).toBeTruthy();
    expect(result.current.errors.phone).toBeTruthy();
    expect(result.current.errors.password).toBeTruthy();
    // core reusable message (exact from current JoinCtv + spec)
    expect(result.current.errors.form).toBe('Vui lòng nhập họ tên, số điện thoại và mật khẩu.');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.success).toBe(false);
  });

  it('per-field error for email when requireEmail=true and blank', async () => {
    const { result } = renderUseCtvCreationForm({ config: makeConfig('admin', true) });
    act(() => {
      result.current.setName('Test');
      result.current.setPhone('0909000000');
      result.current.setPassword('secret123');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.errors.email).toBeTruthy();
    expect(result.current.errors.form).toContain('email');
  });

  it('email is optional by default (no error when blank/falsy); clean payload omits email key', async () => {
    const { result, onSubmit } = renderUseCtvCreationForm({ config: makeConfig('portal-recruit') });
    act(() => {
      result.current.setName('No Email');
      result.current.setPhone('0909000000');
      result.current.setPassword('secret123');
      result.current.setEmail('   '); // falsy after trim
      result.current.toggleLob('cosmetic');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.errors.email).toBeFalsy();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'No Email',
      phone: '0909000000',
      password: 'secret123',
      lob_scope: ['dental', 'cosmetic'],
    });
    expect(payload).not.toHaveProperty('email');
  });

  it('password must be min 6 chars; sets specific per-field error', async () => {
    const { result } = renderUseCtvCreationForm();
    act(() => {
      result.current.setName('Test User');
      result.current.setPhone('0909000000');
      result.current.setPassword('12345'); // 5 chars
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.errors.password).toBe('Mật khẩu phải có ít nhất 6 ký tự.');
    expect(result.current.errors.form).toBeTruthy();
  });

  it('successful submit: calls onSubmit with trimmed clean payload, sets isSubmitting then success', async () => {
    const { result, onSubmit } = renderUseCtvCreationForm();
    act(() => {
      result.current.setName('  Thuan Le  ');
      result.current.setPhone('  0909123456  ');
      result.current.setEmail('thuan@ex.com');
      result.current.setPassword('abcdef');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Thuan Le',
      phone: '0909123456',
      email: 'thuan@ex.com',
      password: 'abcdef',
      lob_scope: ['dental'],
    });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.canSubmit).toBe(false); // after success or because values ok but state
  });

  it('onSubmit rejection sets form error (not success)', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('API down'));
    const { result } = renderUseCtvCreationForm({ onSubmit: failing });
    act(() => {
      result.current.setName('Test');
      result.current.setPhone('0909');
      result.current.setPassword('123456');
    });
    await act(async () => {
      await result.current.handleSubmit();
    });
    expect(result.current.success).toBe(false);
    expect(result.current.errors.form).toBeTruthy();
  });

  it('reset clears everything back to pristine (dental only, empty, no success/errors)', async () => {
    const { result } = renderUseCtvCreationForm();
    act(() => {
      result.current.setName('Foo');
      result.current.toggleLob('cosmetic');
    });
    await act(async () => {
      await result.current.handleSubmit(); // may fail validation but sets state
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.values.name).toBe('');
    expect(result.current.values.lob_scope).toEqual(['dental']);
    expect(result.current.success).toBe(false);
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it('clearSuccess only clears success flag (leaves values)', () => {
    const { result } = renderUseCtvCreationForm();
    act(() => {
      result.current.setName('Keep Me');
    });
    // simulate success
    // (internal only via submit, but we can call if exposed; here reset path not, use direct for test of fn)
    act(() => {
      // @ts-expect-error test reach
      result.current.clearSuccess();
    });
    expect(result.current.values.name).toBe('Keep Me');
  });

  it('config public-join still manages lobs internally (default dental) even if caller ignores in wrapper', () => {
    const { result } = renderUseCtvCreationForm({ config: makeConfig('public-join') });
    expect(result.current.values.lob_scope).toEqual(['dental']);
    act(() => result.current.toggleLob('cosmetic'));
    expect(result.current.values.lob_scope).toEqual(['dental', 'cosmetic']);
  });
});
