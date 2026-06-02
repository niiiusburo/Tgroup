import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CtvLinkBar, ctvLinkBarFraction } from '@/components/shared/CtvLinkBar';

describe('ctvLinkBarFraction', () => {
  const now = new Date('2026-06-02T00:00:00Z').getTime();
  it('returns ~1 just after anchor', () => {
    const f = ctvLinkBarFraction(new Date('2026-06-01'), new Date('2026-12-01'), now);
    expect(f).toBeGreaterThan(0.9);
  });
  it('returns 0 when expired', () => {
    const f = ctvLinkBarFraction(new Date('2025-06-01'), new Date('2025-12-01'), now);
    expect(f).toBe(0);
  });
  it('clamps to [0,1]', () => {
    const f = ctvLinkBarFraction(new Date('2026-06-03'), new Date('2026-12-03'), now);
    expect(f).toBeLessThanOrEqual(1);
    expect(f).toBeGreaterThanOrEqual(0);
  });
});

describe('CtvLinkBar', () => {
  it('renders the CTV name and a remaining-time label when active', () => {
    render(
      <CtvLinkBar
        ctvName="Lan"
        anchorAt={'2026-04-01'}
        expiresAt={'2026-10-01'}
        active={true}
        eligible={false}
      />
    );
    expect(screen.getByText(/Lan/)).toBeInTheDocument();
    expect(screen.getByTestId('ctv-link-bar')).toBeInTheDocument();
  });

  it('shows the eligible message when expired', () => {
    render(
      <CtvLinkBar
        ctvName="Lan"
        anchorAt={'2025-01-01'}
        expiresAt={'2025-07-01'}
        active={false}
        eligible={true}
      />
    );
    expect(screen.getByTestId('ctv-link-bar-expired')).toBeInTheDocument();
  });

  it('renders nothing when there is no CTV', () => {
    const { container } = render(
      <CtvLinkBar ctvName={null} anchorAt={null} expiresAt={null} active={false} eligible={true} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
