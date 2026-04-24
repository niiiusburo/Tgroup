/**
 * DeleteConfirmDialog — Shared delete confirmation dialog
 * Replaces inline delete dialogs across Customers.tsx, ServiceCatalog.tsx, etc.
 * Shows linked data warnings when applicable.
 * @crossref:used-in[Customers, ServiceCatalog, Employees, Services]
 */
import { AlertTriangle } from 'lucide-react';
import { FormShell, FormHeader, FormFooter } from '@/components/modules/FormShell';

export interface LinkedItem {
  label: string;
  count: number;
}

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  warningMessage?: string;
  linkedItems?: LinkedItem[];
  isDeleting?: boolean;
  deleteError?: string | null;
}

export function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  warningMessage,
  linkedItems,
  isDeleting = false,
  deleteError,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const hasLinkedItems = linkedItems && linkedItems.length > 0;

  return (
    <FormShell onClose={onClose} maxWidth="md">
      <FormHeader
        title="Confirm Delete"
        subtitle={`Deleting "${itemName}"`}
        icon={<AlertTriangle className="w-5 h-5" />}
        onClose={onClose}
      />

      <div className="px-6 py-5 space-y-4">
        <p className="text-sm text-gray-700">
          {warningMessage ?? 'Are you sure you want to delete this item? This action cannot be undone.'}
        </p>

        {hasLinkedItems && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Linked Data Warning</span>
            </div>
            <ul className="space-y-1">
              {linkedItems.map((item) => (
                <li key={item.label} className="text-sm text-amber-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item.count} {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {deleteError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-700">{deleteError}</p>
          </div>
        )}
      </div>

      <FormFooter
        onCancel={onClose}
        onSubmit={onConfirm}
        submitLabel="Delete"
        isSubmitting={isDeleting}
        submitDisabled={isDeleting}
      />
    </FormShell>
  );
}
