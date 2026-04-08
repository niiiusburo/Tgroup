/**
 * TodayServicesTable - Zone 2: Services performed today
 * @crossref:used-in[Overview]
 *
 * Placeholder for now — will show services/procedures for the day.
 * Data will come from service orders linked to today's appointments.
 */

interface TodayServicesTableProps {
  readonly locationId?: string;
}

export function TodayServicesTable({ locationId: _locationId }: TodayServicesTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3">
          Today's Services / Activity
        </h2>
      </div>

      <div className="px-5 pb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Service</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Patient</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Qty</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Doctor</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Amount</th>
              <th className="text-left text-xs font-semibold text-gray-400 uppercase py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="text-center text-gray-400 text-sm py-8">
                Services will populate as patients are treated throughout the day.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
