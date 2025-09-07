/**
 * Username validation utilities
 * 
 * Rules:
 * - 3-20 characters long
 * - Alphanumeric only (letters and numbers)
 * - No special characters
 * - Case insensitive (stored as lowercase)
 * - Cannot end with .sol (reserved for SNS domains)
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

// Regex pattern: alphanumeric only, 3-20 chars
export const USERNAME_REGEX = /^[a-zA-Z0-9]{3,20}$/;

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate a username according to our rules
 */
export function validateUsername(username: string | null | undefined): UsernameValidationResult {
  // Check if username is provided
  if (!username) {
    return { 
      isValid: false, 
      error: 'Username is required' 
    };
  }

  // Trim whitespace
  const trimmed = username.trim();

  // Check length
  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters long` 
    };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Username cannot exceed ${USERNAME_MAX_LENGTH} characters` 
    };
  }

  // Check format (alphanumeric only)
  if (!USERNAME_REGEX.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'Username can only contain letters and numbers (no special characters)' 
    };
  }

  // Check for reserved patterns
  if (trimmed.toLowerCase().endsWith('sol')) {
    return { 
      isValid: false, 
      error: 'Usernames ending with "sol" are reserved for SNS domains' 
    };
  }

  // Check for inappropriate/reserved usernames
  const reserved = [
    'admin', 'administrator', 'mod', 'moderator', 
    'korus', 'korusapp', 'system', 'support',
    'anonymous', 'anon', 'null', 'undefined'
  ];
  
  if (reserved.includes(trimmed.toLowerCase())) {
    return { 
      isValid: false, 
      error: 'This username is reserved' 
    };
  }

  return { isValid: true };
}

/**
 * Normalize username for storage (lowercase)
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Format username for display (preserve original case)
 */
export function formatUsernameForDisplay(username: string): string {
  return `@${username}`;
}