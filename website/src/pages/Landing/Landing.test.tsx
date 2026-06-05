import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Landing } from './Landing';

function renderLanding(initialEntry = '/welcome') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Landing />
    </MemoryRouter>,
  );
}

describe('Landing', () => {
  it('renders the Tâm Group logo', () => {
    renderLanding();
    expect(screen.getByAltText('Tâm Group')).toBeInTheDocument();
  });

  it('renders the booking button and public CTV/signup relative CTA links', () => {
    renderLanding();

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
    renderLanding();
    expect(document.title).toBe('Tâm — Thẩm Mỹ Viện');
  });
});
