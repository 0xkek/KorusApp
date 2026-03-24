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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div ref={modalRef} className="modal-content relative bg-[#1e1e1e] border border-[#1a1a1a] rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-[#fafafa] mb-2">{title}</h3>
          <p className="text-[#a1a1a1] leading-relaxed">{message}</p>
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