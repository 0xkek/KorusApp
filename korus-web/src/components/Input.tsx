'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

type InputVariant = 'default' | 'error' | 'success';

interface BaseInputProps {
  variant?: InputVariant;
  label?: string;
  helperText?: string;
  fullWidth?: boolean;
}

interface InputProps extends BaseInputProps, InputHTMLAttributes<HTMLInputElement> {}

interface TextareaProps extends BaseInputProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  rows?: number;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', label, helperText, fullWidth = false, className = '', ...props }, ref) => {
    const baseStyles = 'bg-korus-surface/40 text-white px-4 py-3 rounded-xl border border-korus-borderLight transition-all duration-200';

    const variantStyles = {
      default: '',
      error: 'input-error',
      success: 'input-success',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={widthStyles}>
        {label && (
          <label className="label text-white mb-2 block">{label}</label>
        )}
        <input
          ref={ref}
          className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`}
          {...props}
        />
        {helperText && (
          <p className={`text-xs mt-1 ${variant === 'error' ? 'text-red-400' : 'text-korus-textSecondary'}`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ variant = 'default', label, helperText, fullWidth = false, className = '', rows = 4, ...props }, ref) => {
    const baseStyles = 'bg-korus-surface/40 text-white px-4 py-3 rounded-xl border border-korus-borderLight transition-all duration-200 resize-none';

    const variantStyles = {
      default: '',
      error: 'input-error',
      success: 'input-success',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={widthStyles}>
        {label && (
          <label className="label text-white mb-2 block">{label}</label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`}
          {...props}
        />
        {helperText && (
          <p className={`text-xs mt-1 ${variant === 'error' ? 'text-red-400' : 'text-korus-textSecondary'}`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
