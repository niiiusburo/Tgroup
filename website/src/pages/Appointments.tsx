import { CalendarCheck } from 'lucide-react';

/**
 * Appointments Page
 * @crossref:route[/appointments]
 * @crossref:used-in[App]
 */
export function Appointments() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CalendarCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500">View and manage all appointments</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          New Appointment
        </button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2">
        {['All', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled'].map((status) => (
          <button
            key={status}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            {status}
          </button>
        ))}
      </div>

      {/* Placeholder appointments list */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex flex-col items-center justify-center">
                <div className="h-3 bg-gray-300 rounded w-8 mb-1" />
                <div className="h-4 bg-gray-300 rounded w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-6 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
