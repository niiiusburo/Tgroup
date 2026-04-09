/**
 * Location types re-exported from /types/
 * @crossref:used-in[Locations, LocationCard, LocationDetail]
 */

import type { LocationBranch, LocationStatus, LocationMetrics } from '@/types/location';
import { STATUS_LABELS, STATUS_STYLES } from '@/constants/statusStyles';

export type { LocationBranch, LocationStatus, LocationMetrics };
export { STATUS_LABELS, STATUS_STYLES };

export const MOCK_LOCATIONS: readonly LocationBranch[] = [];
export const MOCK_LOCATION_BRANCHES: readonly LocationBranch[] = [];
export const MOCK_LOCATION_METRICS: readonly LocationMetrics[] = [];
