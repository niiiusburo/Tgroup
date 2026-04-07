/**
 * Service Catalog Data
 * @source[Website tạm-2.xlsx - Sheet "Dịch vụ/nhóm dịch vụ"]
 * @description Complete list of dental services organized by category
 */

export interface ServiceItem {
  code: string;
  name: string;
  canOrderLab: boolean;
  category: string;
  unit: string;
  price: number;
  cost: number;
}

/**
 * Service categories from the spreadsheet
 */
export const SERVICE_CATEGORIES = [
  'Bọc sứ',
  'Dán sứ',
  'Điều trị tổng quát',
  'Implant',
  'KHÍ CỤ TWINBLOCK',
  'Máy tăm nước',
  'Nhổ răng',
  'Niềng răng',
  'Phẫu thuật và điều trị',
  'Phục hình',
  'BỘC LỘ',
] as const;

/**
 * Complete service catalog data from spreadsheet
 * Extracted from: Website tạm-2.xlsx - Sheet "Dịch vụ/nhóm dịch vụ"
 */
export const SERVICE_CATALOG_DATA: ServiceItem[] = [
  // Bọc sứ (Porcelain Crowns)
  { code: 'SP0288', name: 'Cắm chốt', canOrderLab: false, category: 'Bọc sứ', unit: 'răng', price: 1, cost: 0 },
  { code: 'DV0020', name: 'Chốt sợi', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 2000000, cost: 0 },
  { code: 'SP0244', name: 'Chốt sợi thủy tinh', canOrderLab: false, category: 'Bọc sứ', unit: 'đồng', price: 800000, cost: 0 },
  { code: 'SP0265', name: 'Cùi giả kim loại', canOrderLab: false, category: 'Bọc sứ', unit: 'đồng', price: 1000000, cost: 0 },
  { code: 'SP0243', name: 'Cùi giả sứ', canOrderLab: false, category: 'Bọc sứ', unit: 'đồng', price: 1500000, cost: 0 },
  { code: 'SP0247', name: 'Đặt chốt', canOrderLab: false, category: 'Bọc sứ', unit: 'đồng', price: 800000, cost: 0 },
  { code: 'SP0248', name: 'KHUNG NHỰA', canOrderLab: false, category: 'Bọc sứ', unit: 'cái', price: 5000000, cost: 0 },
  { code: 'SP0246', name: 'Mão tạm', canOrderLab: false, category: 'Bọc sứ', unit: 'đồng', price: 300000, cost: 0 },
  { code: 'DV0011', name: 'RS 3M Lava Plus', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 8000000, cost: 0 },
  { code: 'DV0012', name: 'RS Ceramill', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 5500000, cost: 0 },
  { code: 'SP0245', name: 'RS CERCON', canOrderLab: false, category: 'Bọc sứ', unit: 'CÁI', price: 6000000, cost: 0 },
  { code: 'DV0013', name: 'RS Cercon HT', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 6000000, cost: 0 },
  { code: 'DV0014', name: 'RS Emax', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 5500000, cost: 0 },
  { code: 'DV0015', name: 'RS Ful Zirconia', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 3500000, cost: 0 },
  { code: 'DV0016', name: 'RS HT Smile', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 6000000, cost: 0 },
  { code: 'DV0017', name: 'RS Katana', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 2500000, cost: 0 },
  { code: 'DV0018', name: 'RS Nacera Vita', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 6500000, cost: 0 },
  { code: 'SP0290', name: 'RS Titan', canOrderLab: false, category: 'Bọc sứ', unit: 'Răng', price: 3000000, cost: 0 },
  { code: 'DV0019', name: 'RS Venus 3D', canOrderLab: true, category: 'Bọc sứ', unit: 'Răng', price: 3000000, cost: 0 },

  // BỘC LỘ
  { code: 'SP0296', name: 'BỘC LỘ', canOrderLab: false, category: 'BỘC LỘ', unit: 'RĂNG', price: 1, cost: 0 },

  // Dán sứ (Porcelain Veneers)
  { code: 'DV0021', name: 'Dán sứ Veneer Caramay Ngọc Trai', canOrderLab: true, category: 'Dán sứ', unit: 'Răng', price: 9200000, cost: 0 },
  { code: 'DV0022', name: 'Dán sứ Veneer Emax Press', canOrderLab: true, category: 'Dán sứ', unit: 'Răng', price: 7200000, cost: 0 },
  { code: 'DV0023', name: 'Dán sứ Veneer Lava', canOrderLab: true, category: 'Dán sứ', unit: 'Răng', price: 14200000, cost: 0 },
  { code: 'SP0253', name: 'Đính đá', canOrderLab: false, category: 'Dán sứ', unit: 'đồng', price: 500000, cost: 0 },
  { code: 'SP0216', name: 'GẮN LẠI RĂNG SỨ', canOrderLab: false, category: 'Dán sứ', unit: 'CÁI', price: 500000, cost: 0 },

  // Điều trị tổng quát (General Treatment)
  { code: 'SP0237', name: 'Cắt cầu răng', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'răng', price: 1, cost: 0 },
  { code: 'SP0201', name: 'CẮT CHỈ', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Cái', price: 200000, cost: 0 },
  { code: 'SP0218', name: 'CẮT LỢI TRÙM (THƯỜNG)', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'cái', price: 300000, cost: 0 },
  { code: 'DV0051', name: 'Cắt lợi+ Hạ xương ổ răng', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 1500000, cost: 0 },
  { code: 'SP0303', name: 'CẮT NƯỚU', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'RĂNG', price: 1, cost: 0 },
  { code: 'SP0261', name: 'chữa áp xe chân răng số 46', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'cái', price: 500000, cost: 0 },
  { code: 'SP0269', name: 'Chụp phim', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'lần', price: 1, cost: 0 },
  { code: 'SP0252', name: 'Đánh bóng làm sạch', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'đ', price: 100000, cost: 0 },
  { code: 'SP0306', name: 'ĐIỀU TRỊ NHA CHU', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 1, cost: 0 },
  { code: 'SP0286', name: 'Điều trị sâu ngà răng phục hồi bằng composite', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'răng', price: 300000, cost: 0 },
  { code: 'DV0047', name: 'Điều trị tủy', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 2000000, cost: 0 },
  { code: 'DV0048', name: 'Điều trị tủy lại', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 3000000, cost: 0 },
  { code: 'SP0274', name: 'Điều trị viêm lợi', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'gói', price: 1, cost: 0 },
  { code: 'DV0056', name: 'Điều trị viêm quanh răng', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Ca', price: 750000, cost: 0 },
  { code: 'SP0202', name: 'GẮN HỘT', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Hột', price: 500000, cost: 0 },
  { code: 'SP0238', name: 'Gắn lại răng sứ bị rớt', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'răng', price: 1, cost: 0 },
  { code: 'SP0004', name: 'KHÍ CỤ NÂNG KHỚP', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Cái', price: 1500000, cost: 0 },
  { code: 'DV0058', name: 'Làm sạch chuyên sâu Clean Teeth', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Ca', price: 380000, cost: 0 },
  { code: 'DV0052', name: 'Laser Cắt lợi trùm (răng khôn)', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 1500000, cost: 0 },
  { code: 'DV0053', name: 'Laser Cắt Phanh môi (điều trị răng hô)', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 1500000, cost: 0 },
  { code: 'DV0057', name: 'Lấy cao răng', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Ca', price: 300000, cost: 0 },
  { code: 'SP0302', name: 'MÀI CHỈNH', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'RĂNG', price: 1, cost: 0 },
  { code: 'SP0234', name: 'MÀI RĂNG', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'CÁI', price: 1, cost: 0 },
  { code: 'SP0242', name: 'Máng chống nghiến', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'đồng', price: 1500000, cost: 0 },
  { code: 'SP0005', name: 'Nạo Nha Chu', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 1000000, cost: 0 },
  { code: 'SP0235', name: 'NHỔ RĂNG SỮA BÔI TÊ', canOrderLab: false, category: 'Điều trị tổng quát', unit: '0', price: 1, cost: 0 },
  { code: 'SP0011', name: 'NÚT GỠ', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'cái', price: 3000000, cost: 0 },
  { code: 'SP0285', name: 'Phá composite răng khểnh', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'răng', price: 1, cost: 0 },
  { code: 'DV0050', name: 'Phẫu thuật cưỡi hở lợi', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 1200000, cost: 0 },
  { code: 'SP0254', name: 'Phí quẹt thẻ', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'đồng', price: 150000, cost: 0 },
  { code: 'SP0255', name: 'Phí quẹt thẻ', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'đồng', price: 150000, cost: 0 },
  { code: 'SP0266', name: 'Răng tạm', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 500000, cost: 0 },
  { code: 'DV0055', name: 'Tẩy trắng răng tại nhà', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Ca', price: 800000, cost: 0 },
  { code: 'DV0054', name: 'Tẩy trắng răng tại Phòng khám', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Ca', price: 1500000, cost: 0 },
  { code: 'SP0236', name: 'THÁO SỨ', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'RĂNG', price: 300000, cost: 0 },
  { code: 'SP0298', name: 'Tiểu phẫu bộc lộ răng ngầm', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'răng', price: 1000000, cost: 0 },
  { code: 'SP0287', name: 'Trám cổ răng', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'răng', price: 1, cost: 0 },
  { code: 'DV0049', name: 'Trám răng', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'Răng', price: 1000000, cost: 0 },
  { code: 'SP0239', name: 'Trám răng sữa', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'răng', price: 1, cost: 0 },
  { code: 'SP0279', name: 'Trám thẩm mỹ', canOrderLab: false, category: 'Điều trị tổng quát', unit: 'cái', price: 1, cost: 0 },

  // Implant
  { code: 'DV0034', name: 'Abutment', canOrderLab: true, category: 'Implant', unit: 'Răng', price: 3000000, cost: 0 },
  { code: 'DV0028', name: 'Full Implant Hàn Quốc', canOrderLab: true, category: 'Implant', unit: 'Răng', price: 22000000, cost: 0 },
  { code: 'DV0024', name: 'Full Implant Mỹ', canOrderLab: true, category: 'Implant', unit: 'Răng', price: 24000000, cost: 0 },
  { code: 'DV0025', name: 'Full Implant Pháp', canOrderLab: true, category: 'Implant', unit: 'Răng', price: 27000000, cost: 0 },
  { code: 'DV0027', name: 'Full Implant Thụy Điển', canOrderLab: true, category: 'Implant', unit: 'Răng', price: 39000000, cost: 0 },
  { code: 'DV0026', name: 'Full Implant Thụy Sĩ', canOrderLab: true, category: 'Implant', unit: 'Răng', price: 36000000, cost: 0 },
  { code: 'SP0240', name: 'KHUNG TITAN', canOrderLab: false, category: 'Implant', unit: 'CÁI', price: 35000000, cost: 0 },
  { code: 'DV0035', name: 'Mão sứ', canOrderLab: true, category: 'Implant', unit: 'Răng', price: 8000000, cost: 0 },
  { code: 'DV0036', name: 'Phẫu thuật ghép xương bột', canOrderLab: false, category: 'Implant', unit: 'Đơn vị', price: 8000000, cost: 0 },
  { code: 'DV0037', name: 'Phẫu thuật lấy trụ Implant cũ', canOrderLab: false, category: 'Implant', unit: 'Răng', price: 3000000, cost: 0 },
  { code: 'DV0038', name: 'Phẫu thuật nâng xoang hở', canOrderLab: false, category: 'Implant', unit: 'Đơn vị', price: 15000000, cost: 0 },
  { code: 'DV0039', name: 'Phẫu thuật nâng xoang kín', canOrderLab: false, category: 'Implant', unit: 'Đơn vị', price: 6000000, cost: 0 },

  // KHÍ CỤ TWINBLOCK
  { code: 'SP0297', name: 'KHÍ CỤ TWINBLOCK', canOrderLab: false, category: 'KHÍ CỤ TWINBLOCK', unit: 'KHÍ CỤ', price: 1, cost: 0 },

  // Máy tăm nước (Water Flosser)
  { code: 'PROCARE A3', name: 'MÁY TĂM NƯỚC PROCARE A3', canOrderLab: false, category: 'Máy tăm nước', unit: 'cái', price: 1200000, cost: 0 },
  { code: 'SP0270', name: 'Máy tăm nước Prosencor', canOrderLab: false, category: 'Máy tăm nước', unit: 'cái', price: 1300000, cost: 0 },

  // Nhổ răng (Tooth Extraction)
  { code: 'SP0272', name: 'Chấm thuốc', canOrderLab: false, category: 'Nhổ răng', unit: 'lần', price: 1, cost: 0 },
  { code: 'SP0267', name: 'Nhổ chân R26', canOrderLab: false, category: 'Nhổ răng', unit: 'cái', price: 700000, cost: 0 },
  { code: 'SP0257', name: 'Nhổ chân răng số 6', canOrderLab: false, category: 'Nhổ răng', unit: 'cái', price: 500000, cost: 0 },
  { code: 'DV0042', name: 'Nhổ chân răng Vĩnh viễn', canOrderLab: false, category: 'Nhổ răng', unit: 'Răng', price: 1000000, cost: 0 },
  { code: 'SP0214', name: 'nhổ răng dư', canOrderLab: false, category: 'Nhổ răng', unit: 'đồng', price: 1, cost: 0 },
  { code: 'SP0284', name: 'Nhổ răng kẹ', canOrderLab: false, category: 'Nhổ răng', unit: 'cái', price: 1, cost: 0 },
  { code: 'DV0045', name: 'Nhổ răng khôn hàm dưới', canOrderLab: false, category: 'Nhổ răng', unit: 'Răng', price: 4000000, cost: 0 },
  { code: 'DV0044', name: 'Nhổ răng khôn hàm trên', canOrderLab: false, category: 'Nhổ răng', unit: 'Răng', price: 3500000, cost: 0 },
  { code: 'DV0046', name: 'Nhổ răng ngầm', canOrderLab: false, category: 'Nhổ răng', unit: 'Răng', price: 7000000, cost: 0 },
  { code: 'SP0276', name: 'Nhổ răng sữa', canOrderLab: false, category: 'Nhổ răng', unit: 'cái', price: 1, cost: 0 },
  { code: 'SP0215', name: 'Nhổ răng sữa chích tê', canOrderLab: false, category: 'Nhổ răng', unit: '1', price: 100000, cost: 0 },
  { code: 'DV0043', name: 'Nhổ răng thừa, lạc chỗ', canOrderLab: false, category: 'Nhổ răng', unit: 'Răng', price: 2200000, cost: 0 },
  { code: 'DV0041', name: 'Nhổ răng Vĩnh viễn', canOrderLab: false, category: 'Nhổ răng', unit: 'Răng', price: 2200000, cost: 0 },
  { code: 'DV0040', name: 'Răng sữa', canOrderLab: false, category: 'Nhổ răng', unit: 'Răng', price: 0, cost: 0 },
  { code: 'SP0262', name: 'Tiểu phẫu răng', canOrderLab: false, category: 'Nhổ răng', unit: 'đ', price: 1200000, cost: 0 },

  // Niềng răng (Braces/Orthodontics)
  { code: 'SP0299', name: 'CHỈNH DÂY FIX', canOrderLab: false, category: 'Niềng răng', unit: 'RĂNG', price: 1, cost: 0 },
  { code: 'SP0305', name: 'Band', canOrderLab: false, category: 'Niềng răng', unit: 'Cái', price: 300000, cost: 0 },
  { code: 'SP0292', name: 'Bộ Mắc Cài Kim Loại Tiêu Chuẩn', canOrderLab: false, category: 'Niềng răng', unit: 'Bộ', price: 1, cost: 0 },
  { code: 'SP0293', name: 'Bộ mắc cài kim loại tự đóng', canOrderLab: false, category: 'Niềng răng', unit: 'Bộ', price: 2500000, cost: 0 },
  { code: 'SP0294', name: 'Bộ mắc cài sứ tiêu chuẩn', canOrderLab: false, category: 'Niềng răng', unit: 'Bộ', price: 3500000, cost: 0 },
  { code: 'SP0295', name: 'Bộ mắc cài sứ tự đóng', canOrderLab: false, category: 'Niềng răng', unit: 'Bộ', price: 4500000, cost: 0 },
  { code: 'SP0258', name: 'Cắm 4 vít', canOrderLab: false, category: 'Niềng răng', unit: 'cái', price: 2000000, cost: 0 },
  { code: 'SP0282', name: 'Cắt dây cung', canOrderLab: false, category: 'Niềng răng', unit: 'lần', price: 1, cost: 0 },
  { code: 'SP0278', name: 'CẮT THẮNG MÔI', canOrderLab: false, category: 'Niềng răng', unit: 'ĐỒNG', price: 1000000, cost: 0 },
  { code: 'SP0300', name: 'CHỈNH DÂY FIX', canOrderLab: false, category: 'Niềng răng', unit: 'RĂNG', price: 1, cost: 0 },
  { code: 'SP0264', name: 'Chun chỉnh nha', canOrderLab: false, category: 'Niềng răng', unit: 'túi', price: 50000, cost: 0 },
  { code: 'DV0010', name: 'Cục cắn', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 50000, cost: 0 },
  { code: 'SP0251', name: 'Gắn Lại Dây Cung', canOrderLab: false, category: 'Niềng răng', unit: 'đ', price: 100000, cost: 0 },
  { code: 'SP0249', name: 'GẮN LẠI MẮC CÀI', canOrderLab: false, category: 'Niềng răng', unit: 'VND', price: 100000, cost: 0 },
  { code: 'SP0271', name: 'Gói niềng tiền chỉnh nha', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 15000000, cost: 0 },
  { code: 'SP0280', name: 'Hàm cung khẩu cái', canOrderLab: false, category: 'Niềng răng', unit: 'Hàm', price: 1, cost: 0 },
  { code: 'SP0275', name: 'Hàm cung lưỡi', canOrderLab: false, category: 'Niềng răng', unit: 'hàm', price: 1, cost: 0 },
  { code: 'DV0009', name: 'Hàm duy trì', canOrderLab: true, category: 'Niềng răng', unit: 'Ca', price: 4000000, cost: 0 },
  { code: 'SP0301', name: 'Hàm giữ khoảng', canOrderLab: false, category: 'Niềng răng', unit: 'hàm', price: 1, cost: 0 },
  { code: 'SP0012', name: 'KHAY TRONG SUỐT', canOrderLab: false, category: 'Niềng răng', unit: '1', price: 60000000, cost: 0 },
  { code: 'SP0006', name: 'KHÍ CỤ ĐỊNH VỊ HÀM', canOrderLab: false, category: 'Niềng răng', unit: 'Hàm', price: 2000000, cost: 0 },
  { code: 'SP0007', name: 'KHÍ CỤ NONG HÀM NHANH', canOrderLab: false, category: 'Niềng răng', unit: 'Hàm', price: 4000000, cost: 0 },
  { code: 'SP0003', name: 'KHÍ CỤ NONG HÀM THƯỜNG', canOrderLab: false, category: 'Niềng răng', unit: 'Hàm', price: 2500000, cost: 0 },
  { code: 'SP0256', name: 'Khí Cụ Tật Lưỡi', canOrderLab: false, category: 'Niềng răng', unit: 'Cái', price: 5000000, cost: 0 },
  { code: 'DV0006', name: 'Mắc cài kim loại lẻ', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 100000, cost: 0 },
  { code: 'SP0291', name: 'MẮC CÀI KIM LOẠI TIÊU CHUẨN', canOrderLab: false, category: 'Niềng răng', unit: '19000000', price: 1, cost: 0 },
  { code: 'DV0005', name: 'Mắc cài sứ lẻ', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 200000, cost: 0 },
  { code: 'SP0008', name: 'MẶT PHẲNG NGHIÊNG - CHỈNH NHA', canOrderLab: false, category: 'Niềng răng', unit: 'Hàm', price: 2000000, cost: 0 },
  { code: 'SP0009', name: 'MẶT PHẲNG NGHIÊNG - TRẺ EM', canOrderLab: false, category: 'Niềng răng', unit: 'Hàm', price: 4000000, cost: 0 },
  { code: 'SP0260', name: 'MCKL số 37', canOrderLab: false, category: 'Niềng răng', unit: 'cái', price: 1, cost: 0 },
  { code: 'DV0007', name: 'Mini vis', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 2000000, cost: 0 },
  { code: 'SP0277', name: 'Niềng Mắc Cài Cánh Cam', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 40000000, cost: 0 },
  { code: 'SP0263', name: 'Niềng mắc cài kim loại mặt lưỡi', canOrderLab: false, category: 'Niềng răng', unit: 'đ', price: 30000000, cost: 0 },
  { code: 'DV0001', name: 'Niềng Mắc Cài Kim Loại Tiêu Chuẩn', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 28000000, cost: 0 },
  { code: 'DV0002', name: 'Niềng Mắc Cài Kim Loại Tự Buộc 3M', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 32000000, cost: 0 },
  { code: 'DV0004', name: 'Niềng Mắc Cài Sứ Loại Tự Buộc 3M', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 45000000, cost: 0 },
  { code: 'DV0003', name: 'Niềng Mắc Cài Sứ Tiêu Chuẩn', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 39000000, cost: 0 },
  { code: 'SP0268', name: 'Niềng răng phân đoạn', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 30000000, cost: 0 },
  { code: 'SP0217', name: 'Niềng răng trong suốt', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 80000000, cost: 0 },
  { code: 'DV0008', name: 'Niềng trong suốt Invisalign', canOrderLab: true, category: 'Niềng răng', unit: 'Ca', price: 140000000, cost: 0 },
  { code: 'SP0304', name: 'Phí chênh lệch cấp độ', canOrderLab: false, category: 'Niềng răng', unit: 'Ca', price: 5000000, cost: 0 },
  { code: 'SP0250', name: 'Phí trễ hẹn', canOrderLab: false, category: 'Niềng răng', unit: 'đ', price: 112000, cost: 0 },
  { code: 'SP0002', name: 'Sáp chỉnh nha', canOrderLab: false, category: 'Niềng răng', unit: 'hộp', price: 20000, cost: 0 },
  { code: 'SP0281', name: 'Tạo Khoảng Phục Hình', canOrderLab: false, category: 'Niềng răng', unit: '1', price: 4000000, cost: 0 },
  { code: 'SP0289', name: 'Tháo mắc cài', canOrderLab: false, category: 'Niềng răng', unit: 'hàm', price: 1, cost: 0 },
  { code: 'SP0010', name: 'THÁO MẮC CÀI CŨ', canOrderLab: false, category: 'Niềng răng', unit: 'Hàm', price: 1500000, cost: 0 },
  { code: 'SP0219', name: 'THAY THUN', canOrderLab: false, category: 'Niềng răng', unit: 'Hàm', price: 100000, cost: 0 },
  { code: 'SP0241', name: 'TINH CHỈNH RĂNG TIẾP TỤC', canOrderLab: false, category: 'Niềng răng', unit: 'Đ', price: 3000000, cost: 0 },

  // Phẫu thuật và điều trị (Surgery and Treatment)
  { code: 'SP0283', name: 'cắt lợi', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'răng', price: 1, cost: 0 },
  { code: 'DV0059', name: 'Chích áp xe lợi', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 450000, cost: 0 },
  { code: 'DV0060', name: 'Điều trị áp xe quanh răng mạn', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 750000, cost: 0 },
  { code: 'DV0061', name: 'Điều trị nhạy cảm ngà bằng máng với thuốc chống ê buốt', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 300000, cost: 0 },
  { code: 'DV0062', name: 'Phẫu thuật cắt cuống răng', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 5800000, cost: 0 },
  { code: 'DV0063', name: 'Phẫu thuật cắt nạo ổ xương', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 6000000, cost: 0 },
  { code: 'DV0064', name: 'Phẫu thuật nạo quanh cuống răng', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 4300000, cost: 0 },
  { code: 'DV0065', name: 'Phẫu thuật nhổ răng có tạo hình xương ổ răng', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 1800000, cost: 0 },
  { code: 'DV0066', name: 'Phẫu thuật tạo hình xương ổ răng', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 2900000, cost: 0 },
  { code: 'DV0067', name: 'Phục hồi thân răng có sử dụng pin ngà', canOrderLab: false, category: 'Phẫu thuật và điều trị', unit: 'Răng', price: 600000, cost: 0 },

  // Phục hình (Prosthodontics)
  { code: 'SP0273', name: 'Răng nhựa', canOrderLab: false, category: 'Phục hình', unit: 'cái', price: 1, cost: 0 },
  { code: 'SP0001', name: 'Răng tháo lắp', canOrderLab: false, category: 'Phục hình', unit: 'cái', price: 2000000, cost: 0 },
];

/**
 * Get services by category
 */
export function getServicesByCategory(category: string): ServiceItem[] {
  return SERVICE_CATALOG_DATA.filter(service => service.category === category);
}

/**
 * Get all service categories with counts
 */
export function getCategoryStats(): { category: string; count: number; avgPrice: number }[] {
  return SERVICE_CATEGORIES.map(category => {
    const services = getServicesByCategory(category);
    const avgPrice = services.length > 0
      ? services.reduce((sum, s) => sum + s.price, 0) / services.length
      : 0;
    return {
      category,
      count: services.length,
      avgPrice: Math.round(avgPrice),
    };
  }).filter(c => c.count > 0);
}

/**
 * Search services by name or code
 */
export function searchServices(query: string): ServiceItem[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return SERVICE_CATALOG_DATA;
  
  return SERVICE_CATALOG_DATA.filter(
    service =>
      service.name.toLowerCase().includes(normalizedQuery) ||
      service.code.toLowerCase().includes(normalizedQuery)
  );
}
