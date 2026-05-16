import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthenticatedCheckupImage } from './AuthenticatedCheckupImage';

describe('AuthenticatedCheckupImage', () => {
  const fetchMock = vi.fn();
  const createObjectUrlMock = vi.fn();
  const revokeObjectUrlMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('tgclinic_token', 'tg-token');
    fetchMock.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['image-bytes'], { type: 'image/jpeg' })),
    });
    createObjectUrlMock.mockReturnValue('blob:checkup-image');

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('fetches protected checkup images with the TGClinic token and renders a blob URL', async () => {
    render(
      <AuthenticatedCheckupImage
        src="/api/ExternalCheckups/images/2026-04-18-15-17-06_6397T8250_IMG_6734.jpeg"
        alt="Checkup image"
        className="w-24 h-24"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Checkup image' })).toHaveAttribute('src', 'blob:checkup-image');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3002/api/ExternalCheckups/images/2026-04-18-15-17-06_6397T8250_IMG_6734.jpeg',
      expect.objectContaining({
        headers: { Authorization: 'Bearer tg-token' },
        credentials: 'include',
      })
    );
  });

  it('uses the session token for protected checkup images when remember-me is off', async () => {
    localStorage.removeItem('tgclinic_token');
    sessionStorage.setItem('tgclinic_token', 'session-token');

    render(
      <AuthenticatedCheckupImage
        src="/api/ExternalCheckups/images/2026-04-20-17-55-55_1880T056733_image.jpg"
        alt="Checkup image"
        className="w-24 h-24"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Checkup image' })).toHaveAttribute('src', 'blob:checkup-image');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3002/api/ExternalCheckups/images/2026-04-20-17-55-55_1880T056733_image.jpg',
      expect.objectContaining({
        headers: { Authorization: 'Bearer session-token' },
        credentials: 'include',
      })
    );
  });
});
