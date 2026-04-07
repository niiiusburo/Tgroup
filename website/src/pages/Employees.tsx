import { UserCog } from 'lucide-react';

/**
 * Employees Page
 * @crossref:route[/employees]
 * @crossref:used-in[App]
 */
export function Employees() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <UserCog className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500">Staff management and schedules</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
          Add Employee
        </button>
      </div>

      {/* Placeholder employees grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200" />
              <div>
                <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-20" />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <div className="h-6 bg-gray-100 rounded w-16" />
              <div className="h-6 bg-gray-100 rounded w-16" />
            </div>
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-100 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
