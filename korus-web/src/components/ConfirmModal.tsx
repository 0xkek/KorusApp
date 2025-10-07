'use client';

import { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getConfirmButtonStyles = () => {
    const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-200 hover:scale-105";

    if (confirmVariant === 'danger') {
      return `${baseStyles} bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/30`;
    }

    return `${baseStyles} bg-gradient-to-r from-korus-primary to-korus-secondary text-black hover:shadow-lg hover:shadow-korus-primary/30`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-korus-surface/90 backdrop-blur-xl border border-korus-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-korus-text mb-2">{title}</h3>
          <p className="text-korus-textSecondary leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold text-korus-textSecondary bg-korus-surface/40 border border-korus-borderLight hover:bg-korus-surface/60 hover:text-korus-text transition-all duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={getConfirmButtonStyles()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}