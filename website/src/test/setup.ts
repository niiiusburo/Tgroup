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

type TestTranslation = string | { readonly en: string; readonly vi: string };

const TEST_TRANSLATIONS: Record<string, TestTranslation> = {
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
  'ctv:brand': 'TG CLINIC',
  'ctv:portal': { en: 'CTV Portal', vi: 'Cổng CTV' },
  'ctv:hello': { en: 'Hi, {{name}}', vi: 'Xin chào, {{name}}' },
  'ctv:notifications': { en: 'Notifications', vi: 'Thông báo' },
  'ctv:tabs.referrals': { en: 'Track Clients', vi: 'Theo dõi' },
  'ctv:tabs.recruiting': { en: 'Invite CTVs', vi: 'Giới thiệu CTV' },
  'ctv:title': { en: 'Referred Client Tracking', vi: 'Theo dõi khách giới thiệu' },
  'ctv:subtitle': {
    en: 'Track referred clients from booking to payment',
    vi: 'Theo dõi khách được giới thiệu từ đặt lịch đến thanh toán',
  },
  'ctv:searchLabel': { en: 'Search referred clients', vi: 'Tìm khách giới thiệu' },
  'ctv:searchPlaceholder': { en: 'Search referred clients...', vi: 'Tìm khách được giới thiệu...' },
  'ctv:filters.all': { en: 'All', vi: 'Tất cả' },
  'ctv:filters.active': { en: 'In progress', vi: 'Đang tiến hành' },
  'ctv:filters.completed': { en: 'Completed', vi: 'Đã hoàn tất' },
  'ctv:filters.waitingPayment': { en: 'Waiting payment', vi: 'Chờ thanh toán' },
  'ctv:summary.referredClients': { en: 'Referred clients', vi: 'Khách giới thiệu' },
  'ctv:summary.pending': { en: 'Expected', vi: 'Dự kiến' },
  'ctv:summary.paid': { en: 'Received', vi: 'Đã nhận' },
  'ctv:hierarchy.title': { en: 'CTV Referral Hierarchy', vi: 'Hệ thống giới thiệu CTV' },
  'ctv:hierarchy.subtitle': {
    en: 'See the CTVs above and below you in the referral tree',
    vi: 'Xem tuyến trên và tuyến dưới trong cây CTV của bạn',
  },
  'ctv:hierarchy.statsDirect': { en: 'Direct CTVs', vi: 'CTV trực tiếp' },
  'ctv:hierarchy.statsTotal': { en: 'Total downline', vi: 'Tổng tuyến dưới' },
  'ctv:hierarchy.statsUpline': { en: 'Upline', vi: 'Tuyến trên' },
  'ctv:hierarchy.currentTitle': { en: 'You', vi: 'Bạn' },
  'ctv:hierarchy.uplineTitle': { en: 'Upline', vi: 'Tuyến trên' },
  'ctv:hierarchy.downlineTitle': { en: 'Downline', vi: 'Tuyến dưới' },
  'ctv:hierarchy.noUpline': { en: 'No upline assigned', vi: 'Chưa có tuyến trên' },
  'ctv:hierarchy.noUplineBody': {
    en: 'You are currently at the top of your CTV branch.',
    vi: 'Bạn đang ở đầu nhánh CTV này.',
  },
  'ctv:hierarchy.noDownlineTitle': { en: 'No CTV downline yet', vi: 'Chưa có CTV tuyến dưới' },
  'ctv:hierarchy.noDownlineBody': {
    en: 'CTVs you invite will appear here after their account is linked to you.',
    vi: 'CTV bạn giới thiệu sẽ hiển thị khi tài khoản được gắn với bạn.',
  },
  'ctv:hierarchy.level': { en: 'Level {{level}}', vi: 'Tầng {{level}}' },
  'ctv:hierarchy.directCount': { en: '{{count}} direct', vi: '{{count}} trực tiếp' },
  'ctv:hierarchy.joined': { en: 'Joined {{date}}', vi: 'Tham gia {{date}}' },
  'ctv:hierarchy.loading': { en: 'Loading CTV hierarchy...', vi: 'Đang tải hệ thống CTV...' },
  'ctv:hierarchy.errorTitle': { en: 'CTV hierarchy could not load', vi: 'Không tải được hệ thống CTV' },
  'ctv:hierarchy.errorBody': { en: 'Please try again in a few minutes.', vi: 'Vui lòng thử lại sau ít phút.' },
  'ctv:hierarchy.retry': { en: 'Retry hierarchy', vi: 'Tải lại hệ thống' },
  'ctv:loading': { en: 'Loading referred clients...', vi: 'Đang tải khách giới thiệu...' },
  'ctv:errorTitle': { en: 'CTV data could not load', vi: 'Không tải được dữ liệu CTV' },
  'ctv:errorBody': { en: 'Please try again in a few minutes.', vi: 'Vui lòng thử lại sau ít phút.' },
  'ctv:retry': { en: 'Retry', vi: 'Tải lại' },
  'ctv:emptyTitle': { en: 'No referred clients yet', vi: 'Chưa có khách giới thiệu' },
  'ctv:emptyBody': {
    en: 'Referred clients will appear here once they are attached to your CTV code.',
    vi: 'Khách được giới thiệu sẽ hiển thị ngay khi được gắn với mã CTV của bạn.',
  },
  'ctv:noSearchTitle': { en: 'No referred clients found', vi: 'Không tìm thấy khách giới thiệu' },
  'ctv:noSearchBody': { en: 'Try a different search or filter.', vi: 'Thử đổi từ khóa hoặc bộ lọc.' },
  expected: { en: 'Expected', vi: 'Dự kiến' },
  received: { en: 'Received', vi: 'Đã nhận' },
  paidOut: { en: 'Paid out', vi: 'Đã chi trả' },
  'lobs.dental': { en: 'Dental', vi: 'Nha khoa' },
  'lobs.cosmetic': { en: 'Cosmetic', vi: 'Thẩm mỹ' },
  'serviceStatus.pending': { en: 'Pending', vi: 'Chờ chi trả' },
  'serviceStatus.paid': { en: 'Paid', vi: 'Đã chi trả' },
  'serviceStatus.reversed': { en: 'Reversed', vi: 'Đã hoàn' },
  'steps.referred': { en: 'Recorded', vi: 'Ghi nhận' },
  'steps.visited': { en: 'Visited', vi: 'Đã đến' },
  'steps.serviced': { en: 'Serviced', vi: 'Làm dịch vụ' },
  'steps.paid': { en: 'Paid', vi: 'Thanh toán' },
  'card.showFrontFor': { en: 'Show client tracking journey for {{name}}', vi: 'Xem hành trình theo dõi của {{name}}' },
  'card.showServicesFor': { en: 'Show services for {{name}}', vi: 'Xem dịch vụ của {{name}}' },
  'card.serviceCount': { en: '{{count}} services', vi: '{{count}} dịch vụ' },
  'card.noServices': { en: 'No services yet', vi: 'Chưa có dịch vụ' },
  'card.servicesUnderReferral': { en: 'Services under this referred client', vi: 'Dịch vụ của khách giới thiệu này' },
  'card.emptyBack': {
    en: 'No paid services have been attributed to this referred client yet.',
    vi: 'Chưa có dịch vụ đã thanh toán nào được ghi nhận cho khách giới thiệu này.',
  },
  'card.tapToReturn': { en: 'Tap to return to the client tracking journey', vi: 'Chạm để quay lại hành trình theo dõi' },
  'card.back': { en: 'Back', vi: 'Quay lại' },
};

function interpolate(template: string, options?: Record<string, unknown>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => String(options?.[key] ?? ''));
}

function currentTestLanguage() {
  return localStorage.getItem('tg-lang') === 'en' ? 'en' : 'vi';
}

function resolveTestTranslation(value: TestTranslation | undefined) {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value[currentTestLanguage()];
}

function translateForTest(key: string, options?: Record<string, unknown> | string, namespace?: string) {
  const namespacedKey = namespace ? `${namespace}:${key}` : key;
  const translation = resolveTestTranslation(TEST_TRANSLATIONS[namespacedKey]) ?? resolveTestTranslation(TEST_TRANSLATIONS[key]);
  if (typeof options === 'string') {
    return translation ?? options;
  }
  const defaultValue = typeof options?.defaultValue === 'string' ? options.defaultValue : undefined;
  return interpolate(translation ?? defaultValue ?? key, options);
}

// Mock react-i18next with the small locale surface needed by component tests.
vi.mock('react-i18next', () => ({
  useTranslation: (namespace?: string | readonly string[]) => {
    const primaryNamespace = Array.isArray(namespace) ? namespace[0] : namespace;
    return {
      t: (key: string, options?: Record<string, unknown> | string) => translateForTest(key, options, primaryNamespace),
      i18n: {
        get language() {
          return currentTestLanguage();
        },
        changeLanguage: vi.fn((language: string) => {
          localStorage.setItem('tg-lang', language);
          return Promise.resolve(language);
        }),
      },
    };
  },
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));
