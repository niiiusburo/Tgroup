import { WireframeBox, WireframeRow, WireframeField, WireframeButton, WireframeStatCard } from '../ui';

export function ServicesLayout() {
    const services = [
        { date: "Mar 28", service: "Crown Prep", doctor: "Dr. Nguyen", amount: "$2,000", paid: "$800", status: "Awaiting Payment", sessions: "1/1", color: "bg-amber-100 text-amber-700" },
        { date: "Mar 10", service: "Consultation", doctor: "Dr. Nguyen", amount: "$0", paid: "$0", status: "Completed", sessions: "1/1", color: "bg-emerald-100 text-emerald-700" },
        { date: "Feb 15", service: "X-Ray (Full Mouth)", doctor: "Dr. Tran", amount: "$300", paid: "$300", status: "Paid", sessions: "1/1", color: "bg-emerald-100 text-emerald-700" },
        { date: "Jan 20", service: "Cleaning", doctor: "Dr. Le", amount: "$380", paid: "$380", status: "Paid", sessions: "1/1", color: "bg-emerald-100 text-emerald-700" },
        { date: "Ongoing", service: "Braces Adjustment", doctor: "Dr. Tran", amount: "$28,000", paid: "$15,000", status: "In Progress", sessions: "8/24", color: "bg-blue-100 text-blue-700" },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold">TA</div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800">Tran Van A</div>
                    <div className="text-xs text-gray-500">0912-345-678 · Dong Da</div>
                </div>
                <WireframeStatCard label="Total Services" value="8" />
                <WireframeStatCard label="In Progress" value="2" />
                <WireframeStatCard label="Total Billed" value="$4,800" />
            </div>
            <WireframeBox label="Create Service Record for This Customer">
                <div className="space-y-3 mt-2">
                    <WireframeRow>
                        <WireframeField label="Service Type (from catalog)" />
                        <WireframeField label="Doctor (optional)" />
                        <WireframeField label="Assistant (optional)" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Location (optional — can differ from customer's)" />
                        <WireframeField label="Linked Appointment (optional)" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Unit Price" />
                        <WireframeField label="Quantity" />
                        <WireframeField label="Discount" />
                        <WireframeField label="Total" />
                    </WireframeRow>
                    <WireframeRow>
                        <div className="flex-1"><WireframeField label="Prescription / Notes" /></div>
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Status" />
                        <WireframeField label="Sessions Total (if multi-visit)" />
                        <WireframeField label="Sessions Completed" />
                    </WireframeRow>
                    <WireframeButton label="Create Service Record" primary />
                </div>
            </WireframeBox>
            <WireframeBox label="Service History — Tran Van A">
                <div className="space-y-2 mt-2">
                    {services.map((sv, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-xs font-mono text-gray-500 w-16">{sv.date}</span>
                            <span className="text-sm font-medium text-gray-700 flex-1">{sv.service}</span>
                            <span className="text-xs text-gray-500">{sv.doctor}</span>
                            <span className="text-xs text-gray-500">Sessions: {sv.sessions}</span>
                            <span className="text-xs text-gray-600 font-medium">{sv.amount}</span>
                            <span className="text-xs text-gray-400">Paid: {sv.paid}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sv.color}`}>{sv.status}</span>
                        </div>
                    ))}
                </div>
            </WireframeBox>
            <WireframeBox label="Multi-visit Tracker — Braces Adjustment" dashed>
                <div className="mt-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-500">Progress:</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: "33%" }}></div>
                        </div>
                        <span className="text-xs font-bold text-blue-600">8 of 24 sessions</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs ${i < 8 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                                {i + 1}
                            </div>
                        ))}
                    </div>
                </div>
            </WireframeBox>
        </div>
    );
}
