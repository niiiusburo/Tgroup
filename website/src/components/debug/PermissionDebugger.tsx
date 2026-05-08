/**
 * PermissionDebugger - Development tool to verify current user permissions
 * @crossref:used-in[App, Layout] - Add to Layout for quick access
 * @crossref:uses[useAuth]
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, X, Check, AlertCircle } from 'lucide-react';

interface PermissionDebuggerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const KEY_PERMISSIONS = [
  { id: 'customers.view', label: 'View Customers', category: 'Customers' },
  { id: 'customers.add', label: 'Add Customers', category: 'Customers' },
  { id: 'customers.edit', label: 'Edit Customers', category: 'Customers' },
  { id: 'customers.delete', label: 'Delete Customers', category: 'Customers' },
  { id: 'appointments.view', label: 'View Appointments', category: 'Appointments' },
  { id: 'appointments.add', label: 'Add Appointments', category: 'Appointments' },
  { id: 'appointments.edit', label: 'Edit Appointments', category: 'Appointments' },
  { id: 'payment.view', label: 'View Payments', category: 'Payment' },
  { id: 'payment.add', label: 'Add Payments', category: 'Payment' },
  { id: 'payment.refund', label: 'Process Refunds', category: 'Payment' },
  { id: 'payment.void', label: 'Void Payments', category: 'Payment' },
  { id: 'employees.view', label: 'View Employees', category: 'Employees' },
  { id: 'employees.add', label: 'Add Employees', category: 'Employees' },
  { id: 'employees.edit', label: 'Edit Employees', category: 'Employees' },
  { id: 'services.view', label: 'View Services', category: 'Services' },
  { id: 'services.add', label: 'Add Services', category: 'Services' },
  { id: 'services.edit', label: 'Edit Services', category: 'Services' },
  { id: 'settings.view', label: 'View Settings', category: 'Settings' },
  { id: 'settings.edit', label: 'Edit Settings', category: 'Settings' },
  { id: '*', label: 'Super Admin (Wildcard)', category: 'Admin' },
] as const;

export function PermissionDebugger({ isOpen, onClose }: PermissionDebuggerProps) {
  const { user, permissions, hasPermission, isAuthenticated } = useAuth();
  const [showAll, setShowAll] = useState(false);

  if (!isOpen) return null;

  const effectivePerms = permissions?.effectivePermissions ?? [];
  const isAdmin = effectivePerms.includes('*');

  // Group permissions by category
  const groupedPerms = KEY_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof KEY_PERMISSIONS[number][]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Permission Debugger</h2>
              <p className="text-xs text-gray-500">Verify your current permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                {isAuthenticated ? `Logged in as: ${user?.name}` : 'Not authenticated'}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Group: <span className="font-semibold">{permissions?.groupName ?? 'None'}</span>
                {isAdmin && <span className="ml-2 text-green-700 font-bold">(SUPER ADMIN)</span>}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Effective Permissions: <span className="font-mono">{effectivePerms.length}</span>
              </p>
              {effectivePerms.length === 0 && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ No permissions found! Try logging out and back in.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {effectivePerms.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Permissions Loaded</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Your session may have an outdated token. Log out and log back in to refresh your permissions.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPerms).map(([category, perms]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((perm) => {
                      const granted = hasPermission(perm.id);
                      return (
                        <div
                          key={perm.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            granted ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                          }`}
                        >
                          {granted ? (
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          )}
                          <span className={granted ? 'text-green-800' : 'text-gray-500'}>
                            {perm.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Raw permissions toggle */}
          {effectivePerms.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {showAll ? 'Hide' : 'Show'} all {effectivePerms.length} permissions
              </button>
              {showAll && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <code className="text-xs font-mono text-gray-700 break-all">
                    {JSON.stringify(effectivePerms, null, 2)}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-600">Ctrl+Shift+P</kbd> to toggle
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Keyboard shortcut hook
export function usePermissionDebuggerShortcut() {
  const [isOpen, setIsOpen] = useState(false);

  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return { isOpen, setIsOpen };
}
