import { Globe } from 'lucide-react';

/**
 * Website Page
 * @crossref:route[/website]
 * @crossref:used-in[App]
 */
export function Website() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Globe className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website</h1>
          <p className="text-sm text-gray-500">Website builder and content management</p>
        </div>
      </div>

      {/* Website sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {['Home Page', 'About Us', 'Services', 'Team', 'Contact', 'Booking'].map((section) => (
          <div key={section} className="bg-white rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100" />
              <span className="font-medium text-gray-900">{section}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded w-full mb-4" />
            <div className="flex gap-2">
              <button className="flex-1 py-2 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5">
                Edit
              </button>
              <button className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
