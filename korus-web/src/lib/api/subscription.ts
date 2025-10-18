import { api } from './client';

export interface SubscriptionPricing {
  monthly: number;
  yearly: number;
}

export interface SubscriptionFeature {
  name: string;
  description: string;
}

export interface PricingResponse {
  success: boolean;
  pricing: SubscriptionPricing;
  features: SubscriptionFeature[];
}

export interface SubscriptionData {
  type: 'monthly' | 'yearly';
  status: 'active' | 'expired' | 'cancelled' | 'inactive';
  startDate: string;
  endDate: string;
  price: string;
}

export interface SubscribeResponse {
  success: boolean;
  subscription: SubscriptionData;
  message?: string;
}

export interface SubscriptionStatusResponse {
  success: boolean;
  hasSubscription: boolean;
  status?: 'active' | 'expired' | 'cancelled' | 'inactive';
  type?: 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
  price?: string;
  isPremium: boolean;
  daysUntilExpiration?: number;
}

export interface CancelResponse {
  success: boolean;
  message: string;
}

export interface PaymentHistoryItem {
  id: string;
  subscriptionType: 'monthly' | 'yearly';
  amount: string;
  txSignature: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PaymentHistoryItem[];
}

export const subscriptionAPI = {
  /**
   * Get subscription pricing and features
   */
  async getPricing(): Promise<PricingResponse> {
    return api.get('/api/subscription/pricing');
  },

  /**
   * Subscribe to a plan with SOL payment
   */
  async subscribe(
    subscriptionType: 'monthly' | 'yearly',
    txSignature: string,
    token: string
  ): Promise<SubscribeResponse> {
    return api.post('/api/subscription/subscribe', {
      subscriptionType,
      txSignature
    }, token);
  },

  /**
   * Get current subscription status
   */
  async getStatus(token: string): Promise<SubscriptionStatusResponse> {
    return api.get('/api/subscription/status', token);
  },

  /**
   * Cancel subscription (premium access continues until end date)
   */
  async cancel(token: string): Promise<CancelResponse> {
    return api.post('/api/subscription/cancel', {}, token);
  },

  /**
   * Get payment history
   */
  async getHistory(token: string): Promise<PaymentHistoryResponse> {
    return api.get('/api/subscription/history', token);
  }
};
