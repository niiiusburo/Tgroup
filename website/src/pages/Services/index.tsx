// @crossref:global-filter[FilterByLocation] — synced via LocationContext across: Overview, Customers, Calendar, Appointments, Employees, Services, Payment
/**
 * Services Management Page
 * @crossref:route[/services]
 * @crossref:used-in[App]
 * @crossref:uses[ServiceForm, ServiceHistoryList, MultiVisitTracker, useLocationFilter]
 */

import { useState } from 'react';
import {
  Stethoscope, Plus, Search, Filter,
  Activity, CheckCircle2, Clock, DollarSign,
} from 'lucide-react';
import { ServiceForm } from '@/components/services/ServiceForm';
import { ServiceHistoryList } from '@/components/services/ServiceHistoryList';
import { useLocationFilter } from '@/contexts/LocationContext';
import { useServices, type ServiceFilter, type CategoryFilter, type CreateServiceInput } from '@/hooks/useServices';
import type { ServiceRecord } from '@/data/mockServices';
import { APPOINTMENT_TYPE_LABELS, type AppointmentType } from '@/constants';

const STATUS_TABS: { label: string; value: ServiceFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Planned', value: 'planned' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const CATEGORY_OPTIONS: { label: string; value: CategoryFilter }[] = [
  { label: 'All Categories', value: 'all' },
  ...Object.entries(APPOINTMENT_TYPE_LABELS).map(([key, label]) => ({
    label,
    value: key as AppointmentType,
  })),
];

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}

export function Services() {
  const { selectedLocationId } = useLocationFilter();
  const {
    records,
    stats,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    createServiceRecord,
    updateVisitStatus,
    cancelServiceRecord,
  } = useServices(selectedLocationId);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);

  async function handleCreate(data: CreateServiceInput) {
    await createServiceRecord(data);
    setShowForm(false);
  }

  function handleEdit(record: ServiceRecord) {
    setEditingRecord(record);
    setIsEditMode(true);
    setShowForm(true);
  }

  function handleUpdate(_data: CreateServiceInput) {
    // For now, update is local only - no API endpoint for this
    // In a real app, you'd call an updateServiceRecord API
    setShowForm(false);
    setIsEditMode(false);
    setEditingRecord(null);
  }

  function handleCloseForm() {
    setShowForm(false);
    setIsEditMode(false);
    setEditingRecord(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Services</h1>
            <p className="text-sm text-gray-500">Manage service records and multi-visit treatments</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsEditMode(false);
            setEditingRecord(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Activity className="w-5 h-5 text-blue-600" />} label="Active" value={stats.active} bg="bg-blue-50" />
        <StatCard icon={<Clock className="w-5 h-5 text-gray-600" />} label="Planned" value={stats.planned} bg="bg-gray-50" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label="Completed" value={stats.completed} bg="bg-green-50" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-amber-600" />} label="Outstanding" value={formatVND(stats.outstanding)} bg="bg-amber-50" isText />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, service, doctor..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border whitespace-nowrap transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-white border-primary'
                : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Service records list */}
      <ServiceHistoryList
        records={records}
        onUpdateVisit={updateVisitStatus}
        onCancel={cancelServiceRecord}
        onEdit={handleEdit}
      />

      {/* Form modal */}
      {showForm && (
        <ServiceForm
          isEdit={isEditMode}
          initialData={editingRecord || undefined}
          onSubmit={isEditMode ? handleUpdate : handleCreate}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

/* -- Internal stat card -- */
interface StatCardProps {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: number | string;
  readonly bg: string;
  readonly isText?: boolean;
}

function StatCard({ icon, label, value, bg, isText = false }: StatCardProps) {
  return (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3 card-hover-subtle`}>
      <div className="p-2 bg-white/60 rounded-lg">{icon}</div>
      <div>
        <div className={`font-bold text-gray-900 ${isText ? 'text-sm' : 'text-2xl'}`}>{value}</div>
        <div className="text-xs text-gray-600">{label}</div>
      </div>
    </div>
  );
}
