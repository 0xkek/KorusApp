'use client';

import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Button } from '@/components/ui';

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
  const modalRef = useFocusTrap(isOpen);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-overlay-background)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div ref={modalRef} className="modal-content relative bg-[var(--color-surface)] border border-[var(--color-border-light)] rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">{title}</h3>
          <p className="text-[var(--color-text-secondary)] leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            onClick={onClose}
            variant="secondary"
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={confirmVariant}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}