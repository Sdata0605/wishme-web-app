import { z } from 'zod';

// Phone number validation for Indian phone numbers
export const phoneRegex = /^(\+?91|0)?[6-9]\d{9}$/;

export const validatePhone = (phone: string): { isValid: boolean; error?: string } => {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Optional field - return valid if empty
  }
  // Remove spaces, dashes, parentheses, dots
  const cleaned = phone.replace(/[\s\-()\.]/g, '');
  const isValid = phoneRegex.test(cleaned);
  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid Indian phone number (10 digits starting with 6-9)'
  };
};

export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email.trim());
  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid email address'
  };
};

// Zod schemas for form validation
export const signUpSchema = z.object({
  email: z.string()
    .trim()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .max(255, { message: 'Email is too long' }),
  password: z.string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(128, { message: 'Password is too long' }),
  firstName: z.string()
    .trim()
    .min(1, { message: 'First name is required' })
    .max(50, { message: 'First name is too long' })
    .optional()
    .or(z.literal('')),
  lastName: z.string()
    .trim()
    .max(50, { message: 'Last name is too long' })
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      if (!val || val.trim() === '') return true;
      const cleaned = val.replace(/[\s\-()\.]/g, '');
      return phoneRegex.test(cleaned);
    }, { message: 'Please enter a valid Indian phone number (10 digits starting with 6-9)' })
});

export const signInSchema = z.object({
  emailOrPhone: z.string()
    .trim()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .max(255, { message: 'Email is too long' }),
  password: z.string()
    .min(1, { message: 'Password is required' })
    .max(128, { message: 'Password is too long' })
});

// Normalize phone number to E.164 format for India
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-()\.]/g, '');
  // If it starts with +91, keep it
  if (cleaned.startsWith('+91')) return cleaned;
  // If it starts with 91 and is 12 digits, add +
  if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
  // If it's 10 digits starting with 6-9, add +91
  if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
  return cleaned;
};
