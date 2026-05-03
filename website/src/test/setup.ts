import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock Storage APIs for jsdom compatibility
class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: new MockStorage(),
});

Object.defineProperty(window, 'sessionStorage', {
  writable: true,
  value: new MockStorage(),
});

const TEST_TRANSLATIONS: Record<string, string> = {
  'phase.scheduled': 'Đang hẹn',
  'phase.waiting': 'Đang chờ',
  'phase.in-treatment': 'Đang khám',
  'phase.done': 'Hoàn tất',
  'phase.cancelled': 'Đã hủy',
  addAppointmentAt: 'Thêm lịch hẹn lúc {{time}}',
  cancelAppointment: 'Hủy hẹn',
  clearSelection: 'Bỏ chọn',
  dKin: 'Dự kiến',
  faceId: 'Nhận diện khuôn mặt',
  'faceCapture.cameraError': 'Không thể truy cập camera. Vui lòng cấp quyền.',
  'faceCapture.capture': 'Chụp',
  'faceCapture.title': 'Chụp ảnh khuôn mặt',
  iTrngThi: 'Đổi trạng thái',
  lchHn: 'Lịch hẹn',
  noDoctorsFound: 'Không tìm thấy bác sĩ',
  quickAdd: 'Thêm nhanh',
  searchByNameOrRole: 'Tìm theo tên hoặc vai trò...',
  thanhTonVietqr: 'Thanh toán VietQR',
  qutMQrChuynKhon: 'Quét mã QR chuyển khoản',
  sTinVnd: 'Số tiền (VND)',
  niDungChuynKhon: 'Nội dung chuyển khoản',
  toQr: 'Tạo QR',
  vuiLngCuHnhTiKhonNgnHngTrongCiT: 'Vui lòng cấu hình tài khoản ngân hàng trong cài đặt',
};

function interpolate(template: string, options?: Record<string, unknown>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(options?.[key] ?? ''));
}

function translateForTest(key: string, options?: Record<string, unknown> | string) {
  if (typeof options === 'string') {
    return TEST_TRANSLATIONS[key] ?? options;
  }
  const defaultValue = typeof options?.defaultValue === 'string' ? options.defaultValue : undefined;
  return interpolate(TEST_TRANSLATIONS[key] ?? defaultValue ?? key, options);
}

// Mock react-i18next with the small locale surface needed by component tests.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translateForTest,
    i18n: { language: 'vi', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));
