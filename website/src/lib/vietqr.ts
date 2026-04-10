/**
 * VietQR URL builder and payment description generator
 * @crossref:used-in[useBankSettings, PaymentForm, DepositWallet]
 */

export interface VietQrUrlParams {
  bin: string;
  number: string;
  amount: number;
  description: string;
  name: string;
}

export function buildVietQrUrl({ bin, number, amount, description, name }: VietQrUrlParams): string {
  return `https://img.vietqr.io/image/${bin}-${number}-compact.jpg?amount=${amount}&addInfo=${encodeURIComponent(description)}&accountName=${encodeURIComponent(name)}`;
}

export function generatePaymentDescription(customerName: string, phone: string): string {
  const trimmed = customerName.trim();
  if (!trimmed) {
    return '';
  }

  const parts = trimmed.split(/\s+/);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('');
  const phoneSuffix = phone.length >= 4 ? phone.slice(-4) : phone;

  return `${initials}${phoneSuffix}`;
}
