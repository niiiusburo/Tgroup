import { WireframeBox, WireframeTable } from '../ui';

export function RelationshipsLayout() {
    const permissions = [
        { page: "📊 Overview", admin: "Full", manager: "Full", staff: "View Only" },
        { page: "🗓️ Calendar", admin: "Full", manager: "Own Location", staff: "Own Schedule" },
        { page: "👤 Customers", admin: "Full", manager: "Own Location", staff: "Assigned Only" },
        { page: "📅 Appointments", admin: "Full", manager: "Own Location", staff: "Own Only" },
        { page: "🦷 Record", admin: "Full", manager: "Own Location", staff: "Own Only" },
        { page: "💰 Payment", admin: "Full + Refunds", manager: "Process", staff: "Process Only" },
        { page: "🏥 Employees", admin: "Full CRUD", manager: "Own Staff", staff: "Own Profile" },
        { page: "💵 Commission", admin: "Full", manager: "Own Location", staff: "Own Only" },
        { page: "📍 Locations", admin: "Full CRUD", manager: "Own Edit", staff: "View Only" },
        { page: "🌐 Services", admin: "Full", manager: "Edit Only", staff: "View Only" },
        { page: "📊 Reports", admin: "Full", manager: "Own Location", staff: "No Access" },
        { page: "⚙️ Settings", admin: "Full", manager: "No Access", staff: "No Access" },
        { page: "🔗 Relationships", admin: "Full", manager: "View Only", staff: "No Access" },
    ];

    const links = [
        { from: "👤 Customer", to: "🏥 Employee", via: "Referral Code" },
        { from: "👤 Customer", to: "📍 Location", via: "Optional Link" },
        { from: "🏥 Employee", to: "📍 Location", via: "Optional Link" },
        { from: "📅 Appointment", to: "🦷 Service", via: "Converts To" },
        { from: "🦷 Service", to: "💰 Payment", via: "Pay Against" },
        { from: "🦷 Service", to: "🌐 Website", via: "Listed On" },
    ];

    return (
        <div className="space-y-4">
            <WireframeBox label="Permission Matrix — All Pages × All Tiers">
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex bg-gray-50 border-b border-gray-200">
                        <div className="w-48 px-3 py-2 text-xs font-bold text-gray-500">Page</div>
                        <div className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 text-center">Admin</div>
                        <div className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 text-center">Manager</div>
                        <div className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 text-center">Staff</div>
                    </div>
                    {permissions.map((row, i) => (
                        <div key={i} className={`flex ${i < 12 ? "border-b border-gray-100" : ""}`}>
                            <div className="w-48 px-3 py-2 text-xs font-medium text-gray-600">{row.page}</div>
                            <div className="flex-1 px-3 py-2 text-xs text-center"><span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{row.admin}</span></div>
                            <div className="flex-1 px-3 py-2 text-xs text-center"><span className={`px-2 py-0.5 rounded-full ${row.manager === "No Access" ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-600"}`}>{row.manager}</span></div>
                            <div className="flex-1 px-3 py-2 text-xs text-center"><span className={`px-2 py-0.5 rounded-full ${row.staff === "No Access" ? "bg-red-50 text-red-500" : row.staff.includes("Only") ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>{row.staff}</span></div>
                        </div>
                    ))}
                </div>
            </WireframeBox>

            <WireframeBox label="Custom Permission Overrides" dashed>
                <div className="text-xs text-gray-400 mt-1">Override defaults for specific employees. Exception-based, logged.</div>
                <div className="mt-2"><WireframeTable columns={["Employee", "Page", "Default Access", "Override To", "Reason", "Set By"]} rows={3} /></div>
            </WireframeBox>

            <WireframeBox label="Entity Relationship Map">
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        {links.map((link, i) => (
                            <div key={i} className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-3 py-2">
                                <span className="text-xs font-medium">{link.from}</span>
                                <span className="text-xs text-gray-300">→</span>
                                <span className="text-xs text-blue-500">{link.via}</span>
                                <span className="text-xs text-gray-300">→</span>
                                <span className="text-xs font-medium">{link.to}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </WireframeBox>

            <WireframeBox label="Link Managers">
                <div className="grid grid-cols-3 gap-2 mt-2">
                    {["Customer ↔ Employee", "Employee ↔ Location", "Employee ↔ Employee", "Service ↔ Appointment", "Payment ↔ Service", "Relationship Rules"].map((l, i) => (
                        <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500 text-center">{l}</div>
                    ))}
                </div>
            </WireframeBox>
        </div>
    );
}
