import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Landing } from './Landing';

describe('Landing', () => {
  it('renders the Tâm Group logo', () => {
    render(<Landing />);
    expect(screen.getByAltText('Tâm Group')).toBeInTheDocument();
  });

  it('renders the three CTAs with the original relative hrefs', () => {
    render(<Landing />);

    expect(
      screen.getByRole('link', { name: /Đặt Lịch Cho Khách/ }),
    ).toHaveAttribute('href', '/booking');
    expect(
      screen.getByRole('link', { name: /Đăng Ký CTV/ }),
    ).toHaveAttribute('href', '/ctv/signup');
    expect(
      screen.getByRole('link', { name: /Đăng Nhập/ }),
    ).toHaveAttribute('href', '/ctv/portal');
  });

  it('sets the document title while mounted', () => {
    render(<Landing />);
    expect(document.title).toBe('Tâm — Thẩm Mỹ Viện');
  });
});
