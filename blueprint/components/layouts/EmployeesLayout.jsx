import { WireframeBox, WireframeRow, WireframeField, WireframeButton, WireframeTable, WireframeStatCard } from '../ui';

export function EmployeesLayout() {
    const locations = ["Dong Da", "Go Vap", "District 10", "District 3", "District 7", "Thu Duc", "Binh Duong"];

    return (
        <div className="space-y-4">
            <WireframeRow>
                <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">Search by name, phone, referral code, tier, role, or location</div>
                    <div className="h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
                        <span className="text-gray-400 text-xs">🔍 Type to search — real-time results...</span>
                    </div>
                </div>
                <div className="flex items-end"><WireframeButton label="+ Add Employee" primary /></div>
            </WireframeRow>
            <WireframeRow>
                <WireframeStatCard label="Total Employees" value="312" />
                <WireframeStatCard label="Admin" value="3" />
                <WireframeStatCard label="Manager" value="14" />
                <WireframeStatCard label="Staff" value="295" />
            </WireframeRow>
            <WireframeTable columns={["Name", "Phone", "Tier", "Role(s)", "Referral Code", "Location(s)", "Status"]} rows={8} />
            <WireframeBox label="Employee Profile (on click)" dashed>
                <div className="space-y-3 mt-2">
                    <WireframeRow>
                        <WireframeField label="Full Name" />
                        <WireframeField label="Phone" />
                        <WireframeField label="Email" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Tier (Admin / Manager / Staff)" />
                        <WireframeField label="Role(s) — multi-select" />
                        <WireframeField label="Referral Code" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Location(s) — optional, multi-select" />
                        <WireframeField label="Linked Employees (optional)" />
                        <WireframeField label="Status" />
                    </WireframeRow>
                    <WireframeBox label="Schedule & Availability" dashed>
                        <div className="flex gap-1 mt-1">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                                <div key={i} className={`flex-1 text-center py-2 rounded text-xs ${i < 5 ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-gray-50 text-gray-400 border border-gray-200"}`}>
                                    <div className="font-medium">{d}</div>
                                    <div className="mt-0.5">{i < 5 ? "8-17" : "Off"}</div>
                                </div>
                            ))}
                        </div>
                    </WireframeBox>
                    <WireframeRow>
                        <WireframeStatCard label="Referred Customers" value="24" />
                        <WireframeStatCard label="Appointments This Month" value="48" />
                        <WireframeStatCard label="Services This Month" value="31" />
                    </WireframeRow>
                </div>
            </WireframeBox>
        </div>
    );
}
