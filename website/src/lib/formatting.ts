/**
 * Formatting utilities
 */

/**
 * Format a number as Vietnamese Dong (VND)
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' \u20ab';
}
