import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Deduplicates celebrities by name, keeping the best record:
 * 1. Prefer 'approved' consent_status over others
 * 2. Tiebreak by highest rating
 * 3. Tiebreak by earliest created_at (original record)
 */
export function deduplicateCelebrities<T extends { id: string; name: string; consent_status?: string | null; rating?: number | null; created_at?: string | null }>(celebrities: T[]): T[] {
  const map = new Map<string, T>();
  for (const celeb of celebrities) {
    const key = celeb.name.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, celeb);
      continue;
    }
    // Prefer approved over non-approved
    const existingApproved = existing.consent_status === 'approved';
    const newApproved = celeb.consent_status === 'approved';
    if (newApproved && !existingApproved) {
      map.set(key, celeb);
    } else if (existingApproved === newApproved) {
      // Tiebreak: higher rating wins
      if ((celeb.rating || 0) > (existing.rating || 0)) {
        map.set(key, celeb);
      }
    }
  }
  return Array.from(map.values());
}
