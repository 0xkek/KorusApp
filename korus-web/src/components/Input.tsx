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
    const baseStyles = 'bg-white/[0.06] text-[#fafafa] px-4 py-3 rounded-lg border border-[#1a1a1a] transition-all duration-150';

    const variantStyles = {
      default: '',
      error: 'input-error',
      success: 'input-success',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={widthStyles}>
        {label && (
          <label className="label text-[#fafafa] mb-2 block">{label}</label>
        )}
        <input
          ref={ref}
          className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`}
          {...props}
        />
        {helperText && (
          <p className={`text-xs mt-1 ${variant === 'error' ? 'text-red-400' : 'text-[#a1a1a1]'}`}>
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
    const baseStyles = 'bg-white/[0.06] text-[#fafafa] px-4 py-3 rounded-lg border border-[#1a1a1a] transition-all duration-150 resize-none';

    const variantStyles = {
      default: '',
      error: 'input-error',
      success: 'input-success',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <div className={widthStyles}>
        {label && (
          <label className="label text-[#fafafa] mb-2 block">{label}</label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${className}`}
          {...props}
        />
        {helperText && (
          <p className={`text-xs mt-1 ${variant === 'error' ? 'text-red-400' : 'text-[#a1a1a1]'}`}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
