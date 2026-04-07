import { WireframeBox, WireframeRow, WireframeField, WireframeButton, WireframeStatCard } from '../ui';

export function PaymentLayout() {
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
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-600 font-bold">TA</div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800">Tran Van A</div>
                    <div className="text-xs text-gray-500">0912-345-678 · Dong Da</div>
                </div>
                <WireframeStatCard label="Deposit Balance" value="$150" />
                <WireframeStatCard label="Total Billed" value="$4,800" />
                <WireframeStatCard label="Total Paid" value="$3,600" />
                <WireframeStatCard label="Outstanding" value="$1,200" />
            </div>
            <WireframeRow>
                <div className="flex-1">
                    <WireframeBox label="Deposit Wallet — Tran Van A">
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
            <WireframeBox label="Pay Against a Service">
                <div className="space-y-3 mt-2">
                    <div className="text-xs font-bold text-gray-400">THIS CUSTOMER'S UNPAID SERVICES</div>
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
                                <div className="p-2 bg-amber-50 rounded border border-amber-200 text-xs text-amber-700 flex-1 mr-3">Does NOT need to total the full remaining — partial payment OK</div>
                                <WireframeButton label="Process Payment" primary />
                            </div>
                        </div>
                    ))}
                </div>
            </WireframeBox>
            <WireframeBox label="Monthly Payment Plan — Crown Prep ($1,200 outstanding)">
                <div className="space-y-2 mt-2">
                    <WireframeRow>
                        <WireframeField label="Outstanding Amount" />
                        <WireframeField label="Number of Months" />
                        <WireframeField label="Monthly Amount (auto)" />
                        <WireframeField label="Start Date" />
                        <WireframeField label="Due Day of Month" />
                    </WireframeRow>
                    <WireframeRow>
                        <WireframeButton label="Create Monthly Plan" primary />
                    </WireframeRow>
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
            <WireframeRow>
                <div className="flex-1"><WireframeBox label="🔔 SMS Notifications (P)" dashed><div className="text-xs text-gray-400 mt-1">Payment reminders, overdue notices, receipts — for this customer</div></WireframeBox></div>
                <div className="flex-1"><WireframeBox label="📧 Email Notifications (P)" dashed><div className="text-xs text-gray-400 mt-1">Receipts, monthly statements, due dates — for this customer</div></WireframeBox></div>
            </WireframeRow>
            <WireframeBox label="Payment History — Tran Van A">
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
        </div>
    );
}
