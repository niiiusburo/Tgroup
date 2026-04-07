import { useState } from 'react';
import { WireframeBox, WireframeRow, WireframeField, WireframeButton, WireframeTable, WireframeStatCard } from '../ui';

/* ─── Tab: Profile ─── */
function ProfileTab() {
    return (
        <div className="space-y-4">
            <WireframeBox label="Personal Information">
                <div className="space-y-3 mt-2">
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
                    <div className="flex gap-2 pt-2">
                        <WireframeButton label="Save Changes" primary />
                        <WireframeButton label="Cancel" />
                    </div>
                </div>
            </WireframeBox>

            <WireframeBox label="Photo Records">
                <div className="flex gap-2 mt-1">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-300">Photo {i}</span>
                        </div>
                    ))}
                    <div className="w-20 h-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg cursor-pointer hover:bg-gray-100 transition-colors">+</div>
                </div>
                <div className="text-xs text-gray-400 mt-2">Before/after photos, X-rays, documents</div>
            </WireframeBox>

            <WireframeRow>
                <WireframeStatCard label="Deposit Balance" value="$150" />
                <WireframeStatCard label="Outstanding" value="$1,200" />
                <WireframeStatCard label="Total Visits" value="14" />
                <WireframeStatCard label="Last Visit" value="Mar 28" />
            </WireframeRow>
        </div>
    );
}

/* ─── Tab: Appointments ─── */
function AppointmentsTab() {
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
            <WireframeRow>
                <WireframeStatCard label="Total Appointments" value="14" />
                <WireframeStatCard label="Upcoming" value="3" />
                <WireframeStatCard label="Completed" value="11" />
            </WireframeRow>

            <WireframeBox label="Create New Appointment">
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
                    <WireframeButton label="Create Appointment" primary />
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

            <WireframeBox label="Appointment History">
                <div className="space-y-2 mt-2">
                    {appointments.map((apt, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <span className="text-xs font-mono text-gray-500 w-16">{apt.date}</span>
                            <span className="text-xs font-mono text-gray-400 w-12">{apt.time}</span>
                            <span className="text-xs text-gray-600 flex-1">{apt.doctor} — {apt.service}</span>
                            <span className="text-xs text-gray-400">{apt.location}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${apt.color}`}>{apt.status}</span>
                            {apt.status === "Completed" && <span className="text-xs text-blue-500 cursor-pointer hover:underline">View Record →</span>}
                            {apt.status === "Upcoming" && <span className="text-xs text-amber-500 cursor-pointer hover:underline">Reschedule</span>}
                        </div>
                    ))}
                </div>
            </WireframeBox>
        </div>
    );
}

/* ─── Tab: Records (Treatment History) ─── */
function RecordsTab() {
    const services = [
        { date: "Mar 28", service: "Crown Prep", doctor: "Dr. Nguyen", amount: "$2,000", paid: "$800", status: "Awaiting Payment", sessions: "1/1", color: "bg-amber-100 text-amber-700" },
        { date: "Mar 10", service: "Consultation", doctor: "Dr. Nguyen", amount: "$0", paid: "$0", status: "Completed", sessions: "1/1", color: "bg-emerald-100 text-emerald-700" },
        { date: "Feb 15", service: "X-Ray (Full Mouth)", doctor: "Dr. Tran", amount: "$300", paid: "$300", status: "Paid", sessions: "1/1", color: "bg-emerald-100 text-emerald-700" },
        { date: "Jan 20", service: "Cleaning", doctor: "Dr. Le", amount: "$380", paid: "$380", status: "Paid", sessions: "1/1", color: "bg-emerald-100 text-emerald-700" },
        { date: "Ongoing", service: "Braces Adjustment", doctor: "Dr. Tran", amount: "$28,000", paid: "$15,000", status: "In Progress", sessions: "8/24", color: "bg-blue-100 text-blue-700" },
    ];

    return (
        <div className="space-y-4">
            <WireframeRow>
                <WireframeStatCard label="Total Services" value="8" />
                <WireframeStatCard label="In Progress" value="2" />
                <WireframeStatCard label="Total Billed" value="$4,800" />
            </WireframeRow>

            <WireframeBox label="Create Service Record">
                <div className="space-y-3 mt-2">
                    <WireframeRow>
                        <WireframeField label="Service Type (from catalog)" />
                        <WireframeField label="Doctor (optional)" />
                        <WireframeField label="Assistant (optional)" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeField label="Location (optional)" />
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

            <WireframeBox label="Treatment History">
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

/* ─── Tab: Payment (Full Financial View) ─── */
function PaymentTab() {
    const depositHistory = [
        { date: "Mar 25", amount: "+$200", method: "Cash", note: "Initial deposit", balance: "$200" },
        { date: "Mar 28", amount: "-$50", method: "Used", note: "Applied to Crown Prep", balance: "$150" },
        { date: "Feb 10", amount: "+$300", method: "Bank", note: "Deposit for braces", balance: "$300" },
        { date: "Feb 15", amount: "-$300", method: "Used", note: "Applied to Braces", balance: "$0" },
    ];

    const paymentHistory = [
        { date: "Mar 28", service: "Crown Prep", amount: "$800", method: "Cash + Deposit ($50)", by: "Secretary Linh", receipt: "#2024-0342" },
        { date: "Feb 15", service: "X-Ray", amount: "$300", method: "Cash", by: "Secretary Linh", receipt: "#2024-0298" },
        { date: "Feb 10", service: "Braces Payment 5", amount: "$3,000", method: "Bank Transfer", by: "Secretary Mai", receipt: "#2024-0285" },
        { date: "Jan 20", service: "Cleaning", amount: "$380", method: "Cash", by: "Secretary Linh", receipt: "#2024-0241" },
    ];

    const unpaidServices = [
        { service: "Crown Prep (Mar 28)", total: "$2,000", paid: "$800", remaining: "$1,200" },
        { service: "Braces — Session 8/24 (Ongoing)", total: "$28,000", paid: "$15,000", remaining: "$13,000" },
    ];

    return (
        <div className="space-y-4">
            <WireframeRow>
                <WireframeStatCard label="Deposit Balance" value="$150" />
                <WireframeStatCard label="Total Billed" value="$4,800" />
                <WireframeStatCard label="Total Paid" value="$3,600" />
                <WireframeStatCard label="Outstanding" value="$1,200" />
            </WireframeRow>

            {/* Deposit Wallet */}
            <WireframeRow>
                <div className="flex-1">
                    <WireframeBox label="Deposit Wallet">
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1.5">
                            <div className="flex justify-between text-xs"><span className="text-gray-400">Total Deposited</span><span className="text-gray-700 font-medium">$500</span></div>
                            <div className="flex justify-between text-xs"><span className="text-gray-400">Total Used</span><span className="text-gray-700 font-medium">$350</span></div>
                            <div className="flex justify-between text-xs font-bold border-t border-gray-200 pt-1.5 mt-1"><span className="text-gray-500">Available Balance</span><span className="text-emerald-600 text-sm">$150</span></div>
                        </div>
                        <div className="space-y-2 mt-3">
                            <div className="text-xs font-bold text-gray-400">ADD DEPOSIT</div>
                            <WireframeRow>
                                <WireframeField label="Amount" />
                                <WireframeField label="Method (Cash/Bank)" />
                                <WireframeField label="Date" />
                            </WireframeRow>
                            <WireframeRow>
                                <WireframeField label="Note" />
                                <WireframeField label="Received By" />
                            </WireframeRow>
                            <WireframeRow>
                                <WireframeButton label="Add Deposit" primary />
                                <WireframeButton label="Refund Deposit" />
                            </WireframeRow>
                        </div>
                    </WireframeBox>
                </div>
                <div className="flex-1">
                    <WireframeBox label="Deposit History">
                        <div className="mt-2 space-y-1.5">
                            {depositHistory.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 rounded bg-gray-50 border border-gray-100 text-xs">
                                    <span className="text-gray-400 w-14">{d.date}</span>
                                    <span className={`font-medium w-14 ${d.amount.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>{d.amount}</span>
                                    <span className="text-gray-500 w-12">{d.method}</span>
                                    <span className="text-gray-400 flex-1">{d.note}</span>
                                    <span className="text-gray-600 font-medium">Bal: {d.balance}</span>
                                </div>
                            ))}
                        </div>
                    </WireframeBox>
                </div>
            </WireframeRow>

            {/* Pay Against Service */}
            <WireframeBox label="Pay Against a Service">
                <div className="space-y-3 mt-2">
                    <div className="text-xs font-bold text-gray-400">UNPAID SERVICES</div>
                    {unpaidServices.map((s, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">{s.service}</span>
                                <span className="text-xs text-red-500 font-medium">Remaining: {s.remaining}</span>
                            </div>
                            <div className="flex gap-3 text-xs text-gray-400 mb-3">
                                <span>Total: {s.total}</span>
                                <span>Paid: {s.paid}</span>
                            </div>
                            <div className="text-xs font-bold text-gray-400 mb-1.5">PAYMENT SOURCES (any combo, any amount)</div>
                            <WireframeRow>
                                <WireframeField label="Use Deposit ($)" />
                                <WireframeField label="Cash ($)" />
                                <WireframeField label="Bank Transfer ($)" />
                            </WireframeRow>
                            <div className="flex items-center justify-between mt-2">
                                <div className="p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700 flex-1 mr-3">Partial payment OK — does NOT need to total the full remaining</div>
                                <WireframeButton label="Process Payment" primary />
                            </div>
                        </div>
                    ))}
                </div>
            </WireframeBox>

            {/* Monthly Payment Plan */}
            <WireframeBox label="Monthly Payment Plan — Crown Prep ($1,200 outstanding)">
                <div className="space-y-2 mt-2">
                    <WireframeRow>
                        <WireframeField label="Outstanding Amount" />
                        <WireframeField label="Number of Months" />
                        <WireframeField label="Monthly Amount (auto)" />
                        <WireframeField label="Start Date" />
                        <WireframeField label="Due Day of Month" />
                    </WireframeRow>
                    <WireframeButton label="Create Monthly Plan" primary />
                    <div className="flex gap-2 mt-2">
                        {["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((m, i) => (
                            <div key={i} className={`flex-1 text-center p-2 rounded-lg text-xs border ${i < 1 ? "bg-emerald-50 border-emerald-200 text-emerald-600" : i === 1 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                                <div className="font-medium">{m}</div>
                                <div>$200</div>
                                <div className="mt-1">{i < 1 ? "Paid" : i === 1 ? "Due" : "Upcoming"}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </WireframeBox>

            {/* Payment History */}
            <WireframeBox label="Payment History">
                <div className="mt-2 space-y-1.5">
                    {paymentHistory.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                            <span className="text-gray-400 w-14">{p.date}</span>
                            <span className="text-gray-700 font-medium flex-1">{p.service}</span>
                            <span className="text-emerald-600 font-medium w-16">{p.amount}</span>
                            <span className="text-gray-500 flex-1">{p.method}</span>
                            <span className="text-gray-400">{p.by}</span>
                            <span className="text-gray-400 font-mono">{p.receipt}</span>
                        </div>
                    ))}
                </div>
            </WireframeBox>

            {/* Notification Placeholders */}
            <WireframeRow>
                <div className="flex-1"><WireframeBox label="SMS Notifications (P)" dashed><div className="text-xs text-gray-400 mt-1">Payment reminders, overdue notices, receipts</div></WireframeBox></div>
                <div className="flex-1"><WireframeBox label="Email Notifications (P)" dashed><div className="text-xs text-gray-400 mt-1">Receipts, monthly statements, due dates</div></WireframeBox></div>
            </WireframeRow>
        </div>
    );
}

/* ─── TAB DEFINITIONS ─── */
const CUSTOMER_TABS = [
    { id: "profile", label: "Profile", icon: "👤", component: ProfileTab },
    { id: "appointments", label: "Appointments", icon: "📅", component: AppointmentsTab },
    { id: "records", label: "Records", icon: "🦷", component: RecordsTab },
    { id: "payment", label: "Payment", icon: "💰", component: PaymentTab },
];

/* ─── MAIN LAYOUT ─── */
export function CustomersLayout() {
    const [activeTab, setActiveTab] = useState("profile");
    const ActiveComponent = CUSTOMER_TABS.find(t => t.id === activeTab)?.component || ProfileTab;

    return (
        <div className="space-y-4">
            {/* Step 1 — Find or Add Customer */}
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

            {/* Step 2 — Customer Detail with Tabs */}
            <WireframeBox label="Step 2 — Customer Detail (selected)">
                <div className="space-y-3 mt-2">
                    {/* Customer Header — always visible */}
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">TA</div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800">Tran Van A</div>
                            <div className="text-xs text-gray-500">0912-345-678 · Dong Da · Since Jan 2024</div>
                        </div>
                        <div className="flex gap-2">
                            <WireframeButton label="Edit" />
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200">
                        {CUSTOMER_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                                    activeTab === tab.id
                                        ? "border-blue-600 text-blue-700 bg-blue-50/50"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Active Tab Content */}
                    <div className="pt-2">
                        <ActiveComponent />
                    </div>
                </div>
            </WireframeBox>

            {/* Add New Customer Form (if creating new) */}
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
