import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HealthCheckupGallery } from './HealthCheckupGallery';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/api', () => ({
  createExternalPatient: vi.fn(),
}));

describe('HealthCheckupGallery permissions', () => {
  it('hides upload actions for view-only Hồ sơ online access', () => {
    render(
      <HealthCheckupGallery
        data={{
          patientCode: '6397T8250',
          patientName: 'Customer',
          patientExists: true,
          source: 'hosoonline',
          checkups: [],
        }}
        customerCode="T8250"
        canUploadCheckups={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'addCheckup' })).not.toBeInTheDocument();
  });

  it('hides patient creation for users without external patient create permission', () => {
    render(
      <HealthCheckupGallery
        data={{
          patientCode: 'T8250',
          patientName: 'Customer',
          patientExists: false,
          source: 'hosoonline',
          checkups: [],
        }}
        customerCode="T8250"
        canCreateExternalPatient={false}
        canUploadCheckups={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'createExternalPatient' })).not.toBeInTheDocument();
  });

  it('shows upload actions when upload permission is granted', () => {
    render(
      <HealthCheckupGallery
        data={{
          patientCode: '6397T8250',
          patientName: 'Customer',
          patientExists: true,
          source: 'hosoonline',
          checkups: [],
        }}
        customerCode="T8250"
        canUploadCheckups
      />,
    );

    expect(screen.getByRole('button', { name: 'addCheckup' })).toBeInTheDocument();
  });
});
