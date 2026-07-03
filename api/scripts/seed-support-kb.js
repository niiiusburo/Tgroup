#!/usr/bin/env node
/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[local development / one-off production seed]
 * @crossref:uses[api/src/services/ai/kbIngestion.js, api/src/db.js, api/src/services/ai/aiConfig.js]
 *
 * Seed the AI support knowledge base with NK Clinic frequently-asked questions.
 *
 * Usage:
 *   cd api && node scripts/seed-support-kb.js
 *
 * Environment:
 *   DATABASE_URL (optional, defaults to local dental pool)
 *   OPENAI_API_KEY (required for embeddings)
 */

'use strict';
require('dotenv').config();

const { getQuery } = require('../src/db');
const { ingestChunks } = require('../src/services/ai/kbIngestion');

const FAQS = [
  {
    source: 'faq-general',
    content: 'NK Clinic là phòng khám chuyên khoa nha khoa và thẩm mỹ. Chúng tôi cung cấp dịch vụ chăm sóc răng miệng và các giải pháp làm đẹp an toàn, hiện đại.',
  },
  {
    source: 'faq-hours',
    content: 'Phòng khám làm việc từ thứ Hai đến thứ Bảy, buổi sáng từ 8h00 đến 12h00, buổi chiều từ 13h30 đến 18h00. Chúng tôi nghỉ Chủ nhật và các ngày lễ theo lịch của Nhà nước.',
  },
  {
    source: 'faq-location',
    content: 'Vui lòng kiểm tra địa chỉ chi nhánh gần nhất trên website hoặc ứng dụng NK Clinic. Bạn có thể gọi tổng đài để được hướng dẫn chi tiết.',
  },
  {
    source: 'faq-booking',
    content: 'Bạn có thể đặt lịch hẹn qua ứng dụng NK Patient, website, hoặc gọi tổng đài. Vui lòng chọn dịch vụ, bác sĩ và khung giờ phù hợp. Hệ thống sẽ gửi xác nhận qua tin nhắn hoặc email.',
  },
  {
    source: 'faq-cancel-reschedule',
    content: 'Nếu cần đổi lịch hoặc hủy hẹn, vui lòng thực hiện trước ít nhất 24 giờ qua ứng dụng hoặc gọi tổng đài. Lịch hẹn gấp trong cùng ngày vui lòng liên hệ trực tiếp chi nhánh.',
  },
  {
    source: 'faq-services-dental',
    content: 'Dịch vụ nha khoa tại NK Clinic bao gồm: khám tổng quát, vệ sinh răng miệng, trám răng, nhổ răng, chữa tủy, niềng răng, bọc răng sứ, cấy ghép implant và tẩy trắng răng.',
  },
  {
    source: 'faq-services-cosmetic',
    content: 'Dịch vụ thẩm mỹ tại NK Clinic bao gồm: chăm sóc da, tiêm filler, botox, trị liệu laser, căng chỉ và các liệu trình làm đẹp cá nhân hóa theo tư vấn bác sĩ.',
  },
  {
    source: 'faq-pricing',
    content: 'Bảng giá dịch vụ được niêm yết công khai tại phòng khám và trên ứng dụng. Giá cuối cùng phụ thuộc vào tình trạng cụ thể và phác đồ điều trị sau khi bác sĩ thăm khám.',
  },
  {
    source: 'faq-payment',
    content: 'NK Clinic chấp nhận thanh toán tiền mặt, thẻ ngân hàng, chuyển khoản và ví điện tử. Một số dịch vụ hỗ trợ trả góp qua đối tác tài chính, vui lòng hỏi lễ tân để biết chi tiết.',
  },
  {
    source: 'faq-insurance',
    content: 'Phòng khám có hỗ trợ thanh toán bảo hiểm y tế và bảo hiểm sức khỏe cho một số dịch vụ đủ điều kiện. Vui lòng mang theo thẻ bảo hiểm và giấy tờ liên quan khi đến khám.',
  },
  {
    source: 'faq-preparation',
    content: 'Trước khi đến khám, bạn nên đánh răng sạch, mang theo giấy tờ tùy thân, thẻ bảo hiểm (nếu có) và kết quả khám/chụp phim trước đó. Nên đến trước giờ hẹn 10-15 phút để làm thủ tục.',
  },
  {
    source: 'faq-emergency',
    content: 'Trong trường hợp chấn thương nghiêm trọng, chảy máu không cầm được, sốt cao sau phẫu thuật hoặc các tình trạng khẩn cấp, vui lòng đến ngay cơ sở y tế gần nhất hoặc gọi cấp cứu 115.',
  },
  {
    source: 'faq-contact',
    content: 'Bạn có thể liên hệ NK Clinic qua tổng đài, email hỗ trợ, fanpage Facebook hoặc chat trong ứng dụng NK Patient. Nhân viên sẽ phản hồi trong giờ làm việc.',
  },
  {
    source: 'faq-privacy',
    content: 'Thông tin cá nhân và hồ sơ y tế của bạn được bảo mật theo quy định pháp luật. NK Clinic không chia sẻ dữ liệu cho bên thứ ba khi chưa có sự đồng ý của bạn, trừ trường hợp pháp luật yêu cầu.',
  },
  {
    source: 'faq-feedback',
    content: 'Mọi góp ý hoặc khiếu nại về dịch vụ có thể gửi qua ứng dụng, email hoặc trực tiếp tại quầy lễ tân. Chúng tôi ghi nhận và phản hồi trong vòng 3 ngày làm việc.',
  },
];

async function main() {
  const hasProvider =
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.DEEPSEEK_API_KEY;
  if (!hasProvider) {
    console.error('[seed-support-kb] GEMINI_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY is required for chat');
    process.exit(1);
  }

  const db = getQuery('dental');

  // Verify the table exists.
  const tableRows = await db(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'dbo' AND table_name = 'support_kb_chunks'"
  );
  if (tableRows.length === 0) {
    console.error('[seed-support-kb] support_kb_chunks table not found. Run migration 067 first.');
    process.exit(1);
  }

  const chunks = FAQS.map((f) => ({
    content: f.content,
    source: f.source,
    metadata: { category: 'faq', locale: 'vi' },
    approved: true,
  }));

  console.log(`[seed-support-kb] Ingesting ${chunks.length} FAQ chunks...`);
  const ids = await ingestChunks(db, chunks);
  console.log(`[seed-support-kb] Done. Inserted ${ids.length} chunks.`);
}

main().catch((err) => {
  console.error('[seed-support-kb] failed:', err);
  process.exit(1);
});
