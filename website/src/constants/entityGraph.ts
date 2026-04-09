/**
 * Entity relationship graph - system architecture visualization
 * These are static constants describing the system structure, not user data.
 * @crossref:used-in[EntityRelationshipMap]
 */

export interface EntityNode {
  readonly id: string;
  readonly name: string;
  readonly type: 'core' | 'support' | 'external';
  readonly icon: string;
  readonly color: string;
}

export interface EntityRelation {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly type: 'one-to-many' | 'many-to-many' | 'one-to-one';
}

export const ENTITY_NODES: readonly EntityNode[] = [
  { id: 'customers', name: 'Customers', type: 'core', icon: 'Users', color: '#0EA5E9' },
  { id: 'appointments', name: 'Appointments', type: 'core', icon: 'CalendarCheck', color: '#8B5CF6' },
  { id: 'employees', name: 'Employees', type: 'core', icon: 'UserCog', color: '#10B981' },
  { id: 'services', name: 'Services', type: 'core', icon: 'Stethoscope', color: '#F97316' },
  { id: 'payments', name: 'Payments', type: 'support', icon: 'CreditCard', color: '#EF4444' },
  { id: 'locations', name: 'Locations', type: 'support', icon: 'MapPin', color: '#F59E0B' },
  { id: 'commission', name: 'Commission', type: 'support', icon: 'Percent', color: '#EC4899' },
  { id: 'reports', name: 'Reports', type: 'external', icon: 'BarChart3', color: '#6366F1' },
  { id: 'notifications', name: 'Notifications', type: 'external', icon: 'Bell', color: '#14B8A6' },
] as const;

export const ENTITY_RELATIONS: readonly EntityRelation[] = [
  { from: 'customers', to: 'appointments', label: 'books', type: 'one-to-many' },
  { from: 'employees', to: 'appointments', label: 'assigned to', type: 'one-to-many' },
  { from: 'appointments', to: 'services', label: 'includes', type: 'many-to-many' },
  { from: 'appointments', to: 'payments', label: 'generates', type: 'one-to-one' },
  { from: 'employees', to: 'locations', label: 'works at', type: 'many-to-many' },
  { from: 'employees', to: 'commission', label: 'earns', type: 'one-to-many' },
  { from: 'payments', to: 'commission', label: 'triggers', type: 'one-to-many' },
  { from: 'customers', to: 'notifications', label: 'receives', type: 'one-to-many' },
  { from: 'payments', to: 'notifications', label: 'triggers', type: 'one-to-many' },
  { from: 'appointments', to: 'reports', label: 'feeds into', type: 'many-to-many' },
  { from: 'payments', to: 'reports', label: 'feeds into', type: 'many-to-many' },
  { from: 'services', to: 'locations', label: 'available at', type: 'many-to-many' },
] as const;
