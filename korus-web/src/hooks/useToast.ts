'use client';

import { useState, useCallback } from 'react';
import { Toast } from '@/components/Toast';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    return addToast({ type: 'success', message, duration });
  }, [addToast]);

  const showError = useCallback((message: string, duration?: number) => {
    return addToast({ type: 'error', message, duration });
  }, [addToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    return addToast({ type: 'warning', message, duration });
  }, [addToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    return addToast({ type: 'info', message, duration });
  }, [addToast]);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
  };
}