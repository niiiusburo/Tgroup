import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';

/**
 * Breadcrumbs derive their trail from NAVIGATION_ITEMS (the same source the sidebar
 * uses) and resolve labels via the real `nav` locale JSON (mocked react-i18next in
 * src/test/setup.ts returns actual EN strings). These tests lock the trail SHAPE for
 * each route class, not exact styling.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumbs />
    </MemoryRouter>
  );
}

describe('Breadcrumbs', () => {
  it('renders no trail on the root/overview page', () => {
    const { container } = renderAt('/');
    expect(container).toBeEmptyDOMElement();
  });
  it('renders Home > Calendar for a top-level route', () => {
    renderAt('/calendar');
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const items = nav.querySelectorAll('li');
    expect(items).toHaveLength(2); // Home, Calendar
    expect(nav).toHaveTextContent(/Lịch/); // nav.calendar (VI, per mocked locale)
    // The leaf is marked as the current page and is not a link.
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent(/Lịch/);
  });

  it('renders Home > Team > Commission for a sidebar group child', () => {
    renderAt('/commission');
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const items = nav.querySelectorAll('li');
    expect(items).toHaveLength(3); // Home, Team (group), Commission
    expect(nav).toHaveTextContent(/Hoa hồng/); // nav.commission (VI)
    // The "Team" group container is NOT a real route, so it must not be a link.
    const links = nav.querySelectorAll('a');
    // Only "Home" should be a link (Team is an unlinked group container; Commission is the leaf).
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/');
  });

  it('renders Home > Reports > Revenue with Reports linked (real nested route)', () => {
    renderAt('/reports/revenue');
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const items = nav.querySelectorAll('li');
    expect(items).toHaveLength(3); // Home, Reports, Revenue
    const links = nav.querySelectorAll('a');
    // Home AND Reports are real routes -> both linked; Revenue is the leaf.
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/reports');
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent(/Doanh thu/); // nav.revenue (VI)
  });

  it('folds a dynamic detail route (/customers/:id) to its parent (Home > Customers)', () => {
    renderAt('/customers/123e4567-e89b-12d3-a456-426614174000');
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const items = nav.querySelectorAll('li');
    expect(items).toHaveLength(2); // Home, Customers
    expect(nav).toHaveTextContent(/Khách hàng/); // nav.customers (VI)
  });

  it('renders nothing for an unknown route (no dead crumbs)', () => {
    const { container } = renderAt('/this-route-does-not-exist');
    expect(container).toBeEmptyDOMElement();
  });
});
