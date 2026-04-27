import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, Search, Building2, Phone, Mail, Clock, Check, FileText } from 'lucide-react';
import { LocationCard } from '@/components/locations/LocationCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { LocationDetail } from '@/components/locations/LocationDetail';
import { useLocations } from '@/hooks/useLocations';
import { STATUS_LABELS, type LocationStatus, type LocationBranch } from '@/data/mockLocations';

/**
 * Locations Page - Manage clinic branches with grid, detail view, and dashboard
 * @crossref:route[/locations]
 * @crossref:used-in[App]
 * @crossref:uses[LocationCard, LocationDetail, LocationDashboard, useLocations]
 */
export function Locations() {
  const { t } = useTranslation('locations');
  const {
    locations,
    selectedLocation,
    setSelectedLocationId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    getMetricsByLocationId,
    totalStats,
    clearFilters,
    updateLocation,
    isLoading,
  } = useLocations();

  const [showAddForm, setShowAddForm] = useState(false);

  // Detail view when a location is selected
  if (selectedLocation) {
    const metrics = getMetricsByLocationId(selectedLocation.id);
    return (
      <LocationDetail
        location={selectedLocation}
        metrics={metrics}
        onBack={() => setSelectedLocationId(null)}
        onUpdate={(updated: LocationBranch) => {
          updateLocation(updated);
        }} />);


  }

  const statusOptions: readonly (LocationStatus | 'all')[] = ['all', 'active', 'renovation', 'closed'];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('locations:subtitle')}
        icon={<MapPin className="w-6 h-6 text-primary" />}
        actions={
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        }
      />

      {isLoading ? (
        <LoadingState title="Loading locations..." description="Fetching clinic branches and filters." />
      ) : (
        <>
      {/* Summary stats */}
      {/* @crossref:uses[useLocations.totalStats] */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">{t('locations:totalBranches')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalStats.totalBranches}</p>
          <p className="text-xs text-green-600 mt-0.5">{totalStats.activeBranches} active</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">{t('totalStaff')}</p>
          <p className="text-2xl font-bold text-gray-900">{totalStats.totalEmployees}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('acrossAllBranches')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">{t('locations:totalCustomers')}</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalStats.totalCustomers.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{t('registeredPatients')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">{t('locations:monthlyRevenue')}</p>
          <p className="text-2xl font-bold text-gray-900">{totalStats.totalRevenue}M</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t('target')}: {totalStats.totalTarget}M VND
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-card" />
          
        </div>
        <div className="flex items-center gap-2">
          {statusOptions.map((status) =>
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
            statusFilter === status ?
            'bg-primary text-white' :
            'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`
            }>
            
              {status === 'all' ? 'All' : STATUS_LABELS[status]}
            </button>
          )}
        </div>
        {(searchQuery || statusFilter !== 'all') &&
        <button
          onClick={clearFilters}
          className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">
          
            Clear filters
          </button>
        }
      </div>

      {/* Location cards grid */}
      {/* @crossref:uses[LocationCard] */}
      {locations.length === 0 ?
      <div className="bg-white rounded-xl shadow-card p-12 text-center">
          <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{t('locations:noLocations')}</p>
        </div> :

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locations.map((location) =>
        <LocationCard
          key={location.id}
          location={location}
          onSelect={setSelectedLocationId} />

        )}
        </div>
      }
        </>
      )}

      {/* Add Location Modal */}
      {showAddForm &&
      <div className="modal-container">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddForm(false)} />
          <div className="modal-content max-w-[560px] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="modal-header relative px-6 py-5 bg-primary">
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{t('locations:addLocation')}</h2>
                    <p className="text-sm text-blue-100 mt-0.5">{t('locations:createNew')}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowAddForm(false)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
                  <Plus className="w-5 h-5 text-white rotate-45" />
                </button>
              </div>
            </div>

            {/* Form */}
            <AddLocationForm
            onClose={() => setShowAddForm(false)}
            onSubmit={(_data) => {
              // TODO: Call API to create location
              setShowAddForm(false);
            }} />
          
          </div>
        </div>
      }
    </div>);

}

/**
 * AddLocationForm — inline form component for creating a new branch
 * Blueprint spec: lo-2 "Add New Location Form"
 */
interface LocationFormData {
  readonly name: string;
  readonly address: string;
  readonly district: string;
  readonly phone: string;
  readonly email: string;
  readonly operatingHours: string;
  readonly status: 'active' | 'renovation' | 'closed';
  readonly manager: string;
}

function AddLocationForm({
  onClose,
  onSubmit



}: {readonly onClose: () => void;readonly onSubmit: (data: LocationFormData) => void;}) {
  const { t } = useTranslation('locations');
  const [form, setForm] = useState<LocationFormData>({
    name: '',
    address: '',
    district: '',
    phone: '',
    email: '',
    operatingHours: 'Mon-Sat 8:00-17:00',
    status: 'active',
    manager: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof LocationFormData, value: string) =>
  setForm((prev) => ({ ...prev, [field]: value }));

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Branch name is required';
    if (!form.address.trim()) e.address = 'Address is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (validate()) onSubmit(form);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="modal-body px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Branch Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {t('form.name')} *
          </label>
          <input
            type="text" value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t("egTamDentistBnhDng")}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />

          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        {/* Address + District */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {t('form.address')} *
            </label>
            <input
              type="text" value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder={t("123NgAbcPhngX")}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />

            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('form.district')}
            </label>
            <input
              type="text" value={form.district}
              onChange={(e) => update('district', e.target.value)}
              placeholder={t("egQun1")}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />

          </div>
        </div>

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {t('form.phone')} *
            </label>
            <input
              type="tel" value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="028-xxxx-xxxx"
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />

            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {t('form.email')}
            </label>
            <input
              type="email" value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="branch@tamdentist.vn"
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />

          </div>
        </div>

        {/* Operating Hours + Manager */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t('form.openingHours')}
            </label>
            <input
              type="text" value={form.operatingHours}
              onChange={(e) => update('operatingHours', e.target.value)}
              placeholder="Mon-Sat 8:00-17:00"
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />

          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {t('form.manager')}
            </label>
            <input
              type="text" value={form.manager}
              onChange={(e) => update('manager', e.target.value)}
              placeholder="Branch manager name"
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all text-sm" />

          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('form.status')}
          </label>
          <div className="flex gap-2">
            {(['active', 'renovation', 'closed'] as const).map((s) =>
            <button
              key={s} type="button"
              onClick={() => update('status', s)}
              className={`px-4 py-2 text-sm rounded-xl border transition-all ${
              form.status === s ?
              s === 'active' ?
              'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20' :
              s === 'renovation' ?
              'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20' :
              'bg-gray-100 text-gray-600 border-gray-300 ring-2 ring-gray-500/20' :
              'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`
              }>

                {STATUS_LABELS[s]}
              </button>
            )}
          </div>
        </div>

        {/* Footer inside form for native submit support */}
        <div className="modal-footer px-6 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 -mx-6 -mb-6 mt-4">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            {t('cancel', { ns: 'common' })}
          </button>
          <button type="submit"
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary-dark transition-all shadow-sm">
            <Check className="w-4 h-4" />
            {t('addLocation')}
          </button>
        </div>
      </form>
    </>);

}
