'use client';

import { useFocusTrap } from '@/hooks/useFocusTrap';

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: (plan: 'monthly' | 'yearly') => void;
}

const PREMIUM_FEATURES = [
  'Hide shoutout posts',
  'Exclusive color themes',
  'Gold verified badge',
  'Early access to events',
  '+20% rep score',
];

export default function PremiumUpgradeModal({ isOpen, onClose, onUpgrade }: PremiumUpgradeModalProps) {
  const modalRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  const handleUpgrade = (plan: 'monthly' | 'yearly') => {
    onClose();
    if (onUpgrade) {
      onUpgrade(plan);
    } else {
      // Default behavior: log to console
      console.log(`Initiating premium upgrade payment flow - ${plan === 'monthly' ? 'Monthly' : 'Yearly'}`);
      // TODO: Implement actual payment flow
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-korus-surface/90 backdrop-blur-xl border border-korus-primary rounded-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          {/* Premium Icon */}
          <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" style={{ color: '#FFD700' }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1.275l2.943 8.861h9.314l-7.5 5.464 2.943 8.86L12 19.014l-7.7 5.446 2.943-8.86-7.5-5.464h9.314z"/>
            </svg>
          </div>

          {/* Header */}
          <h3 className="text-xl font-bold mb-2" style={{ color: '#FFD700' }}>
            Unlock Premium
          </h3>
          <p className="text-korus-textSecondary mb-6">
            Get exclusive features with Korus Premium
          </p>

          {/* Features List */}
          <div className="space-y-3 mb-6 text-left">
            {PREMIUM_FEATURES.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span className="text-korus-text">{feature}</span>
              </div>
            ))}
          </div>

          {/* Pricing Options */}
          <div className="space-y-3">
            {/* Monthly Plan */}
            <button
              onClick={() => handleUpgrade('monthly')}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 border border-korus-border"
              style={{
                boxShadow: '0 0 4px var(--korus-primary), 0 0 8px var(--korus-primary)',
                color: '#FFFFFF'
              }}
            >
              <div className="font-bold">Monthly - 0.1 SOL</div>
              <div className="text-sm opacity-90">Paid monthly</div>
            </button>

            {/* Yearly Plan */}
            <button
              onClick={() => handleUpgrade('yearly')}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 relative border border-korus-border"
              style={{
                boxShadow: '0 0 4px var(--korus-primary), 0 0 8px var(--korus-primary)',
                color: '#FFFFFF'
              }}
            >
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                SAVE 2 MONTHS
              </div>
              <div className="font-bold">Yearly - 1 SOL</div>
              <div className="text-sm opacity-90">Paid annually</div>
            </button>

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-korus-surface/40 text-korus-text rounded-xl hover:bg-korus-surface/60 transition-colors border border-korus-border"
              style={{
                boxShadow: '0 0 3px var(--korus-primary), 0 0 6px var(--korus-primary)'
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
