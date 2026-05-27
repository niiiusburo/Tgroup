/**
 * ocrService.js — Gemini Vision wrapper for Vietnamese ID card (CCCD) OCR
 * Env-gated by GEMINI_API_KEY. Returns 503 when unset.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Extract name, DOB, and ID number from a Vietnamese CCCD image.
 * @param {Buffer} imageBuffer - Image data
 * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
 * @returns {Promise<{name?: string, dob?: string, id_number?: string}>}
 */
async function extractIdCard(imageBuffer, mimeType) {
  if (!GEMINI_API_KEY) {
    const err = new Error('Gemini OCR not configured');
    err.code = 'OCR_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Extract from this Vietnamese ID card (CCCD) and return ONLY a JSON object with these exact keys:
- "name": full name ( Vietnamese )
- "dob": date of birth in YYYY-MM-DD format
- "id_number": the ID card number

If any field is unreadable, use null for that key.
Return only valid JSON, no markdown, no explanation.
`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      name: parsed.name || null,
      dob: parsed.dob || null,
      id_number: parsed.id_number || null,
    };
  } catch (err) {
    console.error('[ocrService] Gemini error:', err.message);
    const error = new Error('OCR processing failed');
    error.code = 'OCR_FAILED';
    error.status = 502;
    throw error;
  }
}

function isConfigured() {
  return !!GEMINI_API_KEY;
}

module.exports = { extractIdCard, isConfigured };
