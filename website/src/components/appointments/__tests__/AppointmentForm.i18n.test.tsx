import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppointmentForm } from '../AppointmentForm';
import '@/i18n';
import { BrowserRouter } from 'react-router-dom';
import { LocationProvider } from '@/contexts/LocationContext';

describe('AppointmentForm i18n', () => {
  it('renders translated labels instead of raw keys', () => {
    render(
      <BrowserRouter>
        <LocationProvider>
          <AppointmentForm onSubmit={() => {}} onClose={() => {}} />
        </LocationProvider>
      </BrowserRouter>
    );

    // Wait for i18n to load
    expect(document.body.textContent).not.toMatch(/customer\.type\.new/);
    expect(document.body.textContent).not.toMatch(/label\.cardColor/);
    expect(document.body.textContent).not.toMatch(/label\.reminder/);
    expect(document.body.textContent).not.toMatch(/common\.minutes/);
    expect(document.body.textContent).not.toMatch(/reminder\.15/);
  });
});
