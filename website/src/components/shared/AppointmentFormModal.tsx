import { AppointmentForm, type AppointmentFormData } from '@/components/appointments/AppointmentForm';

interface AppointmentFormModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (data: AppointmentFormData) => void | Promise<void>;
  readonly initialData?: Partial<AppointmentFormData>;
}

export function AppointmentFormModal({ isOpen, onClose, onSubmit, initialData }: AppointmentFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-container">
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="modal-content animate-in zoom-in-95 duration-200 max-w-[900px]">
        <AppointmentForm
          onSubmit={onSubmit}
          onClose={onClose}
          initialData={initialData}
        />
      </div>
    </div>
  );
}
