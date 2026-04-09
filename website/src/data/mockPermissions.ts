/**
 * Permissions types re-exported from /types/ and constants/
 * @crossref:used-in[usePermissions, useRelationshipsData, PermissionMatrix]
 */

import type { Permission, Role } from '@/types/permissions';
import { ENTITY_NODES, ENTITY_RELATIONS } from '@/constants/entityGraph';

export type { Permission, Role };
export { ENTITY_NODES, ENTITY_RELATIONS };
