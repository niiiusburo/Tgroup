import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TimezoneProvider } from '@/contexts/TimezoneContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { BusinessUnitProvider } from '@/contexts/BusinessUnitContext';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <BusinessUnitProvider>
        <TimezoneProvider>
          <LocationProvider>
            {ui}
          </LocationProvider>
        </TimezoneProvider>
      </BusinessUnitProvider>
    </BrowserRouter>
  );
}
