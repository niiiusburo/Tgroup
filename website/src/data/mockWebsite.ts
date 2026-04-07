/**
 * Mock data for Website CMS Management
 * @crossref:used-in[Website, PageList, PageEditor, SEOManager, ServiceCatalogManager]
 */

export type PageStatus = 'published' | 'draft' | 'scheduled' | 'archived';

export interface SEOMeta {
  readonly title: string;
  readonly description: string;
  readonly keywords: readonly string[];
  readonly ogImage: string;
  readonly canonicalUrl: string;
}

export interface WebsitePage {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly status: PageStatus;
  readonly content: string;
  readonly lastModified: string;
  readonly author: string;
  readonly template: string;
  readonly seo: SEOMeta;
  readonly views: number;
}

export interface ServiceListing {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly category: string;
  readonly description: string;
  readonly price: string;
  readonly duration: string;
  readonly featured: boolean;
  readonly visible: boolean;
  readonly sortOrder: number;
  readonly image: string;
}

export const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  scheduled: 'Scheduled',
  archived: 'Archived',
};

export const PAGE_STATUS_STYLES: Record<PageStatus, string> = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  archived: 'bg-yellow-100 text-yellow-700',
};

export const SERVICE_CATEGORIES = [
  'General Dentistry',
  'Cosmetic Dentistry',
  'Orthodontics',
  'Oral Surgery',
  'Pediatric Dentistry',
  'Preventive Care',
] as const;

export const PAGE_TEMPLATES = [
  'Default',
  'Landing Page',
  'Blog Post',
  'Service Detail',
  'Contact Form',
  'Gallery',
] as const;

export const MOCK_PAGES: readonly WebsitePage[] = [
  {
    id: 'page-1',
    title: 'Home',
    slug: '/',
    status: 'published',
    content: '<h1>Welcome to TDental</h1><p>Your trusted dental care provider in Ho Chi Minh City. We offer comprehensive dental services with state-of-the-art technology and experienced professionals.</p><p>Book your appointment today and experience the difference.</p>',
    lastModified: '2026-04-05T10:30:00',
    author: 'Dr. Nguyen Thanh Son',
    template: 'Landing Page',
    seo: { title: 'TDental — Premier Dental Care in HCMC', description: 'Trusted dental clinic in Ho Chi Minh City offering general, cosmetic, and orthodontic services.', keywords: ['dental', 'HCMC', 'dentist', 'teeth whitening'], ogImage: '/images/og-home.jpg', canonicalUrl: 'https://tdental.vn/' },
    views: 12450,
  },
  {
    id: 'page-2',
    title: 'About Us',
    slug: '/about',
    status: 'published',
    content: '<h1>About TDental</h1><p>Founded in 2015, TDental has grown to 8 clinics across Ho Chi Minh City. Our team of over 30 dental professionals is committed to providing the highest quality dental care.</p>',
    lastModified: '2026-03-28T14:15:00',
    author: 'Vo Thi Lan',
    template: 'Default',
    seo: { title: 'About Us — TDental', description: 'Learn about TDental, our mission, values, and team of dental professionals.', keywords: ['about', 'dental team', 'HCMC clinic'], ogImage: '/images/og-about.jpg', canonicalUrl: 'https://tdental.vn/about' },
    views: 4320,
  },
  {
    id: 'page-3',
    title: 'Services',
    slug: '/services',
    status: 'published',
    content: '<h1>Our Services</h1><p>From routine check-ups to advanced cosmetic procedures, we offer a full range of dental services to keep your smile healthy and beautiful.</p>',
    lastModified: '2026-04-01T09:00:00',
    author: 'Dr. Tran Minh Duc',
    template: 'Default',
    seo: { title: 'Dental Services — TDental', description: 'Comprehensive dental services including general, cosmetic, orthodontic, and surgical treatments.', keywords: ['dental services', 'teeth cleaning', 'braces', 'implants'], ogImage: '/images/og-services.jpg', canonicalUrl: 'https://tdental.vn/services' },
    views: 8760,
  },
  {
    id: 'page-4',
    title: 'Teeth Whitening',
    slug: '/services/teeth-whitening',
    status: 'published',
    content: '<h1>Professional Teeth Whitening</h1><p>Get a brighter smile with our professional teeth whitening services. We use the latest LED whitening technology for safe and effective results.</p>',
    lastModified: '2026-03-20T11:45:00',
    author: 'Dr. Le Thi Hoa',
    template: 'Service Detail',
    seo: { title: 'Teeth Whitening — TDental', description: 'Professional LED teeth whitening service in HCMC. Safe, effective, and affordable.', keywords: ['teeth whitening', 'LED whitening', 'bright smile'], ogImage: '/images/og-whitening.jpg', canonicalUrl: 'https://tdental.vn/services/teeth-whitening' },
    views: 3210,
  },
  {
    id: 'page-5',
    title: 'Orthodontics',
    slug: '/services/orthodontics',
    status: 'published',
    content: '<h1>Orthodontic Treatment</h1><p>Straighten your teeth with our orthodontic solutions including traditional braces, ceramic braces, and clear aligners.</p>',
    lastModified: '2026-03-25T16:20:00',
    author: 'Dr. Le Thi Hoa',
    template: 'Service Detail',
    seo: { title: 'Orthodontics & Braces — TDental', description: 'Orthodontic services including braces and clear aligners for all ages.', keywords: ['orthodontics', 'braces', 'clear aligners', 'Invisalign'], ogImage: '/images/og-ortho.jpg', canonicalUrl: 'https://tdental.vn/services/orthodontics' },
    views: 5430,
  },
  {
    id: 'page-6',
    title: 'Dental Implants',
    slug: '/services/dental-implants',
    status: 'draft',
    content: '<h1>Dental Implants</h1><p>Replace missing teeth with permanent dental implants. Our experienced surgeons use 3D imaging for precise implant placement.</p>',
    lastModified: '2026-04-03T13:00:00',
    author: 'Dr. Tran Minh Duc',
    template: 'Service Detail',
    seo: { title: 'Dental Implants — TDental', description: 'Permanent dental implant solutions with 3D-guided placement.', keywords: ['dental implants', 'tooth replacement', '3D imaging'], ogImage: '/images/og-implants.jpg', canonicalUrl: 'https://tdental.vn/services/dental-implants' },
    views: 0,
  },
  {
    id: 'page-7',
    title: 'Team',
    slug: '/team',
    status: 'published',
    content: '<h1>Meet Our Team</h1><p>Our talented team of dentists, orthodontists, hygienists, and support staff are dedicated to making your dental visit comfortable and effective.</p>',
    lastModified: '2026-04-02T08:30:00',
    author: 'Vo Thi Lan',
    template: 'Default',
    seo: { title: 'Our Dental Team — TDental', description: 'Meet the experienced dental professionals at TDental clinics.', keywords: ['dental team', 'dentists', 'orthodontists'], ogImage: '/images/og-team.jpg', canonicalUrl: 'https://tdental.vn/team' },
    views: 2890,
  },
  {
    id: 'page-8',
    title: 'Contact',
    slug: '/contact',
    status: 'published',
    content: '<h1>Contact Us</h1><p>Have questions or want to book an appointment? Reach out to us through any of our contact channels or visit one of our 8 clinic locations.</p>',
    lastModified: '2026-03-30T15:00:00',
    author: 'Vo Thi Lan',
    template: 'Contact Form',
    seo: { title: 'Contact Us — TDental', description: 'Get in touch with TDental. Find our clinic locations, phone numbers, and booking information.', keywords: ['contact', 'booking', 'clinic locations'], ogImage: '/images/og-contact.jpg', canonicalUrl: 'https://tdental.vn/contact' },
    views: 6120,
  },
  {
    id: 'page-9',
    title: 'Book Appointment',
    slug: '/book',
    status: 'published',
    content: '<h1>Book Your Appointment</h1><p>Schedule your dental visit online in just a few clicks. Choose your preferred location, service, and time slot.</p>',
    lastModified: '2026-04-04T12:00:00',
    author: 'Dr. Nguyen Thanh Son',
    template: 'Contact Form',
    seo: { title: 'Book Appointment — TDental', description: 'Book your dental appointment online at any TDental clinic location.', keywords: ['book appointment', 'dental booking', 'schedule visit'], ogImage: '/images/og-book.jpg', canonicalUrl: 'https://tdental.vn/book' },
    views: 9870,
  },
  {
    id: 'page-10',
    title: 'Patient Gallery',
    slug: '/gallery',
    status: 'published',
    content: '<h1>Before & After Gallery</h1><p>See the transformations our patients have experienced. Browse our gallery of before and after photos from various dental procedures.</p>',
    lastModified: '2026-03-18T10:00:00',
    author: 'Dr. Le Thi Hoa',
    template: 'Gallery',
    seo: { title: 'Patient Gallery — TDental', description: 'Before and after photos of dental treatments at TDental.', keywords: ['dental gallery', 'before after', 'smile transformation'], ogImage: '/images/og-gallery.jpg', canonicalUrl: 'https://tdental.vn/gallery' },
    views: 7650,
  },
  {
    id: 'page-11',
    title: 'Blog',
    slug: '/blog',
    status: 'published',
    content: '<h1>Dental Health Blog</h1><p>Stay informed with our latest articles on dental health, tips for oral hygiene, and news from our clinics.</p>',
    lastModified: '2026-04-06T09:30:00',
    author: 'Dr. Tran Minh Duc',
    template: 'Default',
    seo: { title: 'Dental Health Blog — TDental', description: 'Read our latest articles on dental health, oral hygiene tips, and clinic news.', keywords: ['dental blog', 'oral health', 'dental tips'], ogImage: '/images/og-blog.jpg', canonicalUrl: 'https://tdental.vn/blog' },
    views: 3450,
  },
  {
    id: 'page-12',
    title: 'Promotions',
    slug: '/promotions',
    status: 'scheduled',
    content: '<h1>Current Promotions</h1><p>Take advantage of our special offers and seasonal promotions. Limited time deals on popular dental services.</p>',
    lastModified: '2026-04-06T16:00:00',
    author: 'Vo Thi Lan',
    template: 'Landing Page',
    seo: { title: 'Promotions & Offers — TDental', description: 'Special dental care promotions and seasonal offers at TDental.', keywords: ['dental promotions', 'dental offers', 'discount'], ogImage: '/images/og-promo.jpg', canonicalUrl: 'https://tdental.vn/promotions' },
    views: 0,
  },
  {
    id: 'page-13',
    title: 'FAQ',
    slug: '/faq',
    status: 'draft',
    content: '<h1>Frequently Asked Questions</h1><p>Find answers to common questions about our services, booking process, insurance, and more.</p>',
    lastModified: '2026-04-05T14:00:00',
    author: 'Hoang Anh Tuan',
    template: 'Default',
    seo: { title: 'FAQ — TDental', description: 'Answers to frequently asked questions about dental services at TDental.', keywords: ['FAQ', 'dental questions', 'insurance'], ogImage: '/images/og-faq.jpg', canonicalUrl: 'https://tdental.vn/faq' },
    views: 0,
  },
  {
    id: 'page-14',
    title: 'Privacy Policy',
    slug: '/privacy',
    status: 'archived',
    content: '<h1>Privacy Policy</h1><p>This privacy policy outlines how TDental collects, uses, and protects your personal information.</p>',
    lastModified: '2026-01-15T10:00:00',
    author: 'Dr. Nguyen Thanh Son',
    template: 'Default',
    seo: { title: 'Privacy Policy — TDental', description: 'TDental privacy policy and data protection information.', keywords: ['privacy', 'data protection'], ogImage: '/images/og-privacy.jpg', canonicalUrl: 'https://tdental.vn/privacy' },
    views: 890,
  },
] as const;

export const MOCK_SERVICES: readonly ServiceListing[] = [
  { id: 'svc-1', name: 'Dental Check-up', slug: 'dental-check-up', category: 'General Dentistry', description: 'Comprehensive oral examination with X-rays and cleaning.', price: '500,000₫', duration: '45 min', featured: true, visible: true, sortOrder: 1, image: '/images/svc-checkup.jpg' },
  { id: 'svc-2', name: 'Teeth Cleaning', slug: 'teeth-cleaning', category: 'Preventive Care', description: 'Professional scaling and polishing to remove plaque and tartar.', price: '400,000₫', duration: '30 min', featured: false, visible: true, sortOrder: 2, image: '/images/svc-cleaning.jpg' },
  { id: 'svc-3', name: 'Teeth Whitening', slug: 'teeth-whitening', category: 'Cosmetic Dentistry', description: 'LED-powered professional whitening for a brighter smile.', price: '3,000,000₫', duration: '60 min', featured: true, visible: true, sortOrder: 3, image: '/images/svc-whitening.jpg' },
  { id: 'svc-4', name: 'Dental Filling', slug: 'dental-filling', category: 'General Dentistry', description: 'Tooth-colored composite fillings for cavities and damage.', price: '600,000₫', duration: '30 min', featured: false, visible: true, sortOrder: 4, image: '/images/svc-filling.jpg' },
  { id: 'svc-5', name: 'Root Canal', slug: 'root-canal', category: 'General Dentistry', description: 'Endodontic treatment to save infected or damaged teeth.', price: '2,500,000₫', duration: '90 min', featured: false, visible: true, sortOrder: 5, image: '/images/svc-rootcanal.jpg' },
  { id: 'svc-6', name: 'Dental Implant', slug: 'dental-implant', category: 'Oral Surgery', description: 'Permanent titanium implant for missing teeth replacement.', price: '15,000,000₫', duration: '120 min', featured: true, visible: true, sortOrder: 6, image: '/images/svc-implant.jpg' },
  { id: 'svc-7', name: 'Braces (Metal)', slug: 'braces-metal', category: 'Orthodontics', description: 'Traditional metal braces for teeth alignment.', price: '25,000,000₫', duration: '18 months', featured: false, visible: true, sortOrder: 7, image: '/images/svc-braces.jpg' },
  { id: 'svc-8', name: 'Clear Aligners', slug: 'clear-aligners', category: 'Orthodontics', description: 'Invisible aligners for discreet teeth straightening.', price: '40,000,000₫', duration: '12 months', featured: true, visible: true, sortOrder: 8, image: '/images/svc-aligners.jpg' },
  { id: 'svc-9', name: 'Porcelain Veneers', slug: 'porcelain-veneers', category: 'Cosmetic Dentistry', description: 'Custom-made porcelain shells for a perfect smile.', price: '5,000,000₫', duration: '2 visits', featured: true, visible: true, sortOrder: 9, image: '/images/svc-veneers.jpg' },
  { id: 'svc-10', name: 'Wisdom Tooth Extraction', slug: 'wisdom-tooth', category: 'Oral Surgery', description: 'Safe removal of impacted or problematic wisdom teeth.', price: '1,500,000₫', duration: '60 min', featured: false, visible: true, sortOrder: 10, image: '/images/svc-wisdom.jpg' },
  { id: 'svc-11', name: 'Pediatric Dentistry', slug: 'pediatric-dentistry', category: 'Pediatric Dentistry', description: 'Gentle dental care designed specifically for children.', price: '350,000₫', duration: '30 min', featured: false, visible: true, sortOrder: 11, image: '/images/svc-pediatric.jpg' },
  { id: 'svc-12', name: 'Fluoride Treatment', slug: 'fluoride-treatment', category: 'Preventive Care', description: 'Protective fluoride application to strengthen tooth enamel.', price: '200,000₫', duration: '15 min', featured: false, visible: false, sortOrder: 12, image: '/images/svc-fluoride.jpg' },
] as const;
