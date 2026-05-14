/**
 * Permission-related type definitions
 * @crossref:used-in[usePermissions, useRelationshipsData, PermissionMatrix, EntityRelationshipMap]
 *
 * NOTE: Canonical permission strings are auto-generated from
 * product-map/contracts/permission-registry.yaml.
 * Import PermissionString from './generated/permissions' for compile-time safety.
 */

export type {
  PermissionString,
  PermissionCategory,
  ALL_PERMISSIONS,
  PERMISSION_CATEGORIES,
  PERMISSION_BY_CATEGORY,
} from './generated/permissions';

export interface Permission {
  readonly id: string;
  readonly module: string;
  readonly action: string;
  readonly description: string;
}

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly description: string;
  readonly permissions: readonly string[];
}

// Entity graph types are in constants/entityGraph.ts
export type { EntityNode, EntityRelation } from '@/constants/entityGraph';
