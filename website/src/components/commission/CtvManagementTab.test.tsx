import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CtvManagementTab } from './CtvManagementTab';
import { fetchCtvs, updateCtv } from '@/lib/api/ctv';

vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'dental' }),
}));

vi.mock('@/lib/api/ctv', () => ({
  fetchCtvs: vi.fn(),
  updateCtv: vi.fn(async () => ({ id: 'ctv-1', name: 'No Phone CTV' })),
  setCtvActive: vi.fn(),
  createCtv: vi.fn(),
}));

const mockFetchCtvs = vi.mocked(fetchCtvs);
const mockUpdateCtv = vi.mocked(updateCtv);

// A CTV that has NO phone on record (real case: "CTV Demo Referrer"). Before the
// FE-1 fix, its Edit modal seeded phone='' and sent it, so the API empty-phone
// guard made the row impossible to edit at all.
const phonelessCtv = {
  id: 'ctv-1',
  name: 'No Phone CTV',
  phone: null,
  email: 'haskemail@x.vn',
  lob_scope: ['dental'],
  active: true,
  source: 'tmv',
};

describe('CtvManagementTab → EditCtvModal payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchCtvs.mockResolvedValue({ ctvs: [phonelessCtv] as any });
  });

  it('lets an admin edit a phone-less CTV: Save stays enabled and the empty phone is omitted from the payload', async () => {
    const user = userEvent.setup();
    render(<CtvManagementTab />);

    await waitFor(() => expect(mockFetchCtvs).toHaveBeenCalled());

    // Open the edit modal (i18n resolves 'ctv.edit' to 'Sửa' in Vietnamese).
    await user.click(await screen.findByRole('button', { name: 'Sửa' }));

    // Save button (common ns 'save' = 'Lưu' in Vietnamese) must be ENABLED even though phone is blank —
    // only name is required now.
    const saveBtn = await screen.findByRole('button', { name: 'Lưu' });
    expect(saveBtn).toBeEnabled();

    await user.click(saveBtn);

    await waitFor(() => expect(mockUpdateCtv).toHaveBeenCalledTimes(1));
    const [id, payload, lob] = mockUpdateCtv.mock.calls[0];
    expect(id).toBe('ctv-1');
    expect(lob).toBe('dental');
    // The crucial assertion: no empty phone is sent (it would 400 at the API).
    expect(payload).toEqual({ name: 'No Phone CTV', email: 'haskemail@x.vn' });
    expect(payload).not.toHaveProperty('phone');
    expect(payload).not.toHaveProperty('password');
  });

  it('includes a newly typed password but still omits the untouched empty phone', async () => {
    const user = userEvent.setup();
    render(<CtvManagementTab />);
    await waitFor(() => expect(mockFetchCtvs).toHaveBeenCalled());

    await user.click(await screen.findByRole('button', { name: 'Sửa' }));

    const dialog = screen.getByRole('button', { name: 'Lưu' }).closest('div')!.parentElement!;
    const pwInput = within(dialog).getByPlaceholderText('Nhập mật khẩu');
    await user.type(pwInput, 'freshpass1');

    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => expect(mockUpdateCtv).toHaveBeenCalledTimes(1));
    const [, payload] = mockUpdateCtv.mock.calls[0];
    expect(payload).toMatchObject({ name: 'No Phone CTV', email: 'haskemail@x.vn', password: 'freshpass1' });
    expect(payload).not.toHaveProperty('phone');
  });
});
