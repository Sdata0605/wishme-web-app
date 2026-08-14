// Utility to generate WishMe Payment IDs client-side
// Format: WM + YYMM + 5 random alphanumeric (no confusing chars)

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateWishMePaymentId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  let random = '';
  for (let i = 0; i < 5; i++) {
    random += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `WM${yy}${mm}${random}`;
}
