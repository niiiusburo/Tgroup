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
  'faceCapture.cameraStarting': 'Đang mở camera...',
  'faceCapture.capture': 'Chụp',
  'faceCapture.scanning': 'Đang tìm khuôn mặt...',
  'faceCapture.faceDetected': 'Đã phát hiện khuôn mặt',
  'faceCapture.quality': 'Chất lượng',
  'faceCapture.profileStep': 'Bước {{current}}/{{total}}: {{pose}}',
  'faceCapture.poseStraight': 'Nhìn thẳng',
  'faceCapture.poseStraightHint': 'Giữ khuôn mặt trong khung.',
  'faceCapture.poseLeft': 'Quay đầu sang trái',
  'faceCapture.poseLeftHint': 'Từ từ quay đầu sang trái.',
  'faceCapture.poseRight': 'Quay đầu sang phải',
  'faceCapture.poseRightHint': 'Từ từ quay đầu sang phải.',
  'faceCapture.autoCapturing': 'Đang tự chụp...',
  'faceCapture.switchCamera': 'Đổi camera',
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
  // CTV module translations
  'card.showFrontFor': 'Xem hành trình theo dõi của {{name}}',
  'card.showServicesFor': 'Xem dịch vụ của {{name}}',
  'card.serviceCount': '{{count}} dịch vụ',
  'card.noServices': 'Chưa có dịch vụ',
  'card.servicesUnderReferral': 'Dịch vụ của khách giới thiệu này',
  'card.emptyBack': 'Chưa có dịch vụ đã thanh toán nào được ghi nhận cho khách giới thiệu này.',
  'card.tapToReturn': 'Chạm để quay lại hành trình theo dõi',
  'card.back': 'Quay lại',
  'card.openCustomer': 'Mở khách hàng',
  'card.copyLink': 'Sao chép liên kết',
  'card.linkCopied': 'Đã sao chép',
  'steps.referred': 'Ghi nhận',
  'steps.visited': 'Đã đến',
  'steps.serviced': 'Làm dịch vụ',
  'steps.paid': 'Thanh toán',
  expected: 'Dự kiến',
  paidOut: 'Đã chi trả',
  received: 'Đã nhận',
  'lobs.dental': 'Nha khoa',
  'lobs.cosmetic': 'Thẩm mỹ',
  'serviceStatus.pending': 'Chờ chi trả',
  'serviceStatus.paid': 'Đã chi trả',
  'serviceStatus.reversed': 'Đã hoàn',
  // CTV Dashboard specific
  'portal': 'Cổng CTV',
  'hello': 'Xin chào, {{name}}',
  'notifications': 'Thông báo',
  'forms.referClient.title': 'Khách giới thiệu',
  'forms.recruitCtv.title': 'Giới thiệu CTV',
  'hierarchy.title': 'Hệ thống giới thiệu CTV',
  'hierarchy.uplineTitle': 'Tuyến trên',
  'hierarchy.downlineTitle': 'Tuyến dưới',
  'tabs.home': 'Tổng quan',
  'tabs.commission': 'Hoa hồng',
  'tabs.referrals': 'Theo dõi',
  'tabs.network': 'Mạng lưới',
  'tabs.me': 'Tôi',
  'searchLabel': 'Tìm khách giới thiệu',
  'searchPlaceholder': 'Tìm khách...',
};

function interpolate(template: string, options?: Record<string, unknown>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(options?.[key] ?? ''));
}

const EN_TRANSLATIONS: Record<string, string> = {
  'card.showFrontFor': 'Show client tracking journey for {{name}}',
  'card.showServicesFor': 'Show services for {{name}}',
  'card.serviceCount': '{{count}} services',
  'card.noServices': 'No services yet',
  'card.servicesUnderReferral': 'Services under this referred client',
  'card.emptyBack': 'No paid services have been attributed to this referred client yet.',
  'card.tapToReturn': 'Tap to return to the client tracking journey',
  'card.back': 'Back',
  'card.openCustomer': 'Open customer',
  'card.copyLink': 'Copy link',
  'card.linkCopied': 'Copied',
  'steps.referred': 'Recorded',
  'steps.visited': 'Visited',
  'steps.serviced': 'Serviced',
  'steps.paid': 'Paid',
  expected: 'Expected',
  paidOut: 'Paid out',
  received: 'Received',
  'lobs.dental': 'Dental',
  'lobs.cosmetic': 'Cosmetic',
  'serviceStatus.pending': 'Pending',
  'serviceStatus.paid': 'Paid',
  'serviceStatus.reversed': 'Reversed',
  // CTV Dashboard specific
  'portal': 'CTV Portal',
  'hello': 'Hi, {{name}}',
  'notifications': 'Notifications',
  'forms.referClient.title': 'Refer a client',
  'forms.recruitCtv.title': 'Recruit CTV',
  'hierarchy.title': 'CTV Referral Hierarchy',
  'hierarchy.uplineTitle': 'Upline',
  'hierarchy.downlineTitle': 'Downline',
  'tabs.home': 'Home',
  'tabs.commission': 'Commission',
  'tabs.referrals': 'Track Clients',
  'tabs.network': 'Network',
  'tabs.me': 'Me',
  'searchLabel': 'Search referred clients',
  'searchPlaceholder': 'Search referred clients...',
};

function translateForTest(key: string, options?: Record<string, unknown> | string) {
  // Determine which language translation table to use
  const savedLang = localStorage.getItem('tg-lang') as string | null;
  const lang = (savedLang && ['en', 'vi'].includes(savedLang)) ? savedLang : 'vi';
  const translations = lang === 'en' ? EN_TRANSLATIONS : TEST_TRANSLATIONS;

  if (typeof options === 'string') {
    return translations[key] ?? options;
  }
  const defaultValue = typeof options?.defaultValue === 'string' ? options.defaultValue : undefined;
  return interpolate(translations[key] ?? defaultValue ?? key, options);
}

// Mock react-i18next with the small locale surface needed by component tests.
vi.mock('react-i18next', () => ({
  useTranslation: (_ns?: string) => {
    // Respect localStorage language setting for tests
    const savedLang = localStorage.getItem('tg-lang') as string | null;
    const lang = (savedLang && ['en', 'vi'].includes(savedLang)) ? savedLang : 'vi';

    return {
      t: translateForTest,
      i18n: { language: lang, changeLanguage: vi.fn() },
    };
  },
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ children }: { children: React.ReactNode }) => children,
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));
