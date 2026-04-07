import { useState } from "react";

/* ═══════════════════════════════════════════
   WIREFRAME UI PRIMITIVES
   ═══════════════════════════════════════════ */
function Box({ label, className = "", children, dashed = false }) {
  return (
    <div className={`rounded-lg border-2 ${dashed ? "border-dashed border-gray-300 bg-gray-50" : "border-gray-200 bg-white"} p-3 ${className}`}>
      <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
function Row({ children }) { return <div className="flex gap-3">{children}</div>; }
function Field({ label }) {
  return (
    <div className="flex-1">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="h-9 bg-gray-100 rounded-lg border border-gray-200"></div>
    </div>
  );
}
function Btn({ label, primary = false, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${primary ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"}`}>
      {label}
    </button>
  );
}
function Stat({ label, value, accent }) {
  const colors = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    default: "border-gray-200 bg-white",
  };
  return (
    <div className={`flex-1 rounded-xl p-4 border ${colors[accent] || colors.default}`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-700">{value}</div>
    </div>
  );
}
function Table({ columns, rows }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex bg-gray-50 border-b border-gray-200">
        {columns.map((col, i) => <div key={i} className="flex-1 px-3 py-2 text-xs font-medium text-gray-500">{col}</div>)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex border-b border-gray-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors">
          {columns.map((_, c) => <div key={c} className="flex-1 px-3 py-2.5"><div className="h-3 bg-gray-100 rounded w-3/4"></div></div>)}
        </div>
      ))}
    </div>
  );
}
function Badge({ text, color = "gray" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    gray: "bg-gray-100 text-gray-600",
    purple: "bg-purple-100 text-purple-700",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[color]}`}>{text}</span>;
}

/* ═══════════════════════════════════════════
   CUSTOMER TAB: PROFILE
   ═══════════════════════════════════════════ */
function ProfileTab() {
  return (
    <div className="space-y-4">
      <Box label="Personal Information">
        <div className="space-y-3 mt-2">
          <Row><Field label="Full Name" /><Field label="Phone" /><Field label="Email" /><Field label="DOB" /></Row>
          <Row><Field label="Gender" /><Field label="Address" /><Field label="Location (branch)" /><Field label="Referral Code" /></Row>
          <Row><Field label="Source" /><div className="flex-1"><Field label="Notes" /></div></Row>
          <div className="flex gap-2 pt-2"><Btn label="Save Changes" primary /><Btn label="Cancel" /></div>
        </div>
      </Box>

      <Box label="Photo Records">
        <div className="flex gap-2 mt-1">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-20 h-20 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-300">Photo {i}</span>
            </div>
          ))}
          <div className="w-20 h-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg cursor-pointer hover:bg-gray-100">+</div>
        </div>
      </Box>

      <Row>
        <Stat label="Deposit Balance" value="$150" accent="green" />
        <Stat label="Outstanding" value="$1,200" accent="red" />
        <Stat label="Total Visits" value="14" accent="blue" />
        <Stat label="Last Visit" value="Mar 28" />
      </Row>

      <Box label="Linked Employee">
        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200 mt-1">
          <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center text-purple-700 font-bold text-sm">DN</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">Dr. Nguyen</div>
            <div className="text-xs text-gray-400">Doctor · Dong Da Branch · Referral: REF-DN01</div>
          </div>
          <Badge text="Primary Doctor" color="purple" />
        </div>
      </Box>

      <Box label="Linked Location">
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 mt-1">
          <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">DD</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">Dong Da Branch</div>
            <div className="text-xs text-gray-400">123 Le Duan, Dong Da · 028-1234-5678 · 5 staff</div>
          </div>
          <Badge text="Home Branch" color="blue" />
        </div>
      </Box>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOMER TAB: APPOINTMENTS
   ═══════════════════════════════════════════ */
function AppointmentsTab() {
  const appointments = [
    { date: "Apr 12", time: "9:00", doctor: "Dr. Nguyen", assistants: ["Khanh Do", "Linh Pham"], service: "Crown Fitting", location: "Dong Da", status: "Upcoming", color: "blue" },
    { date: "Apr 20", time: "14:00", doctor: "Dr. Nguyen", assistants: ["Khanh Do"], service: "Follow-up Check", location: "Dong Da", status: "Upcoming", color: "blue" },
    { date: "May 5", time: "10:00", doctor: "Dr. Le", assistants: [], service: "Cleaning", location: "Go Vap", status: "Upcoming", color: "blue" },
    { date: "Mar 28", time: "9:30", doctor: "Dr. Nguyen", assistants: ["Khanh Do", "Linh Pham"], service: "Crown Prep", location: "Dong Da", status: "Completed", color: "green" },
    { date: "Mar 10", time: "11:00", doctor: "Dr. Nguyen", assistants: [], service: "Consultation", location: "Dong Da", status: "Completed", color: "green" },
    { date: "Feb 15", time: "14:00", doctor: "Dr. Tran", assistants: ["Mai Tran"], service: "X-Ray", location: "Dong Da", status: "Completed", color: "green" },
  ];
  return (
    <div className="space-y-4">
      <Row>
        <Stat label="Total Slips" value="14" accent="blue" />
        <Stat label="Upcoming" value="3" accent="amber" />
        <Stat label="Completed" value="11" accent="green" />
      </Row>

      <Box label="Create Appointment Slip">
        <div className="space-y-3 mt-2">
          <div className="p-2 bg-purple-50 rounded border border-purple-200 text-xs text-purple-600">Each appointment is a slip — create as many as needed. Attach a doctor and up to 3 assistants per slip.</div>
          <Row><Field label="Date" /><Field label="Time" /><Field label="Duration (est.)" /></Row>
          <Row><Field label="Type (Consultation / Service / Follow-up)" /><Field label="Location (optional)" /><Field label="Color Label" /></Row>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
            <div className="text-xs font-bold text-blue-700">Staff Attached to This Slip</div>
            <Row><Field label="Doctor (optional)" /></Row>
            <Row>
              <Field label="Assistant 1 (optional)" />
              <Field label="Assistant 2 (optional)" />
              <Field label="Assistant 3 (optional)" />
            </Row>
          </div>
          <Row><div className="flex-1"><Field label="Notes" /></div></Row>
          <Btn label="Create Appointment Slip" primary />
        </div>
      </Box>

      <Box label="Today's Check-in" dashed>
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">9:00 AM — Crown Fitting with Dr. Nguyen</div>
            <div className="text-xs text-gray-400">Dong Da · Khanh Do, Linh Pham assisting · Scheduled</div>
          </div>
          <Btn label="Mark as Arrived" primary />
          <Btn label="Convert to Service Slip" />
        </div>
      </Box>

      <Box label="Appointment Slips">
        <div className="space-y-2 mt-2">
          {appointments.map((a, i) => (
            <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 w-16">{a.date}</span>
                <span className="text-xs font-mono text-gray-400 w-12">{a.time}</span>
                <span className="text-xs text-gray-600 flex-1">{a.service}</span>
                <span className="text-xs text-gray-400">{a.location}</span>
                <Badge text={a.status} color={a.color} />
                {a.status === "Completed" && <span className="text-xs text-blue-500 cursor-pointer hover:underline">View Record</span>}
                {a.status === "Upcoming" && <span className="text-xs text-amber-500 cursor-pointer hover:underline">Reschedule</span>}
              </div>
              <div className="flex items-center gap-2 mt-1.5 pl-16">
                <span className="text-xs text-blue-600 font-medium">{a.doctor}</span>
                {a.assistants.length > 0 && (
                  <>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-400">Assistants: {a.assistants.join(", ")}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOMER TAB: RECORDS
   ═══════════════════════════════════════════ */
function RecordsTab() {
  const services = [
    { date: "Mar 28", service: "Crown Prep", doctor: "Dr. Nguyen", assistants: ["Khanh Do", "Linh Pham"], amount: "$2,000", paid: "$800", status: "Awaiting Payment", sessions: "1/1", color: "amber" },
    { date: "Mar 10", service: "Consultation", doctor: "Dr. Nguyen", assistants: [], amount: "$0", paid: "$0", status: "Completed", sessions: "1/1", color: "green" },
    { date: "Feb 15", service: "X-Ray (Full Mouth)", doctor: "Dr. Tran", assistants: ["Mai Tran"], amount: "$300", paid: "$300", status: "Paid", sessions: "1/1", color: "green" },
    { date: "Jan 20", service: "Cleaning", doctor: "Dr. Le", assistants: [], amount: "$380", paid: "$380", status: "Paid", sessions: "1/1", color: "green" },
    { date: "Ongoing", service: "Braces Adjustment", doctor: "Dr. Tran", assistants: ["Khanh Do", "Linh Pham", "Mai Tran"], amount: "$28,000", paid: "$15,000", status: "In Progress", sessions: "8/24", color: "blue" },
  ];
  return (
    <div className="space-y-4">
      <Row>
        <Stat label="Total Slips" value="8" accent="blue" />
        <Stat label="In Progress" value="2" accent="amber" />
        <Stat label="Total Billed" value="$4,800" accent="green" />
      </Row>

      <Box label="Create Service Slip">
        <div className="space-y-3 mt-2">
          <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-600">Each service is a slip — create as many as needed. Attach a doctor and up to 3 assistants per slip.</div>
          <Row><Field label="Service Type (from catalog)" /><Field label="Linked Appointment (optional)" /></Row>
          <Row><Field label="Location (optional)" /></Row>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
            <div className="text-xs font-bold text-blue-700">Staff Attached to This Slip</div>
            <Row><Field label="Doctor (optional)" /></Row>
            <Row>
              <Field label="Assistant 1 (optional)" />
              <Field label="Assistant 2 (optional)" />
              <Field label="Assistant 3 (optional)" />
            </Row>
          </div>
          <Row><Field label="Unit Price" /><Field label="Quantity" /><Field label="Discount" /><Field label="Total" /></Row>
          <Row><div className="flex-1"><Field label="Prescription / Notes" /></div></Row>
          <Row><Field label="Status" /><Field label="Sessions Total (if multi-visit)" /><Field label="Sessions Completed" /></Row>
          <Btn label="Create Service Slip" primary />
        </div>
      </Box>

      <Box label="Service Slips">
        <div className="space-y-2 mt-2">
          {services.map((s, i) => (
            <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-500 w-16">{s.date}</span>
                <span className="text-sm font-medium text-gray-700 flex-1">{s.service}</span>
                <span className="text-xs text-gray-500">Sessions: {s.sessions}</span>
                <span className="text-xs text-gray-600 font-medium">{s.amount}</span>
                <span className="text-xs text-gray-400">Paid: {s.paid}</span>
                <Badge text={s.status} color={s.color} />
              </div>
              <div className="flex items-center gap-2 mt-1.5 pl-16">
                <span className="text-xs text-blue-600 font-medium">{s.doctor}</span>
                {s.assistants.length > 0 && (
                  <>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs text-gray-400">Assistants: {s.assistants.join(", ")}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Box>

      <Box label="Multi-visit Tracker — Braces Adjustment" dashed>
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
              <div key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs ${i < 8 ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>{i + 1}</div>
            ))}
          </div>
        </div>
      </Box>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOMER TAB: PAYMENT
   ═══════════════════════════════════════════ */
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
      <Row>
        <Stat label="Deposit Balance" value="$150" accent="green" />
        <Stat label="Total Billed" value="$4,800" accent="blue" />
        <Stat label="Total Paid" value="$3,600" accent="green" />
        <Stat label="Outstanding" value="$1,200" accent="red" />
      </Row>

      <Row>
        <div className="flex-1">
          <Box label="Deposit Wallet">
            <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-gray-400">Total Deposited</span><span className="text-gray-700 font-medium">$500</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Total Used</span><span className="text-gray-700 font-medium">$350</span></div>
              <div className="flex justify-between text-xs font-bold border-t border-gray-200 pt-1.5 mt-1"><span className="text-gray-500">Available Balance</span><span className="text-emerald-600 text-sm">$150</span></div>
            </div>
            <div className="space-y-2 mt-3">
              <div className="text-xs font-bold text-gray-400">ADD DEPOSIT</div>
              <Row><Field label="Amount" /><Field label="Method" /><Field label="Date" /></Row>
              <Row><Field label="Note" /><Field label="Received By" /></Row>
              <Row><Btn label="Add Deposit" primary /><Btn label="Refund Deposit" /></Row>
            </div>
          </Box>
        </div>
        <div className="flex-1">
          <Box label="Deposit History">
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
          </Box>
        </div>
      </Row>

      <Box label="Pay Against a Service">
        <div className="space-y-3 mt-2">
          <div className="text-xs font-bold text-gray-400">UNPAID SERVICES</div>
          {unpaidServices.map((s, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{s.service}</span>
                <span className="text-xs text-red-500 font-medium">Remaining: {s.remaining}</span>
              </div>
              <div className="flex gap-3 text-xs text-gray-400 mb-3"><span>Total: {s.total}</span><span>Paid: {s.paid}</span></div>
              <div className="text-xs font-bold text-gray-400 mb-1.5">PAYMENT SOURCES (any combo, any amount)</div>
              <Row><Field label="Use Deposit ($)" /><Field label="Cash ($)" /><Field label="Bank Transfer ($)" /></Row>
              <div className="flex items-center justify-between mt-2">
                <div className="p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700 flex-1 mr-3">Partial payment OK</div>
                <Btn label="Process Payment" primary />
              </div>
            </div>
          ))}
        </div>
      </Box>

      <Box label="Monthly Payment Plan — Crown Prep ($1,200 outstanding)">
        <div className="space-y-2 mt-2">
          <Row><Field label="Outstanding Amount" /><Field label="Number of Months" /><Field label="Monthly Amount (auto)" /><Field label="Start Date" /><Field label="Due Day" /></Row>
          <Btn label="Create Monthly Plan" primary />
          <div className="flex gap-2 mt-2">
            {["Apr","May","Jun","Jul","Aug","Sep"].map((m, i) => (
              <div key={i} className={`flex-1 text-center p-2 rounded-lg text-xs border ${i < 1 ? "bg-emerald-50 border-emerald-200 text-emerald-600" : i === 1 ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                <div className="font-medium">{m}</div><div>$200</div><div className="mt-1">{i < 1 ? "Paid" : i === 1 ? "Due" : "Upcoming"}</div>
              </div>
            ))}
          </div>
        </div>
      </Box>

      <Box label="Payment History">
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
      </Box>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EMPLOYEES PAGE — 3 TIER TABS
   ═══════════════════════════════════════════ */

/* ─── Employee Card (reusable) ─── */
function EmployeeCard({ emp, isSelected, onClick }) {
  const avatarColors = {
    "General Manager": "bg-amber-200 text-amber-700",
    "Branch Manager": "bg-purple-200 text-purple-700",
    "Marketing Manager": "bg-purple-200 text-purple-700",
    "Doctor": "bg-blue-200 text-blue-700",
    "Doctor's Assistant": "bg-cyan-200 text-cyan-700",
    "Secretary": "bg-gray-200 text-gray-600",
    "Sales": "bg-emerald-200 text-emerald-700",
    "Online Sales": "bg-teal-200 text-teal-700",
    "Customer Care": "bg-pink-200 text-pink-700",
  };
  const roleColors = {
    "General Manager": "amber",
    "Branch Manager": "purple",
    "Marketing Manager": "purple",
    "Doctor": "blue",
    "Doctor's Assistant": "blue",
    "Secretary": "gray",
    "Sales": "green",
    "Online Sales": "green",
    "Customer Care": "red",
  };
  return (
    <div onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-gray-50 border-gray-100 hover:bg-gray-100"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${avatarColors[emp.role] || "bg-gray-200 text-gray-600"}`}>{emp.initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700">{emp.name}</div>
        <div className="text-xs text-gray-400">{emp.phone}</div>
      </div>
      <Badge text={emp.role} color={roleColors[emp.role] || "gray"} />
      <span className="text-xs text-gray-400">{emp.location}</span>
      <span className="text-xs font-mono text-gray-400">{emp.ref}</span>
      {emp.clients > 0 && <span className="text-xs text-blue-500">{emp.clients} clients</span>}
      <Badge text={emp.status} color={emp.status === "Active" ? "green" : "gray"} />
    </div>
  );
}

/* ─── Employee Detail Panel (reusable) ─── */
function EmployeeDetail({ emp, tier }) {
  return (
    <Box label={`${tier} Profile — ${emp.name}`}>
      <div className="space-y-3 mt-2">
        <Row><Field label="Full Name" /><Field label="Phone" /><Field label="Email" /></Row>
        <Row><Field label="Role(s)" /><Field label="Referral Code" /><Field label="Status" /></Row>
        <Row><Field label="Location(s)" /><Field label="Date Joined" /></Row>

        {/* Permissions summary for this tier */}
        <Box label={`${tier} Permissions`} dashed>
          <div className="mt-1 space-y-1.5">
            {tier === "Admin" && (
              <>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-gray-600">Full access to all pages, all locations, all data</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-gray-600">Can create/edit/delete Managers and Staff</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-gray-600">Can process refunds, manage payment plans, view reports</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-gray-600">Can configure settings, permissions, and relationships</span></div>
              </>
            )}
            {tier === "Manager" && (
              <>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-gray-600">Full access within assigned location(s)</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-gray-600">Can edit Staff at own location</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span className="text-gray-600">Can process payments but NOT refunds</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-red-400"></span><span className="text-gray-600">No access to settings or system configuration</span></div>
              </>
            )}
            {tier === "Staff" && (
              <>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><span className="text-gray-600">View own schedule, own clients, own records</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span className="text-gray-600">Can create appointments and service records</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span className="text-gray-600">Can process payments (no refunds, no plans)</span></div>
                <div className="flex items-center gap-2 text-xs"><span className="w-2 h-2 rounded-full bg-red-400"></span><span className="text-gray-600">No access to reports, settings, other employees</span></div>
              </>
            )}
          </div>
        </Box>

        {/* Linked relationships */}
        <Box label="Linked Relationships" dashed>
          <div className="space-y-2 mt-1">
            {emp.role === "Doctor" && (
              <div className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200">
                <span className="text-xs text-gray-400 w-24">Assistant:</span>
                <span className="text-sm text-gray-700">Linh Pham (Secretary)</span>
                <Badge text="Dong Da" color="blue" />
              </div>
            )}
            {emp.clients > 0 && (
              <div className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200">
                <span className="text-xs text-gray-400 w-24">Clients:</span>
                <span className="text-sm text-gray-700">{emp.clients} referred customers</span>
                <span className="text-xs text-blue-500 cursor-pointer hover:underline">View all →</span>
              </div>
            )}
            <div className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200">
              <span className="text-xs text-gray-400 w-24">Location:</span>
              <span className="text-sm text-gray-700">{emp.location} {emp.location === "All" ? "Locations" : "Branch"}</span>
              {emp.location !== "All" && <span className="text-xs text-blue-500 cursor-pointer hover:underline">View branch →</span>}
            </div>
          </div>
        </Box>

        {/* Schedule */}
        <Box label="Schedule & Availability" dashed>
          <div className="flex gap-2 mt-1">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
              <div key={i} className={`flex-1 text-center p-2 rounded-lg text-xs border ${i < 6 ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                <div className="font-medium">{d}</div>
                <div className="mt-1">{i < 6 ? "8-17" : "Off"}</div>
              </div>
            ))}
          </div>
        </Box>

        <div className="flex gap-2 pt-2"><Btn label="Save Changes" primary /><Btn label="Cancel" /></div>
      </div>
    </Box>
  );
}

/* ─── Admin Tab ─── */
function AdminTab() {
  const admins = [
    { name: "Tam Le", initials: "TL", phone: "0902-444-555", role: "General Manager", location: "All", ref: "REF-TL00", status: "Active", clients: 0 },
  ];
  const [selected, setSelected] = useState(null);
  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
        <div className="text-xs font-medium text-amber-700">Admin tier has full system access — all pages, all locations, all data. Can manage Managers and Staff.</div>
      </div>
      <Row><Stat label="Total Admins" value={String(admins.length)} accent="amber" /></Row>
      <Box label="Admins">
        <div className="space-y-2 mt-2">
          {admins.map((emp, i) => (
            <EmployeeCard key={i} emp={emp} isSelected={selected === i} onClick={() => setSelected(selected === i ? null : i)} />
          ))}
        </div>
      </Box>
      {selected !== null && <EmployeeDetail emp={admins[selected]} tier="Admin" />}
      <Box label="Add New Admin" dashed>
        <div className="space-y-3 mt-2">
          <Row><Field label="Full Name *" /><Field label="Phone *" /><Field label="Email" /></Row>
          <Row><Field label="Role *" /><Field label="Referral Code (auto)" /><Field label="Status" /></Row>
          <Btn label="Create Admin" primary />
        </div>
      </Box>
    </div>
  );
}

/* ─── Managers Tab ─── */
function ManagersTab() {
  const managers = [
    { name: "Hoa Nguyen", initials: "HN", phone: "0902-111-333", role: "Branch Manager", location: "Dong Da", ref: "REF-HN06", status: "Active", clients: 0 },
    { name: "Minh Vu", initials: "MV", phone: "0902-222-444", role: "Branch Manager", location: "Go Vap", ref: "REF-MV07", status: "Active", clients: 0 },
    { name: "Lan Pham", initials: "LA", phone: "0902-333-555", role: "Marketing Manager", location: "All", ref: "REF-LA08", status: "Active", clients: 0 },
  ];
  const [selected, setSelected] = useState(null);
  return (
    <div className="space-y-4">
      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div className="text-xs font-medium text-purple-700">Manager tier has full access within their assigned location(s). Can edit Staff but not other Managers or Admins.</div>
      </div>
      <Row>
        <Stat label="Total Managers" value={String(managers.length)} accent="purple" />
        <Stat label="Branch Managers" value="2" />
        <Stat label="Marketing" value="1" />
      </Row>
      <Box label="Managers">
        <div className="flex gap-3 mt-2 mb-3">
          <div className="flex-1 h-9 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
            <span className="text-gray-400 text-xs">🔍 Search managers...</span>
          </div>
          <Btn label="+ New Manager" primary />
        </div>
        <div className="space-y-2">
          {managers.map((emp, i) => (
            <EmployeeCard key={i} emp={emp} isSelected={selected === i} onClick={() => setSelected(selected === i ? null : i)} />
          ))}
        </div>
      </Box>
      {selected !== null && <EmployeeDetail emp={managers[selected]} tier="Manager" />}
      <Box label="Add New Manager" dashed>
        <div className="space-y-3 mt-2">
          <Row><Field label="Full Name *" /><Field label="Phone *" /><Field label="Email" /></Row>
          <Row><Field label="Role * (Branch Manager / Marketing)" /><Field label="Location(s) *" /><Field label="Referral Code (auto)" /></Row>
          <Row><Field label="Status" /></Row>
          <Btn label="Create Manager" primary />
        </div>
      </Box>
    </div>
  );
}

/* ─── Staff Tab ─── */
function StaffTab() {
  const staff = [
    { name: "Dr. Nguyen Van B", initials: "NB", phone: "0901-111-222", role: "Doctor", location: "Dong Da", ref: "REF-DN01", status: "Active", clients: 42 },
    { name: "Dr. Tran Thi C", initials: "TC", phone: "0901-333-444", role: "Doctor", location: "Go Vap", ref: "REF-TC02", status: "Active", clients: 38 },
    { name: "Dr. Le Van D", initials: "LD", phone: "0901-555-666", role: "Doctor", location: "Dong Da", ref: "REF-LD03", status: "Active", clients: 25 },
    { name: "Linh Pham", initials: "LP", phone: "0901-777-888", role: "Secretary", location: "Dong Da", ref: "REF-LP04", status: "Active", clients: 0 },
    { name: "Mai Tran", initials: "MT", phone: "0901-999-000", role: "Secretary", location: "Go Vap", ref: "REF-MT05", status: "Active", clients: 0 },
    { name: "Khanh Do", initials: "KD", phone: "0903-111-222", role: "Doctor's Assistant", location: "Dong Da", ref: "REF-KD09", status: "Active", clients: 0 },
    { name: "Tung Bui", initials: "TB", phone: "0903-333-444", role: "Sales", location: "All", ref: "REF-TB10", status: "Active", clients: 15 },
    { name: "Nga Le", initials: "NL", phone: "0903-555-666", role: "Online Sales", location: "All", ref: "REF-NL11", status: "Active", clients: 22 },
    { name: "Huong Vo", initials: "HV", phone: "0903-777-888", role: "Customer Care", location: "All", ref: "REF-HV12", status: "Active", clients: 0 },
  ];
  const [selected, setSelected] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const roles = ["all", "Doctor", "Doctor's Assistant", "Secretary", "Sales", "Online Sales", "Customer Care"];
  const filtered = roleFilter === "all" ? staff : staff.filter(s => s.role === roleFilter);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-xs font-medium text-blue-700">Staff tier can view own schedule, own clients, own records. Can create appointments and process payments. No access to reports or settings.</div>
      </div>
      <Row>
        <Stat label="Total Staff" value={String(staff.length)} accent="blue" />
        <Stat label="Doctors" value="3" accent="green" />
        <Stat label="Assistants" value="1" />
        <Stat label="Other Roles" value="5" />
      </Row>
      <Box label="Staff Directory">
        <div className="flex gap-3 mt-2 mb-3">
          <div className="flex-1 h-9 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
            <span className="text-gray-400 text-xs">🔍 Search staff...</span>
          </div>
          <Btn label="+ New Staff" primary />
        </div>
        {/* Role filter pills */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {roles.map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setSelected(null); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                roleFilter === r ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}>
              {r === "all" ? "All Roles" : r}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {filtered.map((emp, i) => (
            <EmployeeCard key={i} emp={emp} isSelected={selected === i} onClick={() => setSelected(selected === i ? null : i)} />
          ))}
          {filtered.length === 0 && <div className="text-xs text-gray-400 text-center py-4">No staff with this role</div>}
        </div>
      </Box>
      {selected !== null && filtered[selected] && <EmployeeDetail emp={filtered[selected]} tier="Staff" />}
      <Box label="Add New Staff Member" dashed>
        <div className="space-y-3 mt-2">
          <Row><Field label="Full Name *" /><Field label="Phone *" /><Field label="Email" /></Row>
          <Row><Field label="Role(s) *" /><Field label="Location(s)" /><Field label="Referral Code (auto)" /></Row>
          <Row><Field label="Linked Doctor (if Assistant)" /><Field label="Status" /></Row>
          <Btn label="Create Staff Member" primary />
        </div>
      </Box>
    </div>
  );
}

/* ─── Employees Page (wrapper with tabs) ─── */
const EMPLOYEE_TABS = [
  { id: "admin", label: "Admin", icon: "👑", component: AdminTab, accent: "amber" },
  { id: "managers", label: "Managers", icon: "📋", component: ManagersTab, accent: "purple" },
  { id: "staff", label: "Staff", icon: "🏥", component: StaffTab, accent: "blue" },
];

function EmployeesPage() {
  const [activeEmpTab, setActiveEmpTab] = useState("staff");
  const ActiveEmpComponent = EMPLOYEE_TABS.find(t => t.id === activeEmpTab)?.component || StaffTab;

  return (
    <div className="space-y-4">
      <Row>
        <Stat label="Total Employees" value="13" accent="blue" />
        <Stat label="Admins" value="1" accent="amber" />
        <Stat label="Managers" value="3" accent="purple" />
        <Stat label="Staff" value="9" />
      </Row>

      {/* Tier Tabs */}
      <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex border-b border-gray-200 bg-white px-2">
          {EMPLOYEE_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveEmpTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeEmpTab === tab.id ? "border-blue-600 text-blue-700" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}>
              <span className="text-base">{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="p-5 bg-gray-50/50">
          <ActiveEmpComponent />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOCATIONS PAGE
   ═══════════════════════════════════════════ */
function LocationsPage() {
  const locations = [
    { name: "Dong Da Branch (Main)", code: "DD", address: "123 Le Duan, Dong Da", phone: "028-1234-5678", staff: 4, clients: 156, revenue: "$45,200", status: "Active" },
    { name: "Go Vap Branch", code: "GV", address: "456 Quang Trung, Go Vap", phone: "028-2345-6789", staff: 3, clients: 98, revenue: "$28,100", status: "Active" },
    { name: "Thu Duc Branch", code: "TD", address: "789 Vo Van Ngan, Thu Duc", phone: "028-3456-7890", staff: 2, clients: 67, revenue: "$19,800", status: "Active" },
    { name: "Binh Thanh Branch", code: "BT", address: "321 Xo Viet Nghe Tinh, Binh Thanh", phone: "028-4567-8901", staff: 2, clients: 45, revenue: "$12,500", status: "Active" },
    { name: "Tan Binh Branch", code: "TB", address: "654 Cong Hoa, Tan Binh", phone: "028-5678-9012", staff: 0, clients: 0, revenue: "$0", status: "Opening Soon" },
  ];

  const [selectedLoc, setSelectedLoc] = useState(null);

  return (
    <div className="space-y-4">
      <Row>
        <Stat label="Total Locations" value="5" accent="blue" />
        <Stat label="Active" value="4" accent="green" />
        <Stat label="Total Staff" value="11" />
        <Stat label="Total Clients" value="366" />
      </Row>

      <Box label="Branches">
        <div className="flex gap-3 mt-2 mb-3">
          <div className="flex-1 h-9 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
            <span className="text-gray-400 text-xs">🔍 Search branches...</span>
          </div>
          <Btn label="+ New Location" primary />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {locations.map((loc, i) => (
            <div key={i} onClick={() => setSelectedLoc(selectedLoc === i ? null : i)}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedLoc === i ? "bg-blue-50 border-blue-300 shadow-sm" : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm">{loc.code}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">{loc.name}</div>
                  <div className="text-xs text-gray-400">{loc.address}</div>
                </div>
                <Badge text={loc.status} color={loc.status === "Active" ? "green" : "amber"} />
              </div>
              <div className="flex gap-4 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
                <span>👥 {loc.staff} staff</span>
                <span>👤 {loc.clients} clients</span>
                <span>💰 {loc.revenue}/mo</span>
                <span>📞 {loc.phone}</span>
              </div>
            </div>
          ))}
        </div>
      </Box>

      {selectedLoc !== null && (
        <>
          <Box label={`Location Detail — ${locations[selectedLoc].name}`}>
            <div className="space-y-3 mt-2">
              <Row><Field label="Branch Name" /><Field label="Address" /><Field label="Phone" /></Row>
              <Row><Field label="Email" /><Field label="Operating Hours" /><Field label="Status" /></Row>
              <div className="flex gap-2 pt-2"><Btn label="Save Changes" primary /><Btn label="Cancel" /></div>
            </div>
          </Box>

          <Box label={`Staff at ${locations[selectedLoc].name}`}>
            <div className="space-y-2 mt-2">
              {[
                { name: "Dr. Nguyen Van B", role: "Doctor", ref: "REF-DN01", clients: 42 },
                { name: "Linh Pham", role: "Secretary", ref: "REF-LP04", clients: 0 },
                { name: "Hoa Nguyen", role: "Branch Manager", ref: "REF-HN06", clients: 0 },
              ].slice(0, locations[selectedLoc].staff > 3 ? 3 : locations[selectedLoc].staff).map((emp, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">{emp.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                  <span className="text-sm text-gray-700 flex-1">{emp.name}</span>
                  <Badge text={emp.role} color={emp.role === "Doctor" ? "blue" : emp.role === "Branch Manager" ? "purple" : "gray"} />
                  <span className="text-xs font-mono text-gray-400">{emp.ref}</span>
                  {emp.clients > 0 && <span className="text-xs text-blue-500">{emp.clients} clients</span>}
                </div>
              ))}
              <Btn label="+ Assign Employee to this Branch" />
            </div>
          </Box>

          <Box label={`Recent Clients at ${locations[selectedLoc].name}`} dashed>
            <div className="space-y-2 mt-2">
              {["Tran Van A", "Nguyen Thi B", "Le Van C"].map((name, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-white border border-gray-200">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-xs">{name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                  <span className="text-sm text-gray-700 flex-1">{name}</span>
                  <span className="text-xs text-gray-400">Last visit: Mar {28 - i * 5}</span>
                  <span className="text-xs text-blue-500 cursor-pointer hover:underline">Open profile →</span>
                </div>
              ))}
              <span className="text-xs text-gray-400">Showing 3 of {locations[selectedLoc].clients} clients</span>
            </div>
          </Box>
        </>
      )}

      <Box label="Add New Location" dashed>
        <div className="space-y-3 mt-2">
          <Row><Field label="Branch Name *" /><Field label="Address *" /><Field label="Phone" /></Row>
          <Row><Field label="Email" /><Field label="Operating Hours" /><Field label="Status" /></Row>
          <Btn label="Create Location" primary />
        </div>
      </Box>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOGIC FLOW — CUSTOMER
   Internal reference only. NOT a frontend page.
   ═══════════════════════════════════════════ */
/* ─── Flow step components ─── */
function FlowStep({ number, title, description, color = "blue" }) {
  const colors = {
    blue: "bg-blue-600", green: "bg-emerald-600", amber: "bg-amber-500",
    purple: "bg-purple-600", red: "bg-red-500", gray: "bg-gray-500",
  };
  return (
    <div className="flex gap-3 items-start">
      <div className={`w-8 h-8 ${colors[color]} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5`}>{number}</div>
      <div className="flex-1">
        <div className="text-sm font-bold text-gray-700">{title}</div>
        <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</div>
      </div>
    </div>
  );
}
function FlowArrow({ label }) {
  return (
    <div className="flex items-center gap-2 pl-3 py-1">
      <div className="w-0.5 h-6 bg-gray-300 ml-3.5"></div>
      {label && <span className="text-xs text-gray-400 italic ml-2">{label}</span>}
    </div>
  );
}
function FlowBranch({ label, options }) {
  return (
    <div className="ml-11 p-3 bg-amber-50 rounded-lg border border-amber-200">
      <div className="text-xs font-bold text-amber-700 mb-2">⑂ DECISION: {label}</div>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xs text-amber-500 mt-0.5">→</span>
            <div>
              <span className="text-xs font-medium text-gray-700">{opt.choice}:</span>
              <span className="text-xs text-gray-500 ml-1">{opt.result}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function FlowNote({ text, color = "blue" }) {
  const colors = { blue: "bg-blue-50 border-blue-200 text-blue-700", gray: "bg-gray-50 border-gray-200 text-gray-600", red: "bg-red-50 border-red-200 text-red-600", green: "bg-emerald-50 border-emerald-200 text-emerald-700" };
  return <div className={`ml-11 p-2 rounded border text-xs ${colors[color]}`}>{text}</div>;
}
function OpenQuestion({ text }) {
  return (
    <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
      <span className="text-yellow-500 text-sm">❓</span>
      <span className="text-xs text-yellow-700">{text}</span>
    </div>
  );
}

function LogicFlowCustomerPage() {
  return (
    <div className="space-y-6">
      {/* Giant warning banner */}
      <div className="p-6 bg-red-100 border-4 border-red-500 rounded-xl">
        <div className="text-center">
          <div className="text-4xl font-black text-red-600 mb-2">⚠️ DO NOT BUILD THIS IN THE FRONTEND ⚠️</div>
          <div className="text-lg font-bold text-red-500">This page is for internal reference ONLY — to map out the logic and flow of the system.</div>
          <div className="text-sm text-red-400 mt-2">Use this to understand how pages, data, and actions connect before writing any code.</div>
        </div>
      </div>

      {/* ═══ CORE CONCEPT: SLIPS ═══ */}
      <Box label="Core Concept — Slips">
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
            <div className="text-sm font-bold text-blue-800 mb-2">Appointments and Services are SLIPS</div>
            <div className="text-xs text-blue-700 leading-relaxed">Think of each appointment and each service as a paper slip / card that gets attached to a customer. You can create as many slips as you want — stack them up. Each slip is independent. Each slip has optional fields you can fill in or leave blank.</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Appointment Slip */}
            <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
              <div className="text-xs font-bold text-purple-700 mb-2">📅 APPOINTMENT SLIP</div>
              <div className="space-y-1 text-xs text-purple-600">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Date & Time</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Location (optional)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Type (Consultation / Service / Follow-up)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> <strong>Doctor</strong> (optional — attach 1 doctor)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> <strong>Doctor's Assistant(s)</strong> (optional — up to 3)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Notes</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Status (Scheduled / Arrived / Completed)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Color Label</div>
              </div>
              <div className="mt-2 pt-2 border-t border-purple-200 text-xs text-purple-500 italic">Create as many as needed. Each is its own slip.</div>
            </div>

            {/* Service Slip */}
            <div className="p-4 bg-emerald-50 rounded-lg border-2 border-emerald-300">
              <div className="text-xs font-bold text-emerald-700 mb-2">🦷 SERVICE SLIP (Record)</div>
              <div className="space-y-1 text-xs text-emerald-600">
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Service Type (from catalog)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Location (optional)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> <strong>Doctor</strong> (optional — attach 1 doctor)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> <strong>Doctor's Assistant(s)</strong> (optional — up to 3)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Linked Appointment (optional)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Pricing (Unit Price, Qty, Discount, Total)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Prescription / Notes</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Sessions (if multi-visit: total / completed)</div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Status (In Progress / Completed / Paid)</div>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-200 text-xs text-emerald-500 italic">Create as many as needed. Each is its own slip.</div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs font-bold text-gray-600 mb-1">Key points about slips:</div>
            <div className="space-y-1 text-xs text-gray-500">
              <div>• A customer can have unlimited appointment slips and unlimited service slips</div>
              <div>• Each slip can have 1 doctor and up to 3 doctor's assistants attached</div>
              <div>• Doctor and assistants are per-slip — different slips can have different staff</div>
              <div>• An appointment slip can optionally link to a service slip (but doesn't have to)</div>
              <div>• A service slip can exist without an appointment (walk-in)</div>
              <div>• Payment is against a service slip — not an appointment slip</div>
            </div>
          </div>
        </div>
      </Box>

      {/* ═══ STEP 1: CUSTOMER CREATION ═══ */}
      <Box label="Step 1 — Customer Creation">
        <div className="space-y-2">
          <FlowStep number="1" title="Add New Customer" color="blue"
            description="Staff/Manager/Admin creates a new customer profile. Required: Name, Phone. Optional: Email, DOB, Gender, Address, Source, Notes, Referral Code." />
          <FlowArrow />
          <FlowStep number="2" title="Attach Location (Branch)" color="blue"
            description="Assign the customer to a branch location. This is their 'home branch' — determines which staff see this customer by default." />
          <FlowNote text="The customer does NOT get a doctor assigned yet. Doctor is only linked when an appointment or service is created." />
          <FlowArrow />
          <FlowStep number="3" title="Customer Profile is Live" color="green"
            description="Customer now exists in the system with personal info + location. No appointments, no services, no payments yet. Ready for next step." />
        </div>
      </Box>

      {/* ═══ STEP 2: WHAT HAPPENS NEXT — THE BIG DECISION ═══ */}
      <Box label="Step 2 — What Happens Next? (No forced order)">
        <div className="space-y-2">
          <FlowNote text="After a customer is created, ANY of these can happen first. There is no required sequence. A walk-in can go straight to a service. A phone inquiry can book an appointment. A returning customer can just leave a deposit. All paths are valid." color="red" />
          <FlowArrow />

          <FlowBranch label="What does the customer need right now?" options={[
            { choice: "Path A — Book an Appointment", result: "Go to Step 3A. Could be a consultation, follow-up, or a service appointment. Doctor gets linked here." },
            { choice: "Path B — Create a Service directly (walk-in)", result: "Go to Step 3B. No appointment needed. Customer walks in, gets treated, service record is created on the spot." },
            { choice: "Path C — Leave a Deposit only", result: "Go to Step 3C. No appointment, no service yet. Customer just wants to put money down for future use." },
            { choice: "Path D — Just a profile for now", result: "Customer is in the system but takes no action yet. They can come back anytime and enter any path." },
          ]} />

          <FlowNote text="These paths can also overlap. A customer can book an appointment (Path A), show up, get a service (Path B logic), and leave a deposit for next time (Path C) — all in one visit." />
        </div>
      </Box>

      {/* ═══ PATH A: APPOINTMENT ═══ */}
      <Box label="Path A — Appointment">
        <div className="space-y-2">
          <FlowStep number="A1" title="Create Appointment" color="purple"
            description="Open customer profile → Appointments tab → Create. Select: Date, Time, Doctor (doctor gets linked at the appointment level), Location, Service Type (optional — could be consultation or a specific service)." />
          <FlowNote text="The doctor-customer relationship lives on the appointment, not the customer profile. A customer can see different doctors each visit." />
          <FlowArrow label="Customer arrives..." />
          <FlowStep number="A2" title="Check-in" color="purple"
            description="Staff marks customer as 'Arrived'. Wait timer starts. Doctor sees the patient." />
          <FlowArrow label="After the visit..." />

          <FlowBranch label="What happens after the appointment?" options={[
            { choice: "Treatment was performed", result: "Create a Service Record → Go to Step 4 (Service Record). Can 'Convert to Record' from the appointment or create standalone." },
            { choice: "Consultation only — customer will come back", result: "Appointment marked 'Completed'. Customer may book another appointment later or walk in." },
            { choice: "Consultation only — customer wants to deposit", result: "Appointment marked 'Completed' → Go to Path C (Deposit)." },
            { choice: "Customer declines everything", result: "Appointment marked 'Completed'. No service, no deposit. Customer can return anytime." },
          ]} />
        </div>
      </Box>

      {/* ═══ PATH B: WALK-IN / DIRECT SERVICE ═══ */}
      <Box label="Path B — Walk-in / Direct Service (no appointment)">
        <div className="space-y-2">
          <FlowStep number="B1" title="Customer Walks In" color="green"
            description="No prior appointment. Customer shows up at a branch and wants treatment. Staff creates or finds the customer profile." />
          <FlowArrow />
          <FlowStep number="B2" title="Create Service Record Directly" color="green"
            description="Skip the appointment step entirely. Go straight to: Customer profile → Records tab → Create Service Record. Select: Service Type, Doctor, Assistant, Location, Pricing, Notes." />
          <FlowNote text="No appointment is created. The service record stands on its own. This is valid — not every service needs an appointment trail." />
          <FlowArrow label="Service record saved..." />
          <div className="ml-11 p-2 bg-blue-50 rounded border border-blue-200 text-xs text-blue-700 font-medium">→ Continue to Step 5 (Payment)</div>
        </div>
      </Box>

      {/* ═══ PATH C: DEPOSIT ONLY ═══ */}
      <Box label="Path C — Deposit Only (no service yet)">
        <div className="space-y-2">
          <FlowStep number="C1" title="Customer Leaves a Deposit" color="amber"
            description="Customer wants to put money down but hasn't decided on a service (or the service hasn't happened yet). Staff opens customer profile → Payment tab → Deposit Wallet → Add Deposit." />
          <FlowNote text="This deposit is NOT tied to any service. It sits in the customer's deposit wallet as floating credit. Can be used later against ANY service payment." color="blue" />
          <FlowNote text="Deposit record: Amount, Method (Cash/Bank), Date, Note, Received By (staff member). Wallet balance updates immediately." />
          <FlowArrow />
          <FlowStep number="C2" title="Deposit Sits in Wallet" color="amber"
            description="The money stays as available credit. When the customer eventually gets a service, they can apply some or all of this deposit toward payment. Or they can deposit more. Or never use it (refund later)." />
          <FlowNote text="A deposit can happen at ANY time — before a service, after a consultation, between appointments, or as a standalone action. No restrictions on when." color="green" />
        </div>
      </Box>

      {/* ═══ STEP 4: SERVICE RECORD ═══ */}
      <Box label="Step 4 — Service Record (from appointment or walk-in)">
        <div className="space-y-2">
          <FlowNote text="A service record can be created two ways: (1) converted from an appointment (Path A), or (2) created directly for a walk-in (Path B). Both are equally valid." color="blue" />
          <FlowArrow />
          <FlowStep number="4" title="Fill in Service Record" color="green"
            description="Service Type (from catalog), Doctor, Assistant, Location, Unit Price, Quantity, Discount, Total, Prescription/Notes. If multi-visit: set total sessions." />
          <FlowNote text="If converted from an appointment, Doctor and Location auto-fill. If walk-in, all fields are manual. The appointment link is optional either way." />
          <FlowArrow label="Service record saved → now go to payment..." />
          <div className="ml-11 p-2 bg-blue-50 rounded border border-blue-200 text-xs text-blue-700 font-medium">→ Continue to Step 5 (Payment)</div>
        </div>
      </Box>

      {/* ═══ STEP 5: PAYMENT ═══ */}
      <Box label="Step 5 — Payment (after service exists)">
        <div className="space-y-2">
          <FlowNote text="Payment can ONLY happen after a Service Record exists in the system. No service = no payment (only deposits via Path C)." color="red" />
          <FlowArrow />
          <FlowStep number="5a" title="Open Payment for This Service" color="amber"
            description="Customer profile → Payment tab → 'Pay Against a Service'. Shows the service, total cost, and any amount already paid." />
          <FlowArrow />

          <FlowBranch label="How does the customer want to pay?" options={[
            { choice: "Use Deposit + Cash/Bank", result: "Enter deposit amount to apply (up to wallet balance) + cash and/or bank amount. Any combo, any amount." },
            { choice: "Cash or Bank only", result: "No deposit used. Pay with cash, bank transfer, or a mix of both." },
            { choice: "Partial payment", result: "Pay any amount less than the total. Remaining becomes outstanding balance." },
            { choice: "Full deposit only", result: "Use wallet balance to cover the service (if enough). No cash/bank needed." },
          ]} />

          <FlowNote text="A payment does NOT have to cover the full service cost. Customer can pay $100 on a $2,000 service. The rest stays as outstanding." />
          <FlowArrow label="After payment is processed..." />

          <FlowBranch label="Is there a remaining balance?" options={[
            { choice: "Paid in full", result: "Service status → 'Paid'. Done." },
            { choice: "Outstanding — pay later", result: "Balance sits as 'Outstanding'. Customer can come back anytime to make another partial payment." },
            { choice: "Outstanding — payment plan", result: "Go to Step 6 (Payment Plan)." },
          ]} />
        </div>
      </Box>

      {/* ═══ STEP 6: PAYMENT PLANS ═══ */}
      <Box label="Step 6 — Payment Plan (for outstanding balance)">
        <div className="space-y-2">
          <FlowStep number="6a" title="Create Payment Plan" color="red"
            description="Take the remaining balance and split into installments. Fields: Total owed, Number of periods, Amount per period (auto-calculated or manual override), Start date, Due day." />
          <FlowArrow />

          <FlowBranch label="Payment frequency?" options={[
            { choice: "Monthly", result: "Due on a specific day each month (e.g., 15th of every month)." },
            { choice: "Weekly", result: "Due on a specific day each week (e.g., every Monday)." },
          ]} />

          <FlowArrow />
          <FlowStep number="6b" title="Track Installments" color="red"
            description="Each installment shows: Due date, Amount due, Status (Paid / Unpaid / Late / Missed). As payments come in, mark each installment. Running tracker: X of Y payments made, remaining balance." />
          <FlowNote text="Customer can still make ad-hoc payments outside the plan schedule. Any payment reduces the outstanding balance regardless of the plan." />
        </div>
      </Box>

      {/* ═══ KEY RULES ═══ */}
      <Box label="Key Rules & Constraints">
        <div className="space-y-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-xs font-bold text-red-700 mb-1">No Forced Sequence</div>
              <div className="text-xs text-red-600">Customer can go appointment → service, OR straight to service (walk-in), OR deposit first → service later. All paths are valid. Nothing is required before anything else except: payment requires a service to exist.</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs font-bold text-blue-700 mb-1">Doctor Assignment</div>
              <div className="text-xs text-blue-600">Doctor is linked at the APPOINTMENT or SERVICE level, not the customer level. A customer can see different doctors for different visits.</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-xs font-bold text-amber-700 mb-1">Deposit = Floating Credit</div>
              <div className="text-xs text-amber-600">Deposits are NOT tied to any service. They sit in the customer's wallet and can be applied to ANY future service payment, partially or fully. Can happen anytime.</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xs font-bold text-emerald-700 mb-1">Payment Requires Service</div>
              <div className="text-xs text-emerald-600">You can only "pay against a service" — no service in the system, no payment. Deposits are the only money-in without a service.</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs font-bold text-purple-700 mb-1">Everything is Optional</div>
              <div className="text-xs text-purple-600">At every step, the customer can stop. No forced progression. They can deposit without service, consult without treatment, or pay partial amounts.</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs font-bold text-gray-700 mb-1">Service Without Appointment = OK</div>
              <div className="text-xs text-gray-600">Walk-ins create a service record directly. No appointment needed. The appointment link is optional — some services will have it, some won't.</div>
            </div>
          </div>
        </div>
      </Box>

      {/* ═══ VISUAL FLOW SUMMARY ═══ */}
      <Box label="Visual Flow Summary">
        <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-4">
          {/* Main paths */}
          <div className="text-xs font-bold text-gray-500 text-center mb-2">After customer is created, ANY of these paths can happen in ANY order:</div>
          <div className="space-y-3">
            {/* Path A */}
            <div className="flex items-center gap-2">
              <div className="bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-lg min-w-28 text-center">Path A<br/>Appointment</div>
              <span className="text-gray-300 font-bold">→</span>
              <div className="flex-1 p-2 bg-purple-50 rounded border border-purple-200 text-xs text-purple-700">
                Book appointment (doctor linked here) → Check-in → may lead to a service record, or just consultation, or deposit
              </div>
            </div>
            {/* Path B */}
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg min-w-28 text-center">Path B<br/>Walk-in</div>
              <span className="text-gray-300 font-bold">→</span>
              <div className="flex-1 p-2 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-700">
                Skip appointment entirely → Create service record directly → Go to payment
              </div>
            </div>
            {/* Path C */}
            <div className="flex items-center gap-2">
              <div className="bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-lg min-w-28 text-center">Path C<br/>Deposit</div>
              <span className="text-gray-300 font-bold">→</span>
              <div className="flex-1 p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700">
                No service needed → Money goes into wallet as floating credit → Use it later against any service
              </div>
            </div>
          </div>
          {/* Convergence */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
            <span className="text-xs font-bold text-gray-400">ALL paths converge here once a service exists:</span>
            <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
          </div>
          <div className="flex items-center justify-center gap-0 flex-wrap">
            {[
              { label: "Service Record", sub: "exists in system", color: "bg-emerald-500" },
              { label: "→", sub: "", color: "" },
              { label: "Payment", sub: "Deposit / Cash / Bank / Mix", color: "bg-red-500" },
              { label: "→", sub: "", color: "" },
              { label: "Balance?", sub: "Paid / Outstanding / Plan", color: "bg-gray-600" },
            ].map((step, i) => (
              step.color ? (
                <div key={i} className="flex flex-col items-center mx-1">
                  <div className={`${step.color} text-white text-xs font-bold px-3 py-2 rounded-lg text-center min-w-24`}>{step.label}</div>
                  <div className="text-xs text-gray-400 mt-1 text-center max-w-28 leading-tight">{step.sub}</div>
                </div>
              ) : (
                <span key={i} className="text-gray-300 text-lg font-bold mx-1">→</span>
              )
            ))}
          </div>
        </div>
      </Box>

      {/* ═══ OPEN QUESTIONS ═══ */}
      <Box label="Open Questions — Need Your Input">
        <div className="space-y-2 mt-1">
          <OpenQuestion text="Can a customer have multiple active services at the same time? (e.g., braces ongoing + a separate crown prep)" />
          <OpenQuestion text="If a customer deposits $500 and the service is $300, does the $200 leftover stay in the wallet? Or do we refund the difference?" />
          <OpenQuestion text="Can a customer switch their home branch? If so, do their records follow them or stay at the old branch?" />
          <OpenQuestion text="For multi-visit services (braces — 24 sessions), does each visit create a new appointment? Or is it one long-running service with check-ins?" />
          <OpenQuestion text="Who can create a deposit? Only secretary/reception? Or can a doctor also log a deposit during a visit?" />
          <OpenQuestion text="When a payment plan installment is missed, what happens? Just flagged as 'Missed'? Or does it trigger a notification/action?" />
          <OpenQuestion text="Can a customer make a deposit AND a service payment in the same visit? (e.g., deposit $500 into wallet, then immediately use $200 of it for today's service)" />
        </div>
      </Box>
    </div>
  );
}

/* ═══════════════════════════════════════════
   NAVIGATION & MAIN APP
   ═══════════════════════════════════════════ */
const CUSTOMER_TABS = [
  { id: "profile", label: "Profile", icon: "👤" },
  { id: "appointments", label: "Appointments", icon: "📅" },
  { id: "records", label: "Records", icon: "🦷" },
  { id: "payment", label: "Payment", icon: "💰" },
];

const SIDEBAR_PAGES = [
  { id: "customers", label: "Customers", icon: "👤" },
  { id: "employees", label: "Employees", icon: "🏥" },
  { id: "locations", label: "Locations", icon: "📍" },
];

const LOGIC_FLOW_PAGES = [
  { id: "logic-customer", label: "Customer", icon: "🔀" },
];

const ALL_PAGES = [...SIDEBAR_PAGES, ...LOGIC_FLOW_PAGES];

export default function App() {
  const [activePage, setActivePage] = useState("customers");
  const [activeTab, setActiveTab] = useState("profile");

  const renderCustomerTabs = () => {
    const TAB_COMPONENTS = { profile: ProfileTab, appointments: AppointmentsTab, records: RecordsTab, payment: PaymentTab };
    const ActiveTab = TAB_COMPONENTS[activeTab];
    return (
      <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden shadow-sm">
        {/* Customer Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl shadow-sm">TA</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-800">Tran Van A</h2>
                <Badge text="Active" color="green" />
              </div>
              <div className="text-sm text-gray-500 mt-0.5">0912-345-678 · Dong Da · Since Jan 2024</div>
            </div>
            <Btn label="Print" /><Btn label="Edit" />
          </div>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-white px-2">
          {CUSTOMER_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id ? "border-blue-600 text-blue-700" : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}>
              <span className="text-base">{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="p-5 bg-gray-50/50"><ActiveTab /></div>
      </div>
    );
  };

  const currentPage = ALL_PAGES.find(p => p.id === activePage);
  const isLogicFlow = activePage.startsWith("logic-");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">🦷 Tam Dentist</h1>
          <div className="text-xs text-gray-400 mt-1">Blueprint Preview</div>
        </div>

        {/* Main pages */}
        <nav className="flex-1 py-2">
          {SIDEBAR_PAGES.map(page => (
            <button key={page.id} onClick={() => setActivePage(page.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                activePage === page.id ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600" : "text-gray-600 hover:bg-gray-50"
              }`}>
              <span className="text-base">{page.icon}</span>
              <span className="text-sm font-medium">{page.label}</span>
            </button>
          ))}
        </nav>

        {/* Logic Flow section — pinned to bottom */}
        <div className="border-t-2 border-red-300 bg-red-50/50">
          <div className="px-4 pt-3 pb-1">
            <div className="text-xs font-bold text-red-400 uppercase tracking-wider">Logic Flow</div>
            <div className="text-xs text-red-300 leading-tight mt-0.5">Internal only</div>
          </div>
          {LOGIC_FLOW_PAGES.map(page => (
            <button key={page.id} onClick={() => setActivePage(page.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                activePage === page.id ? "bg-red-100 text-red-700 border-r-2 border-red-500" : "text-red-400 hover:bg-red-50 hover:text-red-600"
              }`}>
              <span className="text-base">{page.icon}</span>
              <span className="text-sm font-medium">{page.label}</span>
            </button>
          ))}
          <div className="h-2"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`border-b border-gray-200 px-6 py-4 ${isLogicFlow ? "bg-red-50" : "bg-white"}`}>
          <div className="flex items-center gap-3">
            <h1 className={`text-xl font-bold ${isLogicFlow ? "text-red-700" : "text-gray-800"}`}>
              {currentPage?.icon} {isLogicFlow ? `Logic Flow — ${currentPage?.label}` : currentPage?.label}
            </h1>
            {isLogicFlow && <Badge text="DO NOT BUILD" color="red" />}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activePage === "customers" && renderCustomerTabs()}
            {activePage === "employees" && <EmployeesPage />}
            {activePage === "locations" && <LocationsPage />}
            {activePage === "logic-customer" && <LogicFlowCustomerPage />}
          </div>
        </div>
      </div>
    </div>
  );
}
