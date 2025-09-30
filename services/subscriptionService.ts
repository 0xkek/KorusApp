import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, Connection } from '@solana/web3.js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { config } from '../config/environment'

const API_BASE_URL = config.apiUrl

const PLATFORM_WALLET = '7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY'

export interface SubscriptionPricing {
  monthly: {
    price: number
    currency: string
    duration: string
    features: string[]
  }
  yearly: {
    price: number
    currency: string
    duration: string
    savings: string
    features: string[]
  }
}

export interface SubscriptionStatus {
  isActive: boolean
  type: 'monthly' | 'yearly' | null
  startDate: string | null
  endDate: string | null
  daysRemaining: number | null
}

class SubscriptionService {
  /**
   * Get subscription pricing
   */
  async getPricing(): Promise<SubscriptionPricing> {
    try {
      const response = await fetch(`${API_BASE_URL}/subscription/pricing`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get pricing')
      }
      
      return data.pricing
    } catch (error: any) {
      // Only log errors in development, not expected network failures
      if (__DEV__ && error?.message !== 'Network request failed') {
        console.log('Subscription pricing not available, using defaults')
      }
      // Return default pricing if there's an error
      return {
        monthly: {
          price: 0.1,
          currency: 'SOL',
          duration: '30 days',
          features: [
            'Hide sponsored posts',
            'Premium badge',
            'Unlimited username changes',
            'Priority support',
            'Early access to new features'
          ]
        },
        yearly: {
          price: 1.0,
          currency: 'SOL',
          duration: '365 days',
          savings: '2 months free',
          features: [
            'Hide sponsored posts',
            'Premium badge',
            'Unlimited username changes',
            'Priority support',
            'Early access to new features',
            '2 months free (compared to monthly)'
          ]
        }
      } as SubscriptionPricing
    }
  }
  
  /**
   * Get subscription status for current user
   */
  async getStatus(): Promise<SubscriptionStatus> {
    try {
      const token = await AsyncStorage.getItem('korus_auth_token')
      if (!token) {
        // Return default non-subscribed status when not authenticated
        return {
          isActive: false,
          type: null,
          startDate: null,
          endDate: null,
          daysRemaining: 0
        }
      }
      
      const response = await fetch(`${API_BASE_URL}/subscription/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get subscription status')
      }
      
      return data.subscription
    } catch (error: any) {
      // This is expected when not authenticated, don't log it
      if (error?.message !== 'Not authenticated') {
        console.log('Subscription status check failed, returning default')
      }
      throw error
    }
  }
  
  /**
   * Create subscription payment transaction
   */
  async createPaymentTransaction(
    connection: Connection,
    payerPublicKey: PublicKey,
    subscriptionType: 'monthly' | 'yearly'
  ): Promise<Transaction> {
    try {
      // Get pricing
      const pricing = await this.getPricing()
      const price = subscriptionType === 'monthly' ? pricing.monthly.price : pricing.yearly.price
      
      // Create transaction
      const transaction = new Transaction()
      
      // Add transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payerPublicKey,
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports: price * LAMPORTS_PER_SOL
        })
      )
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = payerPublicKey
      
      return transaction
    } catch (error) {
      console.error('Error creating payment transaction:', error)
      throw error
    }
  }
  
  /**
   * Process subscription after payment
   */
  async processSubscription(
    subscriptionType: 'monthly' | 'yearly',
    txSignature: string
  ): Promise<{ success: boolean; subscription: SubscriptionStatus }> {
    try {
      const token = await AsyncStorage.getItem('korus_auth_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(`${API_BASE_URL}/subscription/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionType,
          txSignature
        })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process subscription')
      }
      
      return data
    } catch (error) {
      console.error('Error processing subscription:', error)
      throw error
    }
  }
  
  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<{ success: boolean; message: string }> {
    try {
      const token = await AsyncStorage.getItem('korus_auth_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(`${API_BASE_URL}/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }
      
      return data
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  }
  
  /**
   * Get subscription history
   */
  async getHistory(): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('korus_auth_token')
      if (!token) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch(`${API_BASE_URL}/subscription/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get subscription history')
      }
      
      return data.payments
    } catch (error) {
      console.error('Error fetching subscription history:', error)
      throw error
    }
  }
}

export default new SubscriptionService()