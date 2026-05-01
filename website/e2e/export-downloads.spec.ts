import { test, expect, type Page } from '@playwright/test';
import XLSX from 'xlsx-js-style';
import fs from 'node:fs/promises';
import path from 'node:path';

type ExportCase = {
  readonly route: string;
  readonly savedAs: string;
  readonly headers: readonly string[];
  readonly dateHeader?: string;
  readonly numericHeader?: string;
  readonly needsDateRange?: boolean;
};

const EXPORT_CASES: readonly ExportCase[] = [
  {
    route: '/customers',
    savedAs: 'customers.xlsx',
    headers: ['Mã KH', 'Tên khách hàng', 'SĐT', 'Giới tính', 'Ngày sinh', 'Nguồn', 'Sale', 'CSKH', 'Chi nhánh', 'Địa chỉ', 'Ghi chú', 'Ngày tạo', 'Trạng thái'],
    dateHeader: 'Ngày tạo',
  },
  {
    route: '/calendar',
    savedAs: 'appointments.xlsx',
    headers: ['Mã lịch hẹn', 'Ngày giờ hẹn', 'Mã KH', 'Khách hàng', 'SĐT', 'Dịch vụ', 'Bác sĩ', 'Chi nhánh', 'Loại hẹn', 'Trạng thái', 'Nội dung', 'Ghi chú'],
    dateHeader: 'Ngày giờ hẹn',
    needsDateRange: true,
  },
  {
    route: '/services',
    savedAs: 'services.xlsx',
    headers: ['Số phiếu', 'Ngày tạo', 'Mã KH', 'Khách hàng', 'Dịch vụ', 'Số lượng', 'Răng', 'Bác sĩ', 'Phụ tá', 'Trợ lý BS', 'Nguồn', 'Tổng tiền', 'Đã thu', 'Còn lại', 'Trạng thái', 'Chi nhánh', 'Ghi chú'],
    dateHeader: 'Ngày tạo',
    numericHeader: 'Tổng tiền',
  },
  {
    route: '/payment',
    savedAs: 'payments.xlsx',
    headers: ['Mã phiếu thu', 'Ngày thanh toán', 'Mã KH', 'Khách hàng', 'SĐT', 'Số tiền', 'Phương thức', 'Trạng thái', 'Số phiếu điều trị', 'Nội dung', 'Chi nhánh'],
    dateHeader: 'Ngày thanh toán',
    numericHeader: 'Số tiền',
  },
  {
    route: '/service-catalog',
    savedAs: 'service-catalog.xlsx',
    headers: ['Mã dịch vụ', 'Tên dịch vụ', 'Nhóm dịch vụ', 'Đơn vị', 'Giá niêm yết', 'Giá bán', 'Giá labo', 'Chi nhánh', 'Trạng thái', 'Ngày tạo', 'Cập nhật lần cuối'],
    dateHeader: 'Ngày tạo',
    numericHeader: 'Giá niêm yết',
  },
];

async function triggerExport(page: Page, exportCase: ExportCase) {
  await page.goto(exportCase.route);
  await expect(page.getByRole('button', { name: /Xuất dữ liệu|Export Data/i }).first()).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: /Xuất dữ liệu|Export Data/i }).first().click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Xuất Excel|Export Excel/i }).click();

  if (exportCase.needsDateRange) {
    await expect(page.getByText(/Chọn khoảng|Select date range/i)).toBeVisible();
    await page.getByRole('button', { name: /3 ngày/i }).click();
    await page.getByRole('button', { name: /Áp dụng|Apply/i }).click();
  }

  return downloadPromise;
}

async function expectWorkbookShape(filePath: string, exportCase: ExportCase) {
  const workbookBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(workbookBuffer, { type: 'buffer', cellDates: true });
  expect(workbook.SheetNames).toEqual(expect.arrayContaining(['Data', 'Summary', 'Filters']));

  const dataSheet = workbook.Sheets.Data;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(dataSheet, { header: 1, defval: '' });
  expect(rows.length).toBeGreaterThan(1);
  expect(rows[0]).toEqual(exportCase.headers);

  if (exportCase.dateHeader) {
    const dateIndex = exportCase.headers.indexOf(exportCase.dateHeader);
    const dateValues = rows.slice(1, 30).map((row) => row[dateIndex]).filter(Boolean);
    expect(dateValues.length).toBeGreaterThan(0);
  }

  if (exportCase.numericHeader) {
    const numberIndex = exportCase.headers.indexOf(exportCase.numericHeader);
    const firstDataCell = XLSX.utils.encode_cell({ r: 1, c: numberIndex });
    expect(dataSheet[firstDataCell]?.t).toBe('n');
  }
}

test.describe('operational Excel exports', () => {
  for (const exportCase of EXPORT_CASES) {
    test(`${exportCase.route} downloads a formatted XLSX workbook`, async ({ page }, testInfo) => {
      const outputDir = process.env.EXPORT_E2E_DOWNLOAD_DIR || testInfo.outputPath('downloads');
      await fs.mkdir(outputDir, { recursive: true });

      const download = await triggerExport(page, exportCase);
      const targetPath = path.join(outputDir, exportCase.savedAs);
      await download.saveAs(targetPath);

      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
      expect(page.url()).not.toContain('blob:');
      await expectWorkbookShape(targetPath, exportCase);
    });
  }
});
