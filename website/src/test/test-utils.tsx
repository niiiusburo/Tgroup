import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { LocationProvider } from '@/contexts/LocationContext';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <TimezoneProvider>
        <LocationProvider>
          {ui}
        </LocationProvider>
      </TimezoneProvider>
    </BrowserRouter>
  );
}
