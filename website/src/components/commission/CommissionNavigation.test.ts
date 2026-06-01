import { describe, expect, it } from 'vitest';
import { buildCommissionPath, buildCustomerProfilePath, isCommissionTab } from './CommissionNavigation';

describe('CommissionNavigation', () => {
  it('builds query-backed commission tab paths', () => {
    expect(buildCommissionPath('newClients', 'cosmetic')).toBe('/commission?tab=newClients&lob=cosmetic');
    expect(isCommissionTab('earnings')).toBe(true);
    expect(isCommissionTab('bad-tab')).toBe(false);
  });

  it('builds customer profile and service drilldown paths', () => {
    expect(buildCustomerProfilePath({
      clientId: 'client-1',
      tab: 'records',
      serviceLineId: 'line-1',
      returnTab: 'earnings',
      lob: 'cosmetic',
    })).toBe('/customers/client-1?tab=records&from=commission&serviceLineId=line-1&returnTab=earnings&lob=cosmetic');
  });
});
