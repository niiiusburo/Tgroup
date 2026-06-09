import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/i18n';
import { CtvCreationForm, type CtvCreationFormProps } from './CtvCreationForm';
import type { UseCtvCreationFormResult, CtvCreationFormValues, CtvCreationErrors } from './types';

function makeMockHook(overrides: Partial<UseCtvCreationFormResult> = {}): UseCtvCreationFormResult {
  const values: CtvCreationFormValues = {
    name: '',
    phone: '',
    email: '',
    password: '',
    lob_scope: ['dental'],
    ...overrides.values,
  };
  const errors: CtvCreationErrors = overrides.errors ?? {};
  const isSubmitting = overrides.isSubmitting ?? false;
  const success = overrides.success ?? false;
  const canSubmit = overrides.canSubmit ?? (Object.keys(errors).length === 0 && !!values.name && !!values.phone && (values.password || '').length >= 6);

  return {
    values,
    errors,
    isSubmitting,
    success,
    canSubmit,
    setName: vi.fn(),
    setPhone: vi.fn(),
    setEmail: vi.fn(),
    setPassword: vi.fn(),
    toggleLob: vi.fn(),
    handleSubmit: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
    clearSuccess: vi.fn(),
    ...overrides,
  };
}

function renderForm(props: Partial<CtvCreationFormProps> = {}) {
  const hookResult = props.hookResult ?? makeMockHook();
  const utils = render(
    <CtvCreationForm hookResult={hookResult} {...props} />
  );
  return { ...utils, hookResult };
}

describe('CtvCreationForm (presentational, uses hookResult only)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
    vi.clearAllMocks();
  });

  it('renders core fields with values from hook and default labels', () => {
    const hook = makeMockHook({
      values: { name: 'Nguyễn Văn A', phone: '0909123456', email: 'a@b.com', password: 'secret123', lob_scope: ['dental'] },
    });
    renderForm({ hookResult: hook });

    expect(screen.getByDisplayValue('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0909123456')).toBeInTheDocument();
    expect(screen.getByDisplayValue('a@b.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('secret123')).toBeInTheDocument();

    // default labels (Vietnamese as fallback)
    expect(screen.getByText('Họ tên')).toBeInTheDocument();
    expect(screen.getByText('Số điện thoại')).toBeInTheDocument();
    expect(screen.getByText(/Lĩnh vực hoạt động/)).toBeInTheDocument();
  });

  it('applies border-red-500 on input when that field has error (per spec)', () => {
    const hook = makeMockHook({
      values: { name: 'A', phone: '09', email: '', password: '12345', lob_scope: ['dental'] },
      errors: { name: 'Vui lòng nhập họ tên.', email: 'Vui lòng nhập email.', password: 'Mật khẩu phải có ít nhất 6 ký tự.' },
    });
    renderForm({ hookResult: hook });

    const nameInput = screen.getByDisplayValue('A');
    const emailInput = screen.getByPlaceholderText('Email'); // or role
    const pwInput = screen.getByDisplayValue('12345');

    expect(nameInput.className).toContain('border-red-500');
    expect(emailInput.className).toContain('border-red-500');
    expect(pwInput.className).toContain('border-red-500');

    // error messages rendered
    expect(screen.getByText('Vui lòng nhập họ tên.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập email.')).toBeInTheDocument();
  });

  it('calls the corresponding setter on input change (prop-driven, no local state)', () => {
    const hook = makeMockHook();
    renderForm({ hookResult: hook });

    fireEvent.change(screen.getByPlaceholderText('Họ tên'), { target: { value: 'Test User' } });
    expect(hook.setName).toHaveBeenCalledWith('Test User');

    fireEvent.change(screen.getByPlaceholderText('Số điện thoại'), { target: { value: '0912345678' } });
    expect(hook.setPhone).toHaveBeenCalledWith('0912345678');
  });

  it('toggles LOB via checkbox (dental disabled); calls toggleLob', () => {
    const hook = makeMockHook({
      values: { name: 'X', phone: '09', email: '', password: '123456', lob_scope: ['dental', 'cosmetic'] },
    });
    renderForm({ hookResult: hook });

    const dentalCb = screen.getByRole('checkbox', { name: 'Nha khoa' });
    const cosmeticCb = screen.getByRole('checkbox', { name: 'Thẩm mỹ' });

    expect(dentalCb).toBeDisabled();
    expect(cosmeticCb).not.toBeDisabled();
    expect(cosmeticCb).toBeChecked();

    fireEvent.click(cosmeticCb);
    expect(hook.toggleLob).toHaveBeenCalledWith('cosmetic');
  });

  it('submits by calling hook.handleSubmit (preventDefault handled in form)', async () => {
    const hook = makeMockHook({ canSubmit: true });
    renderForm({ hookResult: hook });

    const submitBtn = screen.getByRole('button', { name: /tạo tài khoản ctv/i });
    fireEvent.click(submitBtn);

    expect(hook.handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables submit when !canSubmit or isSubmitting', () => {
    const hook = makeMockHook({ canSubmit: false, isSubmitting: false });
    const { rerender } = renderForm({ hookResult: hook });
    const submitBtn = screen.getByRole('button', { name: /tạo/i });
    expect(submitBtn).toBeDisabled();

    rerender(<CtvCreationForm hookResult={makeMockHook({ canSubmit: true, isSubmitting: true })} />);
    expect(screen.getByRole('button', { name: /đang tạo/i })).toBeDisabled();
  });

  it('renders beforeLobs, children, afterSubmit slots', () => {
    renderForm({
      beforeLobs: <div data-testid="before-lobs">UPLINE SLOT</div>,
      children: <div data-testid="kids">EXTRA FIELD</div>,
      afterSubmit: <div data-testid="after">AFTER</div>,
    });

    expect(screen.getByTestId('before-lobs')).toHaveTextContent('UPLINE SLOT');
    expect(screen.getByTestId('kids')).toHaveTextContent('EXTRA FIELD');
    expect(screen.getByTestId('after')).toHaveTextContent('AFTER');
  });

  it('renders cancel button + calls onCancel when provided; uses submitLabel', () => {
    const onCancel = vi.fn();
    renderForm({
      onCancel,
      submitLabel: 'Lưu CTV',
      labels: { cancel: 'Đóng' },
    });

    const cancel = screen.getByRole('button', { name: 'Đóng' });
    expect(cancel).toBeInTheDocument();
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalled();

    expect(screen.getByRole('button', { name: 'Lưu CTV' })).toBeInTheDocument();
  });

  it('shows general form error banner when errors.form present', () => {
    const hook = makeMockHook({ errors: { form: 'Vui lòng nhập họ tên, số điện thoại và mật khẩu.' } });
    renderForm({ hookResult: hook });
    expect(screen.getByText('Vui lòng nhập họ tên, số điện thoại và mật khẩu.')).toBeInTheDocument();
  });

  it('applies custom className to root form', () => {
    const { container } = renderForm({ className: 'my-custom-form' });
    const form = container.querySelector('form');
    expect(form?.className).toContain('my-custom-form');
  });
});
