/**
 * Permission-related type definitions
 * @crossref:used-in[usePermissions, useRelationshipsData, PermissionMatrix, EntityRelationshipMap]
 */

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
