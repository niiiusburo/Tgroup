import { WireframeBox, WireframeRow, WireframeField, WireframeButton, WireframeStatCard } from '../ui';

export function AppointmentsLayout() {
    const appointments = [
        { date: "Apr 12", time: "9:00", doctor: "Dr. Nguyen", service: "Crown Fitting", location: "Dong Da", status: "Upcoming", color: "bg-blue-100 text-blue-700" },
        { date: "Apr 20", time: "14:00", doctor: "Dr. Nguyen", service: "Follow-up Check", location: "Dong Da", status: "Upcoming", color: "bg-blue-100 text-blue-700" },
        { date: "May 5", time: "10:00", doctor: "Dr. Le", service: "Cleaning", location: "Go Vap", status: "Upcoming", color: "bg-blue-100 text-blue-700" },
        { date: "Mar 28", time: "9:30", doctor: "Dr. Nguyen", service: "Crown Prep", location: "Dong Da", status: "Completed", color: "bg-emerald-100 text-emerald-700" },
        { date: "Mar 10", time: "11:00", doctor: "Dr. Nguyen", service: "Consultation", location: "Dong Da", status: "Completed", color: "bg-emerald-100 text-emerald-700" },
        { date: "Feb 15", time: "14:00", doctor: "Dr. Tran", service: "X-Ray", location: "Dong Da", status: "Completed", color: "bg-emerald-100 text-emerald-700" },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold">TA</div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800">Tran Van A</div>
                    <div className="text-xs text-gray-500">0912-345-678 · Dong Da</div>
                </div>
                <WireframeStatCard label="Total Appointments" value="14" />
                <WireframeStatCard label="Upcoming" value="3" />
                <WireframeStatCard label="Completed" value="11" />
            </div>
            <WireframeBox label="Create New Appointment for This Customer">
                <div className="space-y-3 mt-2">
                    <WireframeRow>
                        <WireframeField label="Date" />
                        <WireframeField label="Time" />
                        <WireframeField label="Duration (est.)" />
                        <WireframeField label="Doctor (optional)" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Location (optional)" />
                        <WireframeField label="Service Type (optional)" />
                        <WireframeField label="Color Label" />
                    </WireframeRow>
                    <WireframeRow>
                        <div className="flex-1"><WireframeField label="Notes" /></div>
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeButton label="Create Appointment" primary />
                    </WireframeRow>
                </div>
            </WireframeBox>
            <WireframeBox label="Appointment History — Tran Van A">
                <div className="space-y-2 mt-2">
                    {appointments.map((apt, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-xs font-mono text-gray-500 w-16">{apt.date}</span>
                            <span className="text-xs font-mono text-gray-400 w-12">{apt.time}</span>
                            <span className="text-xs text-gray-600 flex-1">{apt.doctor} — {apt.service}</span>
                            <span className="text-xs text-gray-400">{apt.location}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${apt.color}`}>{apt.status}</span>
                            {apt.status === "Completed" && <span className="text-xs text-blue-500 cursor-pointer">View Service →</span>}
                            {apt.status === "Upcoming" && <span className="text-xs text-amber-500 cursor-pointer">Reschedule</span>}
                        </div>
                    ))}
                </div>
            </WireframeBox>
            <WireframeBox label="Today's Check-in" dashed>
                <div className="flex items-center gap-3 mt-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">9:00 AM — Crown Fitting with Dr. Nguyen</div>
                        <div className="text-xs text-gray-400">Dong Da · Scheduled</div>
                    </div>
                    <WireframeButton label="Mark as Arrived" primary />
                    <WireframeButton label="Convert to Service →" />
                </div>
            </WireframeBox>
        </div>
    );
}
