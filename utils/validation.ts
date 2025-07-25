// Input validation utilities for frontend

// Sanitize user input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// Validate post content
export const validatePostContent = (content: string): { valid: boolean; error?: string } => {
  const sanitized = sanitizeInput(content);
  
  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: 'Post content cannot be empty' };
  }
  
  if (sanitized.length > 500) {
    return { valid: false, error: 'Post content must be 500 characters or less' };
  }
  
  return { valid: true };
};

// Validate reply content
export const validateReplyContent = (content: string): { valid: boolean; error?: string } => {
  const sanitized = sanitizeInput(content);
  
  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: 'Reply content cannot be empty' };
  }
  
  if (sanitized.length > 500) {
    return { valid: false, error: 'Reply content must be 500 characters or less' };
  }
  
  return { valid: true };
};

// Validate wallet address
export const validateWalletAddress = (address: string): boolean => {
  // Solana wallet address validation
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return solanaAddressRegex.test(address);
};

// Validate tip amount
export const validateTipAmount = (amount: number, balance: number): { valid: boolean; error?: string } => {
  if (amount <= 0) {
    return { valid: false, error: 'Tip amount must be greater than 0' };
  }
  
  if (amount > balance) {
    return { valid: false, error: 'Insufficient balance' };
  }
  
  if (amount > 1000000) {
    return { valid: false, error: 'Tip amount too large' };
  }
  
  return { valid: true };
};

// Validate username
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  const sanitized = sanitizeInput(username);
  
  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: 'Username cannot be empty' };
  }
  
  if (sanitized.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (sanitized.length > 30) {
    return { valid: false, error: 'Username must be 30 characters or less' };
  }
  
  // Only allow alphanumeric characters, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(sanitized)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { valid: true };
};

// Validate URL
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Character counter helper
export const getCharacterCount = (text: string): { current: number; max: number; remaining: number } => {
  const current = text.length;
  const max = 500;
  const remaining = max - current;
  
  return { current, max, remaining };
};