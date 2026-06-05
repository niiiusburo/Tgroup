import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Landing } from './Landing';

describe('Landing', () => {
  it('renders the Tâm Group logo', () => {
    render(<Landing />);
    expect(screen.getByAltText('Tâm Group')).toBeInTheDocument();
  });

  it('renders the booking button and public CTV/signup relative CTA links', () => {
    render(<Landing />);

    expect(
      screen.getByRole('button', { name: /Đặt Lịch Cho Khách/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Đăng Ký CTV/ }),
    ).toHaveAttribute('href', '/ctv/join');
    expect(
      screen.getByRole('link', { name: /Đăng Nhập/ }),
    ).toHaveAttribute('href', '/ctv');
  });

  it('sets the document title while mounted', () => {
    render(<Landing />);
    expect(document.title).toBe('Tâm — Thẩm Mỹ Viện');
  });
});
