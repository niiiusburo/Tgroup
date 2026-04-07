import { useState } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin } from 'lucide-react';
import { AddCustomerForm } from '@/components/forms/AddCustomerForm';
import { CustomerProfile } from '@/components/customer';
import { MOCK_CUSTOMERS } from '@/data/mockCustomers';
import { MOCK_LOCATIONS } from '@/data/mockDashboard';
import {
  MOCK_CUSTOMER_PROFILE,
  MOCK_CUSTOMER_PHOTOS,
  MOCK_CUSTOMER_DEPOSIT,
  MOCK_APPOINTMENT_HISTORY,
  MOCK_SERVICE_HISTORY,
} from '@/data/mockCustomerProfile';
import type { CustomerFormData } from '@/data/mockCustomerForm';

/**
 * Customers Page - Patient records with Add/Edit form and Profile view
 * @crossref:route[/customers]
 * @crossref:used-in[App]
 * @crossref:uses[CustomerProfile, AddCustomerForm]
 */
export function Customers() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const filteredCustomers = MOCK_CUSTOMERS.filter((c) => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(lower) ||
      c.phone.includes(lower) ||
      c.email.toLowerCase().includes(lower)
    );
  });

  const getLocationName = (locationId: string) =>
    MOCK_LOCATIONS.find((l) => l.id === locationId)?.name ?? 'Unknown';

  const handleSubmit = (_data: CustomerFormData) => {
    setShowForm(false);
  };

  // Show profile view when a customer is selected
  if (selectedCustomerId) {
    const selected = MOCK_CUSTOMERS.find((c) => c.id === selectedCustomerId);
    const profileData = selected
      ? { ...MOCK_CUSTOMER_PROFILE, id: selected.id, name: selected.name, phone: selected.phone, email: selected.email }
      : MOCK_CUSTOMER_PROFILE;

    return (
      <CustomerProfile
        profile={profileData}
        photos={MOCK_CUSTOMER_PHOTOS}
        deposit={MOCK_CUSTOMER_DEPOSIT}
        appointments={MOCK_APPOINTMENT_HISTORY}
        services={MOCK_SERVICE_HISTORY}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500">Manage patient records and profiles</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Add Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <AddCustomerForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Customer List */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No customers found
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomerId(customer.id)}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">
                    {customer.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {customer.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="w-3 h-3" />
                      {customer.email}
                    </span>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                  <MapPin className="w-3 h-3" />
                  {getLocationName(customer.locationId)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
