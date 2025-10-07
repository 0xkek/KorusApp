import { useEffect, useRef } from 'react';

/**
 * Custom hook to trap focus within a modal
 * Ensures keyboard navigation stays within the modal when it's open
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements within the modal
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus the first element when modal opens
    firstFocusable?.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Shift + Tab (going backwards)
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      }
      // Tab (going forward)
      else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    // Handle Escape key to close modal
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // The parent component should handle closing
        // We just dispatch a custom event
        container.dispatchEvent(new CustomEvent('modal-escape'));
      }
    };

    container.addEventListener('keydown', handleTabKey);
    container.addEventListener('keydown', handleEscapeKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
      container.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  return containerRef;
}
