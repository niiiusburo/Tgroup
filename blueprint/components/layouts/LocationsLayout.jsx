import { WireframeBox, WireframeRow, WireframeField, WireframeButton, WireframeStatCard } from '../ui';

export function LocationsLayout() {
    const locations = ["Dong Da", "Go Vap", "District 10", "District 3", "District 7", "Thu Duc", "Binh Duong"];
    const staffCounts = [42, 38, 55, 31, 47, 36, 29];
    const clientCounts = [180, 156, 220, 142, 195, 168, 112];

    return (
        <div className="space-y-4">
            <WireframeRow>
                <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">Search by branch name, address, phone, or status</div>
                    <div className="h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
                        <span className="text-gray-400 text-xs">🔍 Type to search — real-time results...</span>
                    </div>
                </div>
                <div className="flex items-end"><WireframeButton label="+ Add Location" primary /></div>
            </WireframeRow>
            <div className="grid grid-cols-3 gap-4">
                {locations.map((loc, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-700">📍 Tam Dentist {loc}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-400">
                            <div>123 Street, {loc}</div>
                            <div>028-xxxx-xxxx</div>
                            <div>Mon-Sat 8:00-17:00</div>
                        </div>
                        <div className="flex gap-4 mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                            <span>👤 {staffCounts[i]} staff</span>
                            <span>🦷 {clientCounts[i]} clients</span>
                        </div>
                    </div>
                ))}
            </div>
            <WireframeBox label="Location Detail (on click)" dashed>
                <div className="space-y-3 mt-2">
                    <WireframeRow>
                        <WireframeField label="Branch Name" />
                        <WireframeField label="Address" />
                        <WireframeField label="Phone" />
                        <WireframeField label="Email" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Operating Hours" />
                        <WireframeField label="Status" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeStatCard label="Employees" value="42" />
                        <WireframeStatCard label="Clients" value="180" />
                        <WireframeStatCard label="Appointments Today" value="12" />
                        <WireframeStatCard label="Revenue This Month" value="$45.2K" />
                    </WireframeRow>
                </div>
            </WireframeBox>
        </div>
    );
}
