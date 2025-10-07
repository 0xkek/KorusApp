import { z } from 'zod';

/**
 * Common validation schemas for the Korus app
 */

// Post validation
export const postSchema = z.object({
  content: z
    .string()
    .min(1, 'Post content is required')
    .max(280, 'Post cannot exceed 280 characters'),
  images: z.array(z.instanceof(File)).max(4, 'Maximum 4 images allowed').optional(),
});

export type PostFormData = z.infer<typeof postSchema>;

// Reply validation
export const replySchema = z.object({
  content: z
    .string()
    .min(1, 'Reply content is required')
    .max(280, 'Reply cannot exceed 280 characters'),
});

export type ReplyFormData = z.infer<typeof replySchema>;

// Profile validation
export const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name cannot exceed 50 characters'),
  bio: z.string().max(160, 'Bio cannot exceed 160 characters').optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  location: z.string().max(30, 'Location cannot exceed 30 characters').optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// Tip amount validation
export const tipSchema = z.object({
  amount: z
    .number()
    .min(0.001, 'Minimum tip is 0.001 SOL')
    .max(1000, 'Maximum tip is 1000 SOL'),
  message: z.string().max(100, 'Message cannot exceed 100 characters').optional(),
});

export type TipFormData = z.infer<typeof tipSchema>;

// Shoutout validation
export const shoutoutSchema = z.object({
  recipient: z.string().min(1, 'Recipient is required'),
  message: z
    .string()
    .min(1, 'Shoutout message is required')
    .max(280, 'Message cannot exceed 280 characters'),
  amount: z.number().min(0.01, 'Minimum amount is 0.01 SOL'),
});

export type ShoutoutFormData = z.infer<typeof shoutoutSchema>;

// Report validation
export const reportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'copyright', 'other'], {
    required_error: 'Please select a reason',
  }),
  details: z.string().max(500, 'Details cannot exceed 500 characters').optional(),
});

export type ReportFormData = z.infer<typeof reportSchema>;

/**
 * Helper function to validate form data
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _general: 'Validation failed' } };
  }
}

/**
 * Hook for form validation
 */
import { useState } from 'react';

export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: unknown): data is T => {
    const result = validateForm(schema, data);
    if (result.success) {
      setErrors({});
      return true;
    } else {
      setErrors(result.errors);
      return false;
    }
  };

  const clearErrors = () => setErrors({});
  const setError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  return { errors, validate, clearErrors, setError };
}
