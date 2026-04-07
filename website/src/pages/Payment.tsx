import { CreditCard } from 'lucide-react';

/**
 * Payment Page
 * @crossref:route[/payment]
 * @crossref:used-in[App]
 */
export function Payment() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment</h1>
          <p className="text-sm text-gray-500">Invoices, transactions, and billing</p>
        </div>
      </div>

      {/* Payment stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Total Revenue', 'Pending Payments', 'Overdue'].map((label) => (
          <div key={label} className="bg-white rounded-xl p-6 shadow-card">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>

      {/* Placeholder transactions table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="h-10 bg-gray-100 rounded-lg w-48" />
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Invoice #', 'Customer', 'Date', 'Amount', 'Status'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-32" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-24" /></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                <td className="px-4 py-3"><div className="h-6 bg-gray-100 rounded w-20" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
