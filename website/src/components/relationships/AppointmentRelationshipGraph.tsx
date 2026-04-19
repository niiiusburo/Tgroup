/**
 * Entity Relationship Tracker — Appointment Module
 *
 * Visual component showing how appointments connect to:
 *   - Customers (partners)
 *   - Doctors / Staff (partners)
 *   - Services (products)
 *   - Locations (companies)
 *   - Payments
 *   - Medical Records (dotkhams)
 *   - Sale Orders
 *
 * This is a READ-ONLY diagnostic view. It helps developers and admins
 * understand the blast radius of changing an appointment.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Network,
  User,
  Stethoscope,
  MapPin,
  CreditCard,
  FileText,
  ShoppingCart,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface EntityNode {
  readonly id: string;
  readonly type: 'appointment' | 'customer' | 'doctor' | 'service' | 'location' | 'payment' | 'record' | 'order';
  readonly label: string;
  readonly status?: string;
  readonly detail?: string;
}

interface EntityEdge {
  readonly from: string;
  readonly to: string;
  readonly label: string;
  readonly type: 'strong' | 'weak' | 'derived';
}

interface RelationshipGraphProps {
  readonly appointmentId?: string;
  readonly customerId?: string;
  readonly doctorId?: string;
  readonly serviceId?: string;
  readonly locationId?: string;
}

// ─── Static relationship schema (source of truth) ─────────────────

const ENTITY_META: Record<EntityNode['type'], { icon: React.ReactNode; color: string; bg: string }> = {
  appointment: { icon: <ClipboardList className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  customer:    { icon: <User className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  doctor:      { icon: <Stethoscope className="w-4 h-4" />, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  service:     { icon: <ShoppingCart className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  location:    { icon: <MapPin className="w-4 h-4" />, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
  payment:     { icon: <CreditCard className="w-4 h-4" />, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  record:      { icon: <FileText className="w-4 h-4" />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  order:       { icon: <ShoppingCart className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
};

/**
 * The canonical relationship schema for appointments.
 * If the database FKs change, update this map.
 */
const APPOINTMENT_RELATIONSHIP_SCHEMA: readonly { readonly from: EntityNode['type']; readonly to: EntityNode['type']; readonly label: string; readonly type: EntityEdge['type'] }[] = [
  { from: 'appointment', to: 'customer',  label: 'partnerid → partners.id',       type: 'strong' },
  { from: 'appointment', to: 'doctor',    label: 'doctorid → partners.id',        type: 'strong' },
  { from: 'appointment', to: 'service',   label: 'productid → products.id',       type: 'weak' },
  { from: 'appointment', to: 'location',  label: 'companyid → companies.id',      type: 'strong' },
  { from: 'customer',    to: 'payment',   label: 'partnerid → payments.partnerid', type: 'derived' },
  { from: 'customer',    to: 'record',    label: 'partnerid → dotkhams.partnerid', type: 'derived' },
  { from: 'customer',    to: 'order',     label: 'partner_id → saleorders.partner_id', type: 'derived' },
  { from: 'appointment', to: 'record',    label: 'dotkhamid → dotkhams.id',       type: 'weak' },
  { from: 'appointment', to: 'order',     label: 'saleorderid → saleorders.id',   type: 'weak' },
] as const;

// ─── Component ────────────────────────────────────────────────────

export function AppointmentRelationshipGraph({
  appointmentId,
  customerId,
  doctorId,
  serviceId,
  locationId,
}: RelationshipGraphProps) {
  const { t } = useTranslation();

  const nodes = useMemo<EntityNode[]>(() => {
    const list: EntityNode[] = [
      { id: 'appt', type: 'appointment', label: 'Appointment', detail: appointmentId ? `ID: ${appointmentId.slice(0, 8)}...` : 'Any appointment' },
      { id: 'cust', type: 'customer', label: 'Customer', detail: customerId ? `ID: ${customerId.slice(0, 8)}...` : 'Linked patient' },
      { id: 'doc', type: 'doctor', label: 'Doctor', detail: doctorId ? `ID: ${doctorId.slice(0, 8)}...` : 'Assigned doctor' },
      { id: 'svc', type: 'service', label: 'Service', detail: serviceId ? `ID: ${serviceId.slice(0, 8)}...` : 'Booked service' },
      { id: 'loc', type: 'location', label: 'Location', detail: locationId ? `ID: ${locationId.slice(0, 8)}...` : 'Clinic branch' },
      { id: 'pay', type: 'payment', label: 'Payments', detail: 'All customer payments' },
      { id: 'rec', type: 'record', label: 'Medical Records', detail: 'dotkhams linked to customer' },
      { id: 'ord', type: 'order', label: 'Sale Orders', detail: 'Treatment plans' },
    ];
    return list;
  }, [appointmentId, customerId, doctorId, serviceId, locationId]);

  const edges = useMemo(() => APPOINTMENT_RELATIONSHIP_SCHEMA, []);

  const activeNodeIds = useMemo(() => {
    const ids = new Set<string>(['appt']);
    if (customerId) ids.add('cust');
    if (doctorId) ids.add('doc');
    if (serviceId) ids.add('svc');
    if (locationId) ids.add('loc');
    // Payments, records, orders are always shown as derived
    ids.add('pay');
    ids.add('rec');
    ids.add('ord');
    return ids;
  }, [customerId, doctorId, serviceId, locationId]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
          <Network className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">{ t('relationships:appointmentGraphTitle') || 'Appointment Relationship Map' }</h3>
          <p className="text-xs text-gray-500">
            { t('relationships:appointmentGraphSubtitle') || 'Visualizing how appointments connect to the rest of the system' }
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500" /> Strong FK</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-400 border-b border-dashed" /> Weak FK</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400" /> Derived</span>
      </div>

      {/* Nodes grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {nodes.map((node) => {
          const meta = ENTITY_META[node.type];
          const isActive = activeNodeIds.has(node.id);
          return (
            <div
              key={node.id}
              className={`relative p-3 rounded-xl border transition-all ${
                isActive
                  ? `${meta.bg} ${meta.color} shadow-sm`
                  : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {meta.icon}
                <span className="text-xs font-semibold">{node.label}</span>
              </div>
              <div className="text-[10px] opacity-70 truncate">{node.detail}</div>
            </div>
          );
        })}
      </div>

      {/* Edge list */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Database Links</h4>
        {edges.map((edge, idx) => {
          const fromNode = nodes.find((n) => n.type === edge.from);
          const toNode = nodes.find((n) => n.type === edge.to);
          if (!fromNode || !toNode) return null;

          const lineColor =
            edge.type === 'strong' ? 'bg-blue-500' :
            edge.type === 'weak' ? 'bg-gray-400' : 'bg-orange-400';
          const lineStyle = edge.type === 'weak' ? 'border-b border-dashed' : '';

          return (
            <div key={idx} className="flex items-center gap-3 text-xs">
              <span className="w-20 text-right font-medium text-gray-700">{fromNode.label}</span>
              <div className={`flex-1 h-0.5 ${lineColor} ${lineStyle} relative`}>
                <ArrowRight className="absolute -right-2 -top-1.5 w-3 h-3 text-gray-400" />
              </div>
              <span className="w-20 font-medium text-gray-700">{toNode.label}</span>
              <span className="text-[10px] text-gray-400 font-mono">{edge.label}</span>
            </div>
          );
        })}
      </div>

      {/* Impact warnings */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Change Impact Warnings</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ImpactWarning
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            title="Delete Appointment"
            body="Does NOT cascade. Related dotkhams, payments, and saleorders remain."
          />
          <ImpactWarning
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            title="Change Customer"
            body="All linked payments, records, and orders still belong to the OLD customer."
          />
          <ImpactWarning
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            title="Change Doctor"
            body="Safe. Only affects this appointment. No cascade."
          />
          <ImpactWarning
            icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
            title="Change Service (productid)"
            body="May break service history linkage if saleorderlines reference the old product."
          />
        </div>
      </div>
    </div>
  );
}

function ImpactWarning({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
      {icon}
      <div>
        <div className="text-xs font-semibold text-gray-700">{title}</div>
        <div className="text-[11px] text-gray-500">{body}</div>
      </div>
    </div>
  );
}
