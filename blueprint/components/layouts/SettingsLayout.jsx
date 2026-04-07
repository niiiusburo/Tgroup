import { WireframeBox, WireframeRow, WireframeButton, WireframeTable } from '../ui';

export function SettingsLayout() {
    const tiers = [
        { tier: "Admin", roles: "General Manager" },
        { tier: "Manager", roles: "Branch Manager, Marketing" },
        { tier: "Staff", roles: "Doctor, Assistant, Secretary, Sales, Online Sales, Customer Care" },
    ];

    return (
        <div className="space-y-4">
            <WireframeBox label="Danh mục dịch vụ (156 dịch vụ · 11 nhóm)">
                <div className="space-y-2 mt-2">
                    <WireframeRow>
                        <div className="flex-1">
                            <div className="text-xs text-gray-400 mb-1">Tìm theo tên dịch vụ, mã (SP/DV), nhóm, hoặc đơn vị tính</div>
                            <div className="h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
                                <span className="text-gray-400 text-xs">🔍 Tìm kiếm — kết quả tức thì...</span>
                            </div>
                        </div>
                        <div className="flex items-end"><WireframeButton label="+ Thêm dịch vụ" primary /></div>
                    </WireframeRow>
                    <WireframeTable columns={["Mã DV", "Tên dịch vụ", "Nhóm", "ĐVT", "Giá bán", "Trạng thái"]} rows={5} />
                </div>
            </WireframeBox>
            <WireframeRow>
                <div className="flex-1">
                    <WireframeBox label="Role Configuration">
                        <div className="space-y-2 mt-2">
                            {tiers.map((t, i) => (
                                <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="text-xs font-bold text-gray-600">{t.tier}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{t.roles}</div>
                                </div>
                            ))}
                        </div>
                    </WireframeBox>
                </div>
                <div className="flex-1">
                    <WireframeBox label="Customer Sources">
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {["Walk-in", "Online Sales", "Hotline", "Returning", "Referral", "Internal", "Marketing", "Partner"].map((s, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{s}</span>
                            ))}
                        </div>
                    </WireframeBox>
                </div>
            </WireframeRow>
            <WireframeRow>
                <div className="flex-1"><WireframeBox label="System Preferences" dashed><div className="text-xs text-gray-400 mt-1">Currency, timezone, slot duration, notifications, branding</div></WireframeBox></div>
                <div className="flex-1"><WireframeBox label="Audit Log" dashed><div className="text-xs text-gray-400 mt-1">Who changed what and when. Filterable.</div></WireframeBox></div>
            </WireframeRow>
        </div>
    );
}
