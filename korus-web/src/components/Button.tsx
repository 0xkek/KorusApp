'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-gradient-to-r from-korus-primary to-korus-secondary text-black hover:shadow-lg hover:shadow-korus-primary/30 hover:scale-[1.02] disabled:hover:scale-100',
    secondary: 'bg-white/[0.12] border border-[#2a2a2a] text-[#fafafa] hover:bg-[#171717] hover:border-[#222222]',
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-500 hover:shadow-lg hover:shadow-red-500/40 hover:scale-[1.02] disabled:hover:scale-100',
    ghost: 'bg-transparent text-[#a1a1a1] hover:bg-white/[0.06] hover:text-white',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <div className={variant === 'primary' || variant === 'danger' ? 'spinner-dark' : 'spinner-light'}></div>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
