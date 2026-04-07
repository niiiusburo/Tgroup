import { WireframeBox, WireframeRow, WireframeField, WireframeButton, WireframeTable, WireframeStatCard } from '../ui';

export function CustomersLayout() {
    return (
        <div className="space-y-4">
            <WireframeBox label="Step 1 — Find or Add Customer">
                <div className="space-y-3 mt-2">
                    <WireframeRow>
                        <div className="flex-1">
                            <div className="text-xs text-gray-400 mb-1">Search by name, phone, customer ID, location, source, or referral code</div>
                            <div className="h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
                                <span className="text-gray-400 text-xs">🔍 Type to search — real-time results...</span>
                            </div>
                        </div>
                        <div className="flex items-end"><WireframeButton label="+ New Customer" primary /></div>
                    </WireframeRow>
                    <div className="text-xs text-gray-400 italic">Search results appear below. Click a customer to open their full profile.</div>
                    <WireframeTable columns={["Name", "Phone", "Location", "Referral Code", "Source", "Last Visit", "Status"]} rows={4} />
                </div>
            </WireframeBox>
            <WireframeBox label="Step 2 — Customer Profile (selected)">
                <div className="space-y-3 mt-2">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">TA</div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800">Tran Van A</div>
                            <div className="text-xs text-gray-500">0912-345-678 · Dong Da · Since Jan 2024</div>
                        </div>
                        <div className="flex gap-2">
                            <WireframeButton label="Edit Profile" />
                        </div>
                    </div>
                    <WireframeRow>
                        <WireframeField label="Full Name" />
                        <WireframeField label="Phone" />
                        <WireframeField label="Email" />
                        <WireframeField label="DOB" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Gender" />
                        <WireframeField label="Address" />
                        <WireframeField label="Location (optional)" />
                        <WireframeField label="Referral Code (optional)" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Source" />
                        <div className="flex-1"><WireframeField label="Notes" /></div>
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeStatCard label="Deposit Balance" value="$150" />
                        <WireframeStatCard label="Outstanding" value="$1,200" />
                        <WireframeStatCard label="Total Visits" value="14" />
                        <WireframeStatCard label="Last Visit" value="Mar 28" />
                    </WireframeRow>
                    <WireframeBox label="Photo Records">
                        <div className="flex gap-2 mt-1">
                            {[1, 2, 3, 4].map(i => <div key={i} className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200"></div>)}
                            <div className="w-16 h-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg">+</div>
                        </div>
                    </WireframeBox>
                    <div className="flex gap-3 pt-2 border-t border-gray-200">
                        <div className="flex-1 p-3 bg-blue-50 rounded-lg border border-blue-200 text-center cursor-pointer hover:bg-blue-100 transition-colors">
                            <div className="text-lg">📅</div>
                            <div className="text-xs font-medium text-blue-700 mt-1">Appointments</div>
                            <div className="text-xs text-blue-500">3 upcoming</div>
                        </div>
                        <div className="flex-1 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center cursor-pointer hover:bg-emerald-100 transition-colors">
                            <div className="text-lg">🦷</div>
                            <div className="text-xs font-medium text-emerald-700 mt-1">Record</div>
                            <div className="text-xs text-emerald-500">8 records</div>
                        </div>
                        <div className="flex-1 p-3 bg-amber-50 rounded-lg border border-amber-200 text-center cursor-pointer hover:bg-amber-100 transition-colors">
                            <div className="text-lg">💰</div>
                            <div className="text-xs font-medium text-amber-700 mt-1">Payment</div>
                            <div className="text-xs text-amber-500">$1,200 outstanding</div>
                        </div>
                    </div>
                </div>
            </WireframeBox>
            <WireframeBox label="Add New Customer Form (if creating new)" dashed>
                <div className="space-y-3 mt-2">
                    <WireframeRow>
                        <WireframeField label="Full Name *" />
                        <WireframeField label="Phone *" />
                        <WireframeField label="Email" />
                        <WireframeField label="DOB" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Gender" />
                        <WireframeField label="Address" />
                        <WireframeField label="Location (optional)" />
                        <WireframeField label="Referral Code (optional)" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Source (optional)" />
                        <div className="flex-1"><WireframeField label="Notes" /></div>
                    </WireframeRow>
                    <WireframeButton label="Create Customer" primary />
                </div>
            </WireframeBox>
        </div>
    );
}
