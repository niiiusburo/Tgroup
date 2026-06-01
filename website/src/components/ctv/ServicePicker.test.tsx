import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@/test/test-utils';
import { ServicePicker } from './ServicePicker';
import type { CtvServiceOption } from '@/lib/api/ctv';

const SERVICES: CtvServiceOption[] = [
  { id: 'a', name: 'Botox', price: 100, category: { id: 'c1', name: 'Injectables' } },
  { id: 'b', name: 'Filler môi', price: 200, category: { id: 'c1', name: 'Injectables' } },
  { id: 'c', name: 'IPL', price: 300, category: { id: 'c2', name: 'Laser & Light' } },
  { id: 'd', name: 'Tư vấn', price: null, category: null },
];

describe('ServicePicker', () => {
  it('opens to show collapsible category groups', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServicePicker services={SERVICES} value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /select a service|chọn dịch vụ/i }));

    // Group headers render; individual services stay collapsed until a group is opened.
    expect(screen.getByText('Injectables')).toBeInTheDocument();
    expect(screen.getByText('Laser & Light')).toBeInTheDocument();
    expect(screen.queryByText('Botox')).not.toBeInTheDocument();
  });

  it('expands a group inline and selects a service', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<ServicePicker services={SERVICES} value="" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /select a service|chọn dịch vụ/i }));
    await user.click(screen.getByText('Injectables'));

    // Now the group's services are visible.
    expect(screen.getByText('Botox')).toBeInTheDocument();
    expect(screen.getByText('Filler môi')).toBeInTheDocument();

    await user.click(screen.getByText('Botox'));
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('searches across groups, auto-expanding matches and hiding non-matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServicePicker services={SERVICES} value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /select a service|chọn dịch vụ/i }));
    await user.type(screen.getByRole('textbox'), 'ipl');

    expect(screen.getByText('Laser & Light')).toBeInTheDocument();
    expect(screen.getByText('IPL')).toBeInTheDocument(); // auto-expanded
    expect(screen.queryByText('Injectables')).not.toBeInTheDocument(); // no match → hidden
  });

  it('search is diacritic-insensitive', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServicePicker services={SERVICES} value="" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /select a service|chọn dịch vụ/i }));
    await user.type(screen.getByRole('textbox'), 'tu van'); // matches "Tư vấn"

    expect(screen.getByText('Tư vấn')).toBeInTheDocument();
  });

  it('clears the selection via the optional "no service" row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(<ServicePicker services={SERVICES} value="a" onChange={onChange} />);

    // Trigger shows the selected service name.
    expect(screen.getByRole('button', { name: /Botox/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Botox/ }));

    const list = screen.getByRole('listbox');
    await user.click(within(list).getByText(/no service|không chọn dịch vụ/i));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
