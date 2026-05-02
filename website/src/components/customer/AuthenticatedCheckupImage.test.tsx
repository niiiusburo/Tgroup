import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthenticatedCheckupImage } from './AuthenticatedCheckupImage';

describe('AuthenticatedCheckupImage', () => {
  const fetchMock = vi.fn();
  const createObjectUrlMock = vi.fn();
  const revokeObjectUrlMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
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
});
