/**
 * Dashboard types re-exported from /types/
 * @crossref:used-in[Overview, hooks]
 */

import type { Notification, RevenueDataPoint, LocationOption } from '@/types/common';
import { QUICK_ACTIONS } from '@/types/common';

export type { Notification, RevenueDataPoint, LocationOption };
export { QUICK_ACTIONS };

export const MOCK_NOTIFICATIONS: readonly Notification[] = [];
export const MOCK_LOCATIONS: readonly LocationOption[] = [];
export const MOCK_REVENUE_DATA: readonly RevenueDataPoint[] = [];
