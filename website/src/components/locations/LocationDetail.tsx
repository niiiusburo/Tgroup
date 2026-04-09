import { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Clock,
  User,
  Users,
  Calendar,
  Edit2,
  X,
  Check,
  Building2,
} from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_STYLES,
  type LocationBranch,
  type LocationMetrics,
  type LocationStatus,
} from '@/data/mockLocations';
import { LocationDashboard } from './LocationDashboard';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Location Detail - full branch view with employees, stats, revenue
 * @crossref:used-in[Locations]
 * @crossref:uses[LocationDashboard, usePermissions]
 */

interface LocationDetailProps {
  readonly location: LocationBranch;
  readonly metrics: LocationMetrics | null;
  readonly onBack: () => void;
  readonly onUpdate?: (updated: LocationBranch) => void;
}

interface LocationFormData {
  readonly name: string;
  readonly address: string;
  readonly district: string;
  readonly phone: string;
  readonly email: string;
  readonly operatingHours: string;
  readonly status: LocationStatus;
  readonly manager: string;
}

export function LocationDetail({ location, metrics, onBack, onUpdate }: LocationDetailProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('locations.edit');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<LocationFormData>({
    name: location.name,
    address: location.address,
    district: location.district,
    phone: location.phone,
    email: location.email,
    operatingHours: location.operatingHours,
    status: location.status,
    manager: location.manager,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleEditClick = () => {
    setForm({
      name: location.name,
      address: location.address,
      district: location.district,
      phone: location.phone,
      email: location.email,
      operatingHours: location.operatingHours,
      status: location.status,
      manager: location.manager,
    });
    setErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Branch name is required';
    if (!form.address.trim()) newErrors.address = 'Address is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onUpdate?.({ ...location, ...form });
    setIsEditing(false);
  };

  const update = (field: keyof LocationFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Edit mode
  if (isEditing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Edit2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Location</h1>
                <p className="text-sm text-gray-500">Update branch information</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-xl shadow-card p-6 space-y-5">
          {/* Branch Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Branch Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Address + District */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Address *
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
              />
              {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                District
              </label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => update('district', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
              />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Phone *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
              />
            </div>
          </div>

          {/* Operating Hours + Manager */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Operating Hours
              </label>
              <input
                type="text"
                value={form.operatingHours}
                onChange={(e) => update('operatingHours', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Manager
              </label>
              <input
                type="text"
                value={form.manager}
                onChange={(e) => update('manager', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-sm"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <div className="flex gap-2">
              {(['active', 'renovation', 'closed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update('status', s)}
                  className={`px-4 py-2 text-sm rounded-xl border transition-all ${
                    form.status === s
                      ? s === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                        : s === 'renovation'
                          ? 'bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20'
                          : 'bg-gray-100 text-gray-600 border-gray-300 ring-2 ring-gray-500/20'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[location.status]}`}
                >
                  {STATUS_LABELS[location.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500">{location.address}</p>
            </div>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={handleEditClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-900">{location.phone}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <Mail className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900">{location.email}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Operating Hours</p>
            <p className="text-sm font-medium text-gray-900">{location.operatingHours}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <User className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Manager</p>
            <p className="text-sm font-medium text-gray-900">{location.manager}</p>
          </div>
        </div>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Employees</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{location.employeeCount}</p>
          <p className="text-xs text-gray-400 mt-1">Active staff members</p>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {location.customerCount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total registered patients</p>
        </div>

        <div className="bg-white rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Since</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{location.openingDate}</p>
          <p className="text-xs text-gray-400 mt-1">Opening date</p>
        </div>
      </div>

      {/* Branch metrics dashboard */}
      {/* @crossref:uses[LocationDashboard] */}
      {metrics && <LocationDashboard metrics={metrics} />}
    </div>
  );
}
