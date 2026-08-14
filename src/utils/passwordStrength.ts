// Strong password validation and generation utilities

export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  isValid: boolean;
  feedback: string[];
}

// Password requirements
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, regex: /.{12,}/ },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', regex: /[A-Z]/ },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', regex: /[a-z]/ },
  { id: 'number', label: 'One number (0-9)', regex: /[0-9]/ },
  { id: 'special', label: 'One special character (!@#$%^&*)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
];

// Check password strength
export const checkPasswordStrength = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      color: 'bg-destructive',
      isValid: false,
      feedback: ['Enter a password'],
    };
  }

  // Check each requirement
  const passedRequirements = PASSWORD_REQUIREMENTS.filter(req => req.regex.test(password));
  score = passedRequirements.length;

  // Add feedback for missing requirements
  PASSWORD_REQUIREMENTS.forEach(req => {
    if (!req.regex.test(password)) {
      feedback.push(req.label);
    }
  });

  // Check for common patterns (deduct points)
  const commonPatterns = [
    /^123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /111111/,
    /000000/,
    /^admin$/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i,
    /master/i,
    /1234567890/,
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common password patterns');
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid repeated characters');
  }

  // Determine label and color
  let label: PasswordStrength['label'];
  let color: string;

  switch (score) {
    case 0:
    case 1:
      label = 'Very Weak';
      color = 'bg-destructive';
      break;
    case 2:
      label = 'Weak';
      color = 'bg-orange-500';
      break;
    case 3:
      label = 'Fair';
      color = 'bg-yellow-500';
      break;
    case 4:
      label = 'Strong';
      color = 'bg-green-500';
      break;
    case 5:
    default:
      label = 'Very Strong';
      color = 'bg-emerald-500';
      break;
  }

  // Password is valid only if all requirements are met (score >= 5)
  const isValid = score >= 5 && password.length <= PASSWORD_MAX_LENGTH;

  return { score, label, color, isValid, feedback };
};

// Generate a strong random password
export const generateStrongPassword = (length: number = 16): string => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'; // Removed l and o to avoid confusion
  const numbers = '23456789'; // Removed 0 and 1 to avoid confusion
  const special = '!@#$%^&*_+-=';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each required character type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

// Generate multiple password suggestions
export const generatePasswordSuggestions = (count: number = 3): string[] => {
  const suggestions: string[] = [];
  for (let i = 0; i < count; i++) {
    suggestions.push(generateStrongPassword(16));
  }
  return suggestions;
};
