import { WireframeBox, WireframeRow, WireframeStatCard, WireframeButton } from '../ui';

export function OverviewLayout() {
    return (
        <div className="space-y-4">
            <WireframeRow>
                <WireframeStatCard label="Total Customers" value="1,248" />
                <WireframeStatCard label="Today's Appointments" value="23" />
                <WireframeStatCard label="Active Employees" value="312" />
                <WireframeStatCard label="Active Locations" value="7" />
            </WireframeRow>
            <WireframeRow>
                <div className="flex-1">
                    <WireframeBox label="Quick Actions">
                        <WireframeRow>
                            <WireframeButton label="+ New Customer" primary />
                            <WireframeButton label="+ New Appointment" primary />
                            <WireframeButton label="+ New Employee" />
                        </WireframeRow>
                    </WireframeBox>
                </div>
            </WireframeRow>
            <WireframeRow>
                <div className="flex-[2]">
                    <WireframeBox label="Today's Schedule">
                        <div className="space-y-2 mt-2">
                            {["9:00 AM — Dr. Nguyen — Crown Prep — Tran Van A", "9:30 AM — Dr. Le — Cleaning — Pham Thi B", "10:00 AM — Dr. Nguyen — Implant Consult — Le Van C", "10:30 AM — Dr. Tran — Braces Adjustment — Nguyen D", "11:00 AM — Dr. Le — Root Canal — Vo Thi E"].map((apt, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className={`w-2 h-2 rounded-full ${["bg-blue-400", "bg-emerald-400", "bg-blue-400", "bg-purple-400", "bg-emerald-400"][i]}`}></div>
                                    <span className="text-xs text-gray-600">{apt}</span>
                                </div>
                            ))}
                        </div>
                    </WireframeBox>
                </div>
                <div className="flex-1">
                    <WireframeBox label="Revenue This Month">
                        <div className="h-40 bg-gradient-to-t from-emerald-50 to-white rounded-lg border border-gray-100 flex items-end justify-around px-2 pb-2 mt-2">
                            {[40, 65, 50, 80, 70, 90, 60].map((h, i) => (
                                <div key={i} className="w-6 bg-emerald-400 rounded-t" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </WireframeBox>
                </div>
            </WireframeRow>
            <WireframeBox label="Notifications & Alerts">
                <div className="space-y-1.5 mt-1">
                    {["3 patients waiting >15 min", "5 overdue payments", "2 new appointment requests"].map((n, i) => (
                        <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${["bg-red-400", "bg-amber-400", "bg-blue-400"][i]}`}></span>{n}
                        </div>
                    ))}
                </div>
            </WireframeBox>
        </div>
    );
}
