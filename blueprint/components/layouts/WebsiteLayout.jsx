import { WireframeBox, WireframeRow, WireframeButton, WireframeStatCard, WireframeTable } from '../ui';

export function WebsiteLayout() {
    const serviceGroups = [
        { name: "Niềng răng", count: 49, icon: "🦷", color: "bg-blue-50 border-blue-200 text-blue-700" },
        { name: "Điều trị tổng quát", count: 40, icon: "🏥", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
        { name: "Bọc sứ", count: 19, icon: "👑", color: "bg-purple-50 border-purple-200 text-purple-700" },
        { name: "Nhổ răng", count: 15, icon: "🔧", color: "bg-red-50 border-red-200 text-red-700" },
        { name: "Implant", count: 12, icon: "🔩", color: "bg-amber-50 border-amber-200 text-amber-700" },
        { name: "Phẫu thuật & Điều trị", count: 10, icon: "⚕️", color: "bg-pink-50 border-pink-200 text-pink-700" },
        { name: "Dán sứ", count: 5, icon: "✨", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
        { name: "Phục hình", count: 2, icon: "🦿", color: "bg-gray-50 border-gray-200 text-gray-700" },
    ];

    const veneers = [
        { name: "Veneer Lava", price: "14,200,000" },
        { name: "Veneer Caramay Ngọc Trai", price: "9,200,000" },
        { name: "Veneer Emax Press", price: "7,200,000" },
        { name: "Đính đá", price: "500,000" },
        { name: "Gắn lại răng sứ", price: "500,000" },
    ];

    const extractions = [
        { name: "Nhổ răng ngầm", price: "7,000,000" },
        { name: "Nhổ răng khôn hàm dưới", price: "4,000,000" },
        { name: "Nhổ răng khôn hàm trên", price: "3,500,000" },
        { name: "Nhổ răng thừa, lạc chỗ", price: "2,200,000" },
        { name: "Nhổ răng Vĩnh viễn", price: "2,200,000" },
    ];

    const surgeries = [
        { name: "Cắt nạo ổ xương", price: "6,000,000" },
        { name: "Cắt cuống răng", price: "5,800,000" },
        { name: "Nạo quanh cuống răng", price: "4,300,000" },
        { name: "Tạo hình xương ổ răng", price: "2,900,000" },
        { name: "Nhổ + tạo hình xương", price: "1,800,000" },
    ];

    const crownServices = [
        { code: "DV0011", name: "RS 3M Lava Plus", unit: "Răng", price: "8,000,000", labo: true },
        { code: "DV0018", name: "RS Nacera Vita", unit: "Răng", price: "6,500,000", labo: true },
        { code: "DV0013", name: "RS Cercon HT", unit: "Răng", price: "6,000,000", labo: true },
        { code: "DV0016", name: "RS HT Smile", unit: "Răng", price: "6,000,000", labo: true },
        { code: "DV0012", name: "RS Ceramill", unit: "Răng", price: "5,500,000", labo: true },
        { code: "DV0014", name: "RS Emax", unit: "Răng", price: "5,500,000", labo: true },
        { code: "DV0015", name: "RS Ful Zirconia", unit: "Răng", price: "3,500,000", labo: true },
        { code: "DV0019", name: "RS Venus 3D", unit: "Răng", price: "3,000,000", labo: true },
        { code: "DV0017", name: "RS Katana", unit: "Răng", price: "2,500,000", labo: true },
        { code: "DV0020", name: "Chốt sợi", unit: "Răng", price: "2,000,000", labo: true },
    ];

    const bracesServices = [
        { code: "DV0008", name: "Niềng trong suốt Invisalign", unit: "Ca", price: "140,000,000" },
        { code: "SP0217", name: "Niềng răng trong suốt", unit: "Ca", price: "80,000,000" },
        { code: "SP0012", name: "KHAY TRONG SUỐT", unit: "Bộ", price: "60,000,000" },
        { code: "DV0004", name: "Niềng Mắc Cài Sứ Loại Tự Buộc 3M", unit: "Ca", price: "45,000,000" },
        { code: "SP0277", name: "Niềng Mắc Cài Cánh Cam", unit: "Ca", price: "40,000,000" },
        { code: "DV0003", name: "Niềng Mắc Cài Sứ Tiêu Chuẩn", unit: "Ca", price: "39,000,000" },
        { code: "DV0002", name: "Niềng Mắc Cài Kim Loại Tự Buộc 3M", unit: "Ca", price: "32,000,000" },
        { code: "DV0001", name: "Niềng Mắc Cài Kim Loại Tiêu Chuẩn", unit: "Ca", price: "28,000,000" },
    ];

    const implantServices = [
        { code: "DV0027", name: "Full Implant Thụy Điển", unit: "Răng", price: "39,000,000" },
        { code: "DV0026", name: "Full Implant Thụy Sĩ", unit: "Răng", price: "36,000,000" },
        { code: "DV0025", name: "Full Implant Pháp", unit: "Răng", price: "27,000,000" },
        { code: "DV0024", name: "Full Implant Mỹ", unit: "Răng", price: "24,000,000" },
        { code: "DV0028", name: "Full Implant Hàn Quốc", unit: "Răng", price: "22,000,000" },
        { code: "DV0038", name: "Phẫu thuật nâng xoang hở", unit: "ĐV", price: "15,000,000" },
        { code: "DV0035", name: "Mão sứ", unit: "Răng", price: "8,000,000" },
        { code: "DV0036", name: "Phẫu thuật ghép xương bột", unit: "ĐV", price: "8,000,000" },
    ];

    return (
        <div className="space-y-4">
            <WireframeRow>
                <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">Tìm kiếm theo tên trang, tên dịch vụ, mã dịch vụ, chi nhánh, hoặc nhóm</div>
                    <div className="h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
                        <span className="text-gray-400 text-xs">🔍 Tìm kiếm — kết quả tức thì...</span>
                    </div>
                </div>
                <div className="flex items-end gap-2">
                    <WireframeButton label="+ Trang mới" primary />
                    <WireframeButton label="Xem trước" />
                </div>
            </WireframeRow>
            <WireframeRow>
                <WireframeStatCard label="Tổng trang" value="14" />
                <WireframeStatCard label="Đã xuất bản" value="11" />
                <WireframeStatCard label="Nháp" value="3" />
                <WireframeStatCard label="Dịch vụ" value="156" />
            </WireframeRow>
            <WireframeBox label="Trang Website">
                <WireframeTable columns={["Trang", "Slug", "Trạng thái", "Sections", "Cập nhật", "Thao tác"]} rows={5} />
                <div className="mt-2 flex flex-wrap gap-1">
                    {["Trang chủ", "Dịch vụ", "Bọc sứ", "Dán sứ", "Điều trị tổng quát", "Implant", "Nhổ răng", "Niềng răng", "Phẫu thuật & Điều trị", "Phục hình", "Giới thiệu", "Liên hệ"].map((p, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                </div>
            </WireframeBox>
            <WireframeBox label="Nhóm dịch vụ — Danh mục từ hệ thống">
                <div className="grid grid-cols-4 gap-2 mt-2">
                    {serviceGroups.map((g, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${g.color}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-lg">{g.icon}</span>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white bg-opacity-60">{g.count}</span>
                            </div>
                            <div className="text-xs font-semibold">{g.name}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-2 flex gap-1">
                    {[{ name: "Máy tăm nước", count: 2 }, { name: "BỘC LỘ", count: 1 }, { name: "Khí cụ Twinblock", count: 1 }].map((g, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{g.name} ({g.count})</span>
                    ))}
                </div>
            </WireframeBox>
            <WireframeBox label="Mẫu trang dịch vụ">
                <div className="mt-2 flex gap-2">
                    {["Hero", "Bảng dịch vụ", "Đối tượng", "Quy trình", "FAQ"].map((s, i) => (
                        <div key={i} className="flex-1 text-center p-2 rounded-lg text-xs border bg-emerald-50 border-emerald-200 text-emerald-600">
                            {i + 1}. {s}
                        </div>
                    ))}
                </div>
                <div className="mt-3 text-xs text-gray-400">Áp dụng cho: Bọc sứ, Dán sứ, Điều trị tổng quát, Implant, Nhổ răng, Niềng răng, Phẫu thuật & Điều trị, Phục hình</div>
            </WireframeBox>

            {/* Bọc sứ */}
            <WireframeBox label="Danh mục dịch vụ — Bọc sứ (19 dịch vụ)">
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex bg-purple-50 border-b border-gray-200">
                        <div className="w-24 px-3 py-2 text-xs font-bold text-gray-500">Mã DV</div>
                        <div className="flex-1 px-3 py-2 text-xs font-bold text-gray-500">Tên dịch vụ</div>
                        <div className="w-20 px-3 py-2 text-xs font-bold text-gray-500">ĐVT</div>
                        <div className="w-32 px-3 py-2 text-xs font-bold text-gray-500 text-right">Giá bán (VND)</div>
                        <div className="w-16 px-3 py-2 text-xs font-bold text-gray-500 text-center">Labo</div>
                    </div>
                    {crownServices.map((s, i) => (
                        <div key={i} className={`flex ${i < 9 ? "border-b border-gray-100" : ""}`}>
                            <div className="w-24 px-3 py-2 text-xs font-mono text-gray-500">{s.code}</div>
                            <div className="flex-1 px-3 py-2 text-xs text-gray-700 font-medium">{s.name}</div>
                            <div className="w-20 px-3 py-2 text-xs text-gray-500">{s.unit}</div>
                            <div className="w-32 px-3 py-2 text-xs text-gray-700 text-right font-medium">{s.price}</div>
                            <div className="w-16 px-3 py-2 text-xs text-center">{s.labo ? <span className="text-emerald-500">✓</span> : <span className="text-gray-300">—</span>}</div>
                        </div>
                    ))}
                    <div className="px-3 py-2 bg-gray-50 text-xs text-gray-400 italic">+ 9 dịch vụ khác...</div>
                </div>
            </WireframeBox>

            {/* Niềng răng */}
            <WireframeBox label="Danh mục dịch vụ — Niềng răng (49 dịch vụ)">
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex bg-blue-50 border-b border-gray-200">
                        <div className="w-24 px-3 py-2 text-xs font-bold text-gray-500">Mã DV</div>
                        <div className="flex-1 px-3 py-2 text-xs font-bold text-gray-500">Tên dịch vụ</div>
                        <div className="w-20 px-3 py-2 text-xs font-bold text-gray-500">ĐVT</div>
                        <div className="w-32 px-3 py-2 text-xs font-bold text-gray-500 text-right">Giá bán (VND)</div>
                    </div>
                    {bracesServices.map((s, i) => (
                        <div key={i} className={`flex ${i < 7 ? "border-b border-gray-100" : ""}`}>
                            <div className="w-24 px-3 py-2 text-xs font-mono text-gray-500">{s.code}</div>
                            <div className="flex-1 px-3 py-2 text-xs text-gray-700 font-medium">{s.name}</div>
                            <div className="w-20 px-3 py-2 text-xs text-gray-500">{s.unit}</div>
                            <div className="w-32 px-3 py-2 text-xs text-gray-700 text-right font-medium">{s.price}</div>
                        </div>
                    ))}
                    <div className="px-3 py-2 bg-gray-50 text-xs text-gray-400 italic">+ 41 dịch vụ khác...</div>
                </div>
            </WireframeBox>

            {/* Implant */}
            <WireframeBox label="Danh mục dịch vụ — Implant (12 dịch vụ)">
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex bg-amber-50 border-b border-gray-200">
                        <div className="w-24 px-3 py-2 text-xs font-bold text-gray-500">Mã DV</div>
                        <div className="flex-1 px-3 py-2 text-xs font-bold text-gray-500">Tên dịch vụ</div>
                        <div className="w-20 px-3 py-2 text-xs font-bold text-gray-500">ĐVT</div>
                        <div className="w-32 px-3 py-2 text-xs font-bold text-gray-500 text-right">Giá bán (VND)</div>
                    </div>
                    {implantServices.map((s, i) => (
                        <div key={i} className={`flex ${i < 7 ? "border-b border-gray-100" : ""}`}>
                            <div className="w-24 px-3 py-2 text-xs font-mono text-gray-500">{s.code}</div>
                            <div className="flex-1 px-3 py-2 text-xs text-gray-700 font-medium">{s.name}</div>
                            <div className="w-20 px-3 py-2 text-xs text-gray-500">{s.unit}</div>
                            <div className="w-32 px-3 py-2 text-xs text-gray-700 text-right font-medium">{s.price}</div>
                        </div>
                    ))}
                    <div className="px-3 py-2 bg-gray-50 text-xs text-gray-400 italic">+ 4 dịch vụ khác...</div>
                </div>
            </WireframeBox>

            <WireframeRow>
                <div className="flex-1">
                    <WireframeBox label="Dán sứ (5 dịch vụ)">
                        <div className="space-y-1 mt-2">
                            {veneers.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-1.5 rounded bg-indigo-50 text-xs">
                                    <span className="text-gray-700">{s.name}</span>
                                    <span className="text-gray-500 font-medium">{s.price} ₫</span>
                                </div>
                            ))}
                        </div>
                    </WireframeBox>
                </div>
                <div className="flex-1">
                    <WireframeBox label="Nhổ răng (15 dịch vụ)">
                        <div className="space-y-1 mt-2">
                            {extractions.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-1.5 rounded bg-red-50 text-xs">
                                    <span className="text-gray-700">{s.name}</span>
                                    <span className="text-gray-500 font-medium">{s.price} ₫</span>
                                </div>
                            ))}
                            <div className="text-xs text-gray-400 italic p-1">+ 10 dịch vụ khác...</div>
                        </div>
                    </WireframeBox>
                </div>
                <div className="flex-1">
                    <WireframeBox label="Phẫu thuật & Điều trị (10 dịch vụ)">
                        <div className="space-y-1 mt-2">
                            {surgeries.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-1.5 rounded bg-pink-50 text-xs">
                                    <span className="text-gray-700">{s.name}</span>
                                    <span className="text-gray-500 font-medium">{s.price} ₫</span>
                                </div>
                            ))}
                            <div className="text-xs text-gray-400 italic p-1">+ 5 dịch vụ khác...</div>
                        </div>
                    </WireframeBox>
                </div>
            </WireframeRow>

            <WireframeBox label="Trang chủ — Sections">
                <div className="space-y-2 mt-2">
                    {["Hero Banner — Headline, subtext, CTA đặt lịch", "Nhóm dịch vụ nổi bật — 8 nhóm chính với icon và số lượng dịch vụ", "Tại sao chọn Tạm Dentist — Thống kê, uy tín, cam kết", "Dịch vụ phổ biến — Carousel: Niềng Invisalign, Implant, Bọc sứ Lava, Veneer", "Chi nhánh — 7 chi nhánh với địa chỉ và giờ làm việc", "FAQ — Câu hỏi thường gặp"].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-xs text-gray-400 font-mono w-6">{i + 1}</span>
                            <span className="text-xs text-gray-600 flex-1">{s}</span>
                            <span className="text-xs text-gray-400 cursor-move">⠿</span>
                        </div>
                    ))}
                </div>
            </WireframeBox>

            <WireframeBox label="Chi nhánh">
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {["Tạm Dentist (Chính)", "Chi nhánh 2", "Chi nhánh 3", "Chi nhánh 4", "Chi nhánh 5", "Chi nhánh 6", "Chi nhánh 7"].map((b, i) => (
                        <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="text-xs font-medium text-gray-600">{b}</div>
                            <div className="text-xs text-gray-400 mt-1">Địa chỉ • Điện thoại • Giờ làm việc</div>
                        </div>
                    ))}
                </div>
            </WireframeBox>
        </div>
    );
}
