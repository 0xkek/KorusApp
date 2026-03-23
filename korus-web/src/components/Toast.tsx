'use client';

import { useEffect, useState, useRef } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      exitTimeoutRef.current = setTimeout(() => onRemove(toast.id), 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, [toast.id, toast.duration, onRemove]);

  const getToastStyles = () => {
    const baseStyles = "flex items-start gap-3 p-4 rounded-xl border border-white/10 backdrop-blur-sm duration-150 shadow-2xl bg-[#171717]";

    switch (toast.type) {
      case 'success':
        return `${baseStyles} border-l-4 border-l-green-500 text-[#fafafa]`;
      case 'error':
        return `${baseStyles} border-l-4 border-l-red-500 text-[#fafafa]`;
      case 'warning':
        return `${baseStyles} border-l-4 border-l-yellow-500 text-[#fafafa]`;
      case 'info':
        return `${baseStyles} border-l-4 border-l-blue-500 text-[#fafafa]`;
      default:
        return `${baseStyles} text-[#fafafa]`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const transformStyles = isVisible && !isExiting
    ? 'translate-x-0 opacity-100'
    : 'translate-x-full opacity-0';

  return (
    <div className={`${getToastStyles()} ${transformStyles} max-w-md w-full`}>
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          if (exitTimeoutRef.current) {
            clearTimeout(exitTimeoutRef.current);
          }
          exitTimeoutRef.current = setTimeout(() => onRemove(toast.id), 300);
        }}
        className="text-[#737373] hover:text-[#fafafa] duration-150 p-1 -m-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {toasts.length > 0 && toasts[toasts.length - 1].message}
      </div>

      {/* Visual toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
          {toasts.map((toast) => (
            <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
          ))}
        </div>
      </div>
    </>
  );
}