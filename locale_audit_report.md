# I18n Locale File Consistency Review Report

**Audited path:** `/Users/thuanle/Documents/TamTMV/Tgroup-I18/website/src/i18n/locales/`  
**Namespaces reviewed:** 20 (appointments, auth, calendar, commission, common, customers, employees, feedback, locations, nav, notifications, overview, payment, permissions, relationships, reports, services, settings, website, serviceCatalog)  
**Files checked:** 40 (vi/*.json + en/*.json)

---

## Overall Verdict: FAIL

Significant lazy fallback pollution exists in English files (~270+ keys still in Vietnamese). One orphaned key pair and one duplicate key were also found. Fixes are required before merge.

---

## 1. Missing English Translations (vi key exists, en key missing)

| File | Key | vi text |
|------|-----|---------|
| en/services.json | `close` | `Đóng` (present in vi) |
| en/services.json | `save` | `Lưu` (present in vi) |

**Note:** In en/services.json the romanized keys `ng` ("Đóng") and `lu` ("Lưu") exist, but the canonical English keys `close` and `save` are missing.

---

## 2. Missing Vietnamese Translations (en key exists, vi key missing)

| File | Key | en text |
|------|-----|---------|
| *(none found)* | — | — |

All English keys have matching Vietnamese keys.

---

## 3. English Keys Still in Vietnamese (Lazy Fallbacks)

### appointments.json — 16 keys
- `angTiDLiu` → "Đang tải dữ liệu..."
- `thngTinCBn` → "Thông tin cơ bản"
- `thmKhchHngMi` → "Thêm khách hàng mới"
- `chnBcS` → "Chọn bác sĩ..."
- `phTKhngBtBuc` → "Phụ tá (không bắt buộc)"
- `chnPhT` → "Chọn phụ tá..."
- `trLBcSKhngBtBuc` → "Trợ lý bác sĩ (không bắt buộc)"
- `chnTrL` → "Chọn trợ lý..."
- `angTiDanhMcDchV` → "Đang tải danh mục dịch vụ..."
- `chnDchV` → "Chọn dịch vụ..."
- `lnKhm` → "lần khám · ~"
- `tnhNngNhcLchSCKchHotSau` → "Tính năng nhắc lịch sẽ được kích hoạt sau"
- `hyB` → "Hủy bỏ"
- `cpNht` → "Cập nhật"
- `thuGnChiTit` → "Thu gọn chi tiết"
- `mRngChiTit` → "Mở rộng chi tiết"

### calendar.json — 26 keys
- `hyHn` → "Hủy hẹn"
- `ttC` → "Tất cả"
- `thmLchHn` → "Thêm lịch hẹn"
- `xutDLiuLchHn` → "Xuất dữ liệu lịch hẹn"
- `theoBLcHinTi` → "Theo bộ lọc hiện tại"
- `theoKhongThigian` → "Theo khoảng thờigian"
- `ng` → "Đóng"
- `xutFile` → "Xuất file"
- `lchHn` → "Lịch hẹn"
- `dKin` → "Dự kiến"
- `tiuSBnh` → "Tiểu sử bệnh"
- `angTi` → "Đang tải..."
- `chaCThngTinTiuSBnh` → "Chưa có thông tin tiểu sử bệnh"
- `tKhmGnY` → "Đợt khám gần đây"
- `n` → "Đã đến: ("
- `angHn` → "Đang hẹn: ("
- `hyHn1` → "Hủy hẹn: ("
- `bLc` → "Bộ lọc"
- `bcS` → "Bác sĩ"
- `trngThi` → "Trạng thái"
- `nhnMu` → "Nhãn màu"
- `xaBLc` → "Xóa bộ lọc"
- `lc` → "Lọc"
- `iTrngThi` → "Đổi trạng thái"
- `hmNay` → "Hôm nay"
- `khngTmThyKtQu` → "Không tìm thấy kết quả"

### common.json — 51 keys
- `iMtKhu` → "Đổi mật khẩu"
- `khngTmThy` → "Không tìm thấy"
- `saLchHn` → "Sửa lịch hẹn"
- `bnhNhn` → "Bệnh nhân"
- `bnhNhnLinKt` → "Bệnh nhân đã liên kết"
- `giKtThc` → "Giờ kết thúc"
- `pht` → "phút)"
- `bcS` → "Bác sĩ"
- `chn` → "Đã chọn:"
- `phTKhngBtBuc` → "Phụ tá (không bắt buộc)"
- `chnPhT` → "Chọn phụ tá..."
- `trLBcSKhngBtBuc` → "Trợ lý bác sĩ (không bắt buộc)"
- `chnTrL` → "Chọn trợ lý..."
- `chiNhnh` → "Chi nhánh"
- `dchV` → "Dịch vụ"
- `thiGianDKin` → "Thờigian dự kiến"
- `pht1` → "phút"
- `loiKhch` → "Loại khách"
- `khchMi` → "Khách mới"
- `tiKhm` → "Tái khám"
- `trngThi` → "Trạng thái"
- `muTh` → "Màu thẻ"
- `ghiCh` → "Ghi chú"
- `hyB` → "Hủy bỏ"
- `angLu` → "Đang lưu..."
- `luThayI` → "Lưu thay đổi"
- `ng` → "Đóng"
- `lchHnHmNay` → "Lịch hẹn hôm nay"
- `tmNhanhLchHn` → "Tìm nhanh lịch hẹn..."
- `khngCLchHn` → "Không có lịch hẹn"
- `n` → "Đã đến"
- `hyHn` → "Hủy hẹn"
- `angHn` → "Đang hẹn"
- `hngDnToFileEnvViVitegoogleplacesapikeyyourkey` → "Hướng dẫn: Tạo file .env với VITE_GOOGLE_PLACES_API_KEY=..."
- `khngTmThyAChPhHp` → "Không tìm thấy địa chỉ phù hợp"
- `khngTmThyNgnHng` → "Không tìm thấy ngân hàng"
- `cpNhtMtKhuNgNhpCaBn` → "Cập nhật mật khẩu đăng nhập của bạn"
- `iMtKhuThnhCng` → "Đổi mật khẩu thành công!"
- `bnCThNgNhpBngMtKhuMi` → "Bạn có thể đăng nhập bằng mật khẩu mới"
- `mtKhuHinTi` → "Mật khẩu hiện tại"
- `nhpMtKhuHinTi` → "Nhập mật khẩu hiện tại"
- `mtKhuMi` → "Mật khẩu mới"
- `nhpMtKhuMiTNht6KT` → "Nhập mật khẩu mới (ít nhất 6 ký tự)"
- `xcNhnMtKhuMi` → "Xác nhận mật khẩu mới"
- `nhpLiMtKhuMi` → "Nhập lại mật khẩu mới"
- `angXL` → "Đang xử lý..."
- `khngTmThyKtQuBnCThNhpTrcTip` → "Không tìm thấy kết quả. Bạn có thể nhập trực tiếp."
- `khngTmThyKhchHng` → "Không tìm thấy khách hàng"
- `toKhchHngMi` → "Tạo khách hàng mới"
- `hmNay` → "Hôm nay"
- `xaLaChn` → "Xóa lựa chọn"
- `chp` → "Chụp"
- `hy` → "Hủy"
- `khngTmThyBcS` → "Không tìm thấy bác sĩ"
- `bcS1` → "bác sĩ"
- `chnGi` → "Chọn giờ"
- `chn1` → "Đã chọn"
- `cpNhtMtKhu` → "Cập nhật mật khẩu"
- `chnNgyBtU` → "Chọn ngày bắt đầu"
- `chnKhongNgy` → "Chọn khoảng ngày"
- `tingVit` → "🇻🇳 Tiếng Việt"

### customers.json — 46 keys
- `chaGn` → "— Chưa gán"
- `phnCng` → "PHÂN CÔNG"
- `phnCngKhchHng` → "Phân công khách hàng"
- `thngTinPhTrchKhchHng` → "Thông tin phụ trách khách hàng."
- `ngiGiiThiu` → "NGƯỜI GIỚI THIỆU"
- `khngNhnDinC` → "Không nhận diện được"
- `hy` → "Hủy"
- `ng` → "Đóng"
- `xaThanhTon` → "Xóa thanh toán?"
- `bnCChcMunXaBnGhiThanhTonNyHnhNgNyKhngThHonTc` → "Bạn có chắc muốn xóa bản ghi thanh toán này? Hành động này không thể hoàn tác."
- `tiuSBnh` → "Tiểu sử bệnh"
- `xa` → "Xóa"
- `xaMm` → "Xóa mềm"
- `xaVnhVin` → "Xóa vĩnh viễn"
- `tngTinIuTr` → "Tổng tiền điều trị"
- `thanhTon` → "Đã thanh toán"
- `cnN` → "Còn nợ"
- `thmLchKhm` → "Thêm lịch khám"
- `dchV` → "Dịch vụ"
- `bcSKhm` → "Bác sĩ khám"
- `ngyKhm` → "Ngày khám"
- `niDungKhm` → "Nội dung khám"
- `ngyHnLchTipTheo` → "Ngày hẹn lịch tiếp theo"
- `niDungHnKhmTip` → "Nội dung hẹn khám tiếp"
- `ngyHnTipTheo` → "Ngày hẹn tiếp theo"
- `tpNhKm` → "Tệp đính kèm"
- `thmLch` → "Thêm lịch"
- `chaCGi` → "Chưa có giá"
- `liLuDLiu` → "Lỗi lưu dữ liệu"
- `chiTit` → "Chi tiết:"
- `trngLi` → "Trường lỗi:"
- `gi` → "Gợi ý:"
- `sKhnCp` → "Số khẩn cấp"
- `nhpTNht` → "Nhập ít nhất"
- `kTTmKimKhchHng` → "ký tự để tìm kiếm khách hàng"
- `bnCChcMun` → "Bạn có chắc muốn"
- `khchHng` → "khách hàng"
- `lchHn` → "lịch hẹn"
- `haN` → "hóa đơn"
- `tKhm` → "đợt khám"
- `angXL` → "Đang xử lý..."
- `thnhCng` → "Thành công"
- `angChp` → "Đang chụp..."
- `angXa` → "Đang xóa..."
- `dNgThuc` → "Dị ứng thuốc"
- `timMch` → "Tim mạch"
- `xaKhchHng` → "Xóa khách hàng"
- `xaVnhVin1` → "xóa vĩnh viễn"
- `xa1` → "xóa"

### employees.json — 26 keys
- `hVTn` → "Họ và tên"
- `inThoi` → "Điện thoại"
- `trngNuKhngMunThayIMtKhu` → "Để trống nếu không muốn thay đổi mật khẩu"
- `chiNhnh` → "Chi nhánh"
- `chiNhnhPh` → "Chi nhánh phụ"
- `chaCChiNhnhNo` → "Chưa có chi nhánh nào"
- `ttCChiNhnh` → "Tất cả chi nhánh"
- `cpBcQuynTier` → "Cấp bậc quyền (Tier)"
- `chnTier` → "-- Chọn tier --"
- `tierQuytNhQuynTruyCpCaNhnVinTrongHThng` → "Tier quyết định quyền truy cập của nhân viên trong hệ thống"
- `vTrVaiTr` → "Vị trí / Vai trò"
- `ngyBtU` → "Ngày bắt đầu"
- `trngThi` → "Trạng thái"
- `hyB` → "Hủy bỏ"
- `saNhnVin` → "Sửa nhân viên"
- `thmNhnVin` → "Thêm nhân viên"
- `cpNhtThngTinNhnVin` → "Cập nhật thông tin nhân viên"
- `toNhnVinMi` → "Tạo nhân viên mới"
- `tLiMtKhu` → "Đặt lại mật khẩu"
- `mtKhu` → "Mật khẩu"
- `trngNuKhngIMtKhu` → "Để trống nếu không đổi mật khẩu"
- `nhpMtKhu` → "Nhập mật khẩu"
- `angLmVic` → "Đang làm việc"
- `nghVic` → "Nghỉ việc"
- `cpNht` → "Cập nhật"
- `khngCChiNhnhPh` → "Không có chi nhánh phụ"

### locations.json — 3 keys
- `egTamDentistBnhDng` → "e.g., Tam Dentist Bình Dương"
- `123NgAbcPhngX` → "123 Đường ABC, Phường X"
- `egQun1` → "e.g., Quận 1"

### payment.json — 74 keys
- `ngyGiaoDch` → "Ngày giao dịch"
- `sTin` → "Số tiền"
- `phngThc` → "Phương thức"
- `tinMt` → "Tiền mặt"
- `chuynKhon` → "Chuyển khoản"
- `ghiChTyChn` → "Ghi chú (tùy chọn)"
- `toQr` → "Tạo QR"
- `hy` → "Hủy"
- `tmNgNg` → "Tạm ứng đã đóng"
- `tmNgCnLi` → "Tạm ứng còn lại"
- `tmNgDng` → "Tạm ứng đã dùng"
- `tmNgHon` → "Tạm ứng đã hoàn"
- `danhSchTmNg` → "Danh sách tạm ứng"
- `lchSSDng` → "Lịch sử sử dụng"
- `ngTmNg` → "Đóng tạm ứng"
- `honTmNg` → "Hoàn tạm ứng"
- `sPhieu` → "Số phiếu"
- `ngy` → "Ngày"
- `loi` → "Loại"
- `trngThi` → "Trạng thái"
- `thaoTc` → "Thao tác"
- `angTi` → "Đang tải..."
- `khngCDLieu` → "Không có dữ liệu"
- `sa` → "Sửa"
- `xa` → "Xóa"
- `ghiCh` → "Ghi chú"
- `khngCDLieuSDngTmNg` → "Không có dữ liệu sử dụng tạm ứng"
- `ca` → "củ a"
- `dng` → "dòng"
- `tngThanhTon` → "Tổng thanh toán"
- `ng` → "Đóng"
- `sDVDeposit` → "Số dư ví (Deposit)"
- `cnNOutstanding` → "Còn nợ (Outstanding)"
- `ngunThanhTon` → "Nguồn thanh toán"
- `ktHpNhiuNgunTiA` → "Kết hợp nhiều nguồn — tối đa"
- `cnLi` → "Còn lại:"
- `tVDeposit` → "Từ ví (Deposit)"
- `sn` → "Sẵn:"
- `dngTtC` → "Dùng tất cả"
- `tinMtCash` → "Tiền mặt (Cash)"
- `chuynKhonBank` → "Chuyển khoản (Bank)"
- `tV` → "Từ ví"
- `tGiiHnCnNCaDchV` → "Đã đạt giới hạn còn nợ của dịch vụ"
- `ngyThanhTon` → "Ngày thanh toán"
- `mThamChiuGhiChNhanh` → "Mã tham chiếu / Ghi chú nhanh"
- `hyB` → "Hủy bỏ"
- `ghiNhn` → "Ghi nhận"
- `thanhTon` → "Đã thanh toán đủ"
- `tngChiPh` → "Tổng chi phí"
- `thanhTon1` → "Đã thanh toán"
- `cnN` → "Còn nợ"
- `tr` → "% đã trả"
- `thanhTonVietqr` → "Thanh toán VietQR"
- `qutMQrChuynKhon` → "Quét mã QR để chuyển khoản"
- `sTinVnd` → "Số tiền (VND)"
- `niDungChuynKhon` → "Nội dung chuyển khoản"
- `vuiLngCuHnhTiKhonNgnHngTrongCiT` → "Vui lòng cấu hình tài khoản ngân hàng trong Cài đặt"
- `nhpSTinVNhnToQr` → `Nhập số tiền và nhấn "Tạo QR"`
- `nhXcNhnChuynKhon` → "Ảnh xác nhận chuyển khoản"
- `luXcNhnThanhTonThnhCng` → "Đã lưu xác nhận thanh toán thành công"
- `luThayI` → "Lưu thay đổi"
- `hon` → "Hoàn"
- `xcNhn` → "Đã xác nhận"
- `sTinNHinTi` → "Số tiền nợ hiện tại"
- `thanhTonN` → "Thanh toán nợ "
- `chnhSaThanhTon` → "Chỉnh sửa thanh toán"
- `ghiNhnThanhTon` → "Ghi nhận thanh toán"
- `sDTiAT` → "Số dư tối đa đã đạt"
- `haN` → "Hóa đơn"
- `tKhm` → "Đợt khám"
- `angLu` → "Đang lưu..."
- `xcNhnThanhTon` → "Xác nhận đã thanh toán"

### settings.json — 11 keys
- `angTi` → "Đang tải..."
- `tiKhonNgnHng` → "Tài khoản ngân hàng"
- `cuHnhTiKhonNhnThanhTonQrChoPhngKhm` → "Cấu hình tài khoản nhận thanh toán QR cho phòng khám"
- `mNgnHngBin` → "Mã ngân hàng (BIN)"
- `vD970436Vietcombank` → "Ví dụ: 970436 (Vietcombank)"
- `sTiKhon` → "Số tài khoản"
- `tnChTiKhon` → "Tên chủ tài khoản"
- `angLu` → "Đang lưu..."
- `lu` → "Lưu"
- `luCiTNgnHng` → "Đã lưu cài đặt ngân hàng"

### services.json — 20 keys
- `ngunKhchHng` → "Nguồn khách hàng"
- `chnRng` → "Chọn răng"
- `ghiChRng` → "Ghi chú răng"
- `nhpGhiChVRng` → "Nhập ghi chú về răng"
- `rngVnhVin` → "Răng vĩnh viễn"
- `rngSa` → "Răng sữa"
- `ng` → "Đóng"
- `lu` → "Lưu"
- `angIuTr` → "Đang điều trị"
- `honThnh` → "Hoàn thành"
- `hy` → "Đã hủy"
- `hmTrn` → "Hàm trên"
- `hmDi` → "Hàm dưới"
- `nguynHm` → "Nguyên hàm"
- `toothPickerTitle` → "Chọn răng"
- `tabAll` → "Chọn răng"
- `tabUpper` → "Hàm trên"
- `tabLower` → "Hàm dưới"
- `tabArch` → "Nguyên hàm"
- `permanentTeeth` → "Răng vĩnh viễn"
- `primaryTeeth` → "Răng sữa"

---

## 4. Structural Inconsistencies

### locations.json — Mixed nesting
Both `vi/locations.json` and `en/locations.json` contain a nested `form` object **and** a flat key `form.district` at the root level:
```json
"form": {
  "name": "...",
  "address": "..."
},
"form.district": "Quận/Huyện"
```
**Fix:** Move `district` inside the `form` object.

### services.json — Key asymmetry + duplication risk
- vi/services.json has both `ng`/`lu` (romanized) **and** `close`/`save` (canonical) at root.
- en/services.json has only `ng`/`lu`, and their values are still Vietnamese.
- en is missing the `close` and `save` keys entirely.
**Fix:** Add `close`/`save` to en, translate all four to English, and deprecate `ng`/`lu`.

---

## 5. Duplicate Keys (Same Level)

### payment.json (both languages)
- Root-level key `editDeposit` appears **twice** in both `vi/payment.json` and `en/payment.json`.
  - First occurrence: ~line 100 (next to `addDeposit`/`voidDeposit`)
  - Second occurrence: ~line 119 (next to `fullyPaid`)
- Both instances have the same value in vi, but different values in en:
  - en line 100: `"editDeposit": "Edit Deposit"`
  - en line 119: `"editDeposit": "Edit deposit slip"`
**Fix:** Remove the first duplicate; keep the second (more specific) value.

---

## 6. Total Keys Checked Per Namespace

| Namespace | vi keys | en keys | Fallbacks in en | Status |
|-----------|---------|---------|-----------------|--------|
| appointments | 65 | 65 | 16 | FAIL |
| auth | 18 | 18 | 0 | PASS |
| calendar | 75 | 75 | 26 | FAIL |
| commission | 4 | 4 | 0 | PASS |
| common | 172 | 172 | 51 | FAIL |
| customers | 166 | 164 | 46 | FAIL* |
| employees | 96 | 96 | 26 | FAIL |
| feedback | 2 | 2 | 0 | PASS |
| locations | 34 | 34 | 3 | FAIL |
| nav | 28 | 28 | 0 | PASS |
| notifications | 7 | 7 | 0 | PASS |
| overview | 50 | 50 | 0 | PASS |
| payment | 183 | 183 | 74 | FAIL |
| permissions | 37 | 37 | 0 | PASS |
| relationships | 4 | 4 | 0 | PASS |
| reports | 130 | 130 | 0 | PASS |
| services | 103 | 101 | 20 | FAIL* |
| settings | 63 | 63 | 11 | FAIL |
| website | 26 | 26 | 0 | PASS |
| serviceCatalog | 13 | 13 | 0 | PASS |

*customers and services have key-count mismatches (see Missing keys section).

---

## Required Fixes (Checklist)

1. **Translate all lazy fallback keys** in `appointments`, `calendar`, `common`, `customers`, `employees`, `locations`, `payment`, `settings`, `services` English files.
2. **Remove duplicate `editDeposit`** from `payment.json` (both languages).
3. **Move `form.district`** inside the `form` object in `locations.json` (both languages).
4. **Add missing `close` and `save`** to `en/services.json` and translate to English.
5. **Consolidate `ng`/`lu` vs `close`/`save`** in `services.json` (vi and en) — prefer canonical English keys.
6. **Verify empty-string keys** (`""`) in `common.json` and `payment.json` are intentional.
