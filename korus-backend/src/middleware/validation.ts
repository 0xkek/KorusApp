import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { ValidationError } from '../utils/AppError';
import { logger } from '../utils/logger';

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Sanitize HTML content
export const sanitizeHtml = (dirty: string): string => {
  return purify.sanitize(dirty, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: []
  });
};

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error('Validation failed:', {
      url: req.url,
      body: req.body,
      errors: errors.array()
    });
    const errorMessages = errors.array().map(error => 
      'msg' in error ? error.msg : 'Validation error'
    );
    throw new ValidationError(errorMessages.join(', '));
  }
  next();
};

// Post validations
export const validateCreatePost = [
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 1, max: 500 }).withMessage('Content must be between 1 and 500 characters')
    .customSanitizer(value => sanitizeHtml(value)),
  
  body('topic')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Topic must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Topic can only contain letters, numbers, spaces, and hyphens')
    .customSanitizer(value => value?.toUpperCase()),
  
  body('subtopic')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Subtopic must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Subtopic can only contain letters, numbers, spaces, and hyphens')
    .customSanitizer(value => value?.toLowerCase()),
  
  body('imageUrl')
    .optional()
    .trim()
    .isURL().withMessage('Invalid image URL'),
  
  body('videoUrl')
    .optional()
    .trim()
    .isURL().withMessage('Invalid video URL'),
  
  handleValidationErrors
];

// Reply validations
export const validateCreateReply = [
  param('id')
    .notEmpty().withMessage('Post ID is required')
    .isString().withMessage('Invalid post ID'),
  
  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 1, max: 500 }).withMessage('Content must be between 1 and 500 characters')
    .customSanitizer(value => sanitizeHtml(value)),
  
  body('parentReplyId')
    .optional()
    .isString().withMessage('Invalid parent reply ID'),
  
  body('imageUrl')
    .optional()
    .trim()
    .isURL().withMessage('Invalid image URL'),
  
  body('videoUrl')
    .optional()
    .trim()
    .isURL().withMessage('Invalid video URL'),
  
  handleValidationErrors
];

// Interaction validations
export const validateLike = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isString().withMessage('Invalid ID'),
  
  handleValidationErrors
];

export const validateTip = [
  param('id')
    .notEmpty().withMessage('Post ID is required')
    .isString().withMessage('Invalid post ID'),
  
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.000001 }).withMessage('Amount must be greater than 0')
    .isFloat({ max: 1000000 }).withMessage('Amount too large'),
  
  handleValidationErrors
];

// Query validations
export const validateGetPosts = [
  query('topic')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Topic too long')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Invalid topic format'),
  
  query('subtopic')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Subtopic too long')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Invalid subtopic format'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  
  handleValidationErrors
];

// Auth validations
export const validateWalletConnect = [
  body('walletAddress')
    .trim()
    .notEmpty().withMessage('Wallet address is required')
    .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).withMessage('Invalid Solana wallet address'),
  
  body('signature')
    .trim()
    .notEmpty().withMessage('Signature is required')
    .custom((value) => {
      // Allow mock signatures in development and test
      if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && value.startsWith('mock_signature')) {
        return true;
      }
      // Allow base58 (Solana standard) or base64 signatures
      // Base58 uses characters: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
      const isBase58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(value);
      const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(value);
      return isBase58 || isBase64;
    }).withMessage('Invalid signature format'),
  
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 500 }).withMessage('Message too long'),
  
  handleValidationErrors
];

// User interaction batch validation
export const validateBatchInteractions = [
  body('postIds')
    .isArray({ min: 1, max: 100 }).withMessage('postIds must be an array with 1-100 items')
    .custom((value) => {
      return value.every((id: any) => typeof id === 'string');
    }).withMessage('All post IDs must be strings'),
  
  handleValidationErrors
];

// NFT validations
export const validateNFTWallet = [
  param('walletAddress')
    .trim()
    .notEmpty().withMessage('Wallet address is required')
    .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).withMessage('Invalid Solana wallet address'),
  
  handleValidationErrors
];

export const validateNFTMint = [
  param('mintAddress')
    .trim()
    .notEmpty().withMessage('Mint address is required')
    .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).withMessage('Invalid mint address'),
  
  handleValidationErrors
];

// SNS validations
export const validateSNSWallet = [
  param('walletAddress')
    .trim()
    .notEmpty().withMessage('Wallet address is required')
    .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).withMessage('Invalid Solana wallet address'),
  
  handleValidationErrors
];

export const validateSNSDomain = [
  param('domain')
    .trim()
    .notEmpty().withMessage('Domain is required')
    .matches(/^[a-z0-9-]+\.sol$/).withMessage('Invalid SNS domain format (must end with .sol)'),
  
  handleValidationErrors
];

// Sponsored post validations
export const validateSponsoredView = [
  param('postId')
    .trim()
    .notEmpty().withMessage('Post ID is required')
    .isString().withMessage('Invalid post ID format'),
  
  handleValidationErrors
];

// Interaction validations
export const validateInteractionGet = [
  param('id')
    .trim()
    .notEmpty().withMessage('Post ID is required')
    .isString().withMessage('Invalid post ID format'),
  
  handleValidationErrors
];

// Search validations
export const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters')
    .customSanitizer(value => sanitizeHtml(value)),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  
  handleValidationErrors
];