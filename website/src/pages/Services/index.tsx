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
  Activity, CheckCircle2, XCircle, DollarSign } from
'lucide-react';
import { ServiceForm } from '@/components/services/ServiceForm';
import { ServiceHistoryList } from '@/components/services/ServiceHistoryList';
import { useLocationFilter } from '@/contexts/LocationContext';
import { useServices, type CategoryFilter, type CreateServiceInput } from '@/hooks/useServices';
import type { ServiceRecord, ServiceStatus } from '@/data/mockServices';
import { APPOINTMENT_TYPE_LABELS, type AppointmentType } from '@/constants';
import { formatVND } from '@/lib/formatting';
import { normalizeText } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const CATEGORY_OPTIONS: {label: string;value: CategoryFilter;}[] = [
{ label: 'All Categories', value: 'all' },
...Object.entries(APPOINTMENT_TYPE_LABELS).map(([key, label]) => ({
  label,
  value: key as AppointmentType
}))];


export function Services() {
  const { t } = useTranslation('services');
  const STATUS_TABS: {label: string;value: 'active' | 'completed' | 'cancelled' | 'all';}[] = [
  { label: t('active'), value: 'active' },
  { label: t('completed'), value: 'completed' },
  { label: t('cancelled'), value: 'cancelled' },
  { label: t('all'), value: 'all' }];

  const { selectedLocationId } = useLocationFilter();
  const {
    allRecords,
    stats,
    categoryFilter,
    setCategoryFilter,
    searchTerm,
    setSearchTerm,
    createServiceRecord,
    updateServiceRecord,
    updateVisitStatus,
    cancelServiceRecord
  } = useServices(selectedLocationId);

  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [statusTab, setStatusTab] = useState<'active' | 'completed' | 'cancelled' | 'all'>('all');

  // Sort records based on selected tab - selected status first, then others
  const sortedRecords = (() => {
    // Apply category filter first
    let filtered = categoryFilter === 'all' ?
    allRecords :
    allRecords.filter((r) => r.category === categoryFilter);

    // Apply search filter
    if (searchTerm) {
      const term = normalizeText(searchTerm);
      filtered = filtered.filter((r) =>
      normalizeText(r.customerName).includes(term) ||
      normalizeText(r.serviceName).includes(term) ||
      normalizeText(r.doctorName).includes(term)
      );
    }

    if (statusTab === 'all') {
      return filtered;
    }

    // Map tab to status
    const statusMap: Record<string, ServiceStatus> = {
      'active': 'active',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    const targetStatus = statusMap[statusTab];

    // Sort: target status first, then others
    return [...filtered].sort((a, b) => {
      if (a.status === targetStatus && b.status !== targetStatus) return -1;
      if (a.status !== targetStatus && b.status === targetStatus) return 1;
      const order = { 'active': 0, 'completed': 1, 'cancelled': 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });
  })();

  async function handleCreate(data: CreateServiceInput) {
    await createServiceRecord(data);
    setShowForm(false);
  }

  function handleEdit(record: ServiceRecord) {
    setEditingRecord(record);
    setIsEditMode(true);
    setShowForm(true);
  }

  async function handleUpdate(data: CreateServiceInput) {
    await updateServiceRecord(data);
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
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          
          <Plus className="w-4 h-4" />
          New Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Activity className="w-5 h-5 text-blue-600" />} label={t("angIuTr")} value={stats.active} bg="bg-blue-50" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label={t("honThnh")} value={stats.completed} bg="bg-green-50" />
        <StatCard icon={<XCircle className="w-5 h-5 text-red-600" />} label={t("hy")} value={stats.cancelled} bg="bg-red-50" />
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
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" />
          
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary">
            
            {CATEGORY_OPTIONS.map((opt) =>
            <option key={opt.value} value={opt.value}>{opt.label}</option>
            )}
          </select>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) =>
        <button
          key={tab.value}
          type="button"
          onClick={() => setStatusTab(tab.value)}
          className={`px-4 py-2 text-sm font-medium rounded-lg border whitespace-nowrap transition-colors ${
          statusTab === tab.value ?
          'bg-primary text-white border-primary' :
          'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'}`
          }>
          
            {tab.label}
          </button>
        )}
      </div>

      {/* Service records list */}
      <ServiceHistoryList
        records={sortedRecords}
        onUpdateVisit={updateVisitStatus}
        onCancel={cancelServiceRecord}
        onEdit={handleEdit} />
      

      {/* Form modal */}
      {showForm &&
      <ServiceForm
        isEdit={isEditMode}
        initialData={editingRecord || undefined}
        onSubmit={isEditMode ? handleUpdate : handleCreate}
        onClose={handleCloseForm} />

      }
    </div>);

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
    </div>);

}