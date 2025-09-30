import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native'
import { useWallet } from '../context/WalletContext'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import subscriptionService, { SubscriptionStatus, SubscriptionPricing } from '../services/subscriptionService'
import { useKorusAlert } from './KorusAlertProvider'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useTheme } from '../context/ThemeContext'
import { logger } from '../utils/logger'
import { Fonts } from '../constants/Fonts'

const RPC_URL = 'https://api.devnet.solana.com'
const PLATFORM_WALLET = '7xM9TX6Q9a5Jj8QGJY98GS3KKwngMxwPw564Vk8si2qY'

export default function SubscriptionSection() {
  const { walletAddress, currentProvider } = useWallet()
  const { showAlert } = useKorusAlert()
  const { colors, gradients, isDarkMode } = useTheme()
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [pricing, setPricing] = useState<SubscriptionPricing | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  
  React.useEffect(() => {
    if (walletAddress) {
      loadSubscriptionData()
    }
  }, [walletAddress])
  
  const loadSubscriptionData = async () => {
    try {
      setLoadingStatus(true)
      const [status, pricingData] = await Promise.all([
        subscriptionService.getStatus(),
        subscriptionService.getPricing()
      ])
      setSubscriptionStatus(status)
      setPricing(pricingData)
    } catch (error: any) {
      // Silently handle errors - the services already return defaults
    } finally {
      setLoadingStatus(false)
    }
  }
  
  const handleSubscribe = async (type: 'monthly' | 'yearly') => {
    if (!walletAddress) {
      showAlert({
        title: 'Wallet Required',
        message: 'Please connect your wallet first',
        type: 'error'
      })
      return
    }
    
    if (!currentProvider?.signTransaction) {
      showAlert({
        title: 'Unsupported Wallet',
        message: 'Your wallet does not support transaction signing. Please use a different wallet.',
        type: 'error'
      })
      return
    }
    
    try {
      setLoading(true)
      logger.info('Starting subscription process', { type, walletAddress })
      
      // Get price
      const price = type === 'monthly' ? 0.1 : 1.0
      const lamports = Math.floor(price * LAMPORTS_PER_SOL)
      
      // Create connection
      const connection = new Connection(RPC_URL, 'confirmed')
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(walletAddress),
          toPubkey: new PublicKey(PLATFORM_WALLET),
          lamports,
        })
      )
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = new PublicKey(walletAddress)
      
      logger.info('Transaction created', { 
        type,
        price,
        from: walletAddress,
        to: PLATFORM_WALLET,
        lamports
      })
      
      // Sign transaction
      const signedTransaction = await currentProvider.signTransaction(transaction)
      logger.info('Transaction signed')
      
      // Send transaction
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      )
      
      logger.info('Transaction sent', { signature })
      
      // Wait for confirmation
      showAlert({
        title: 'Processing',
        message: 'Processing payment...',
        type: 'info'
      })
      
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed')
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed')
      }
      
      logger.info('Transaction confirmed', { signature })
      
      // Process subscription on backend
      const result = await subscriptionService.processSubscription(type, signature)
      
      if (result.success) {
        showAlert({
          title: 'Success',
          message: 'Subscription activated successfully!',
          type: 'success'
        })
        await loadSubscriptionData()
      } else {
        throw new Error('Failed to activate subscription')
      }
      
    } catch (error: any) {
      console.error('Subscription error:', error)
      let errorMessage = 'Failed to process subscription'
      
      if (error?.message?.includes('declined') || error?.message?.includes('cancelled')) {
        errorMessage = 'Transaction cancelled'
      } else if (error?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient balance'
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      showAlert({
        title: 'Error',
        message: errorMessage,
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleCancel = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription?',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              const result = await subscriptionService.cancelSubscription()
              if (result.success) {
                showAlert({
                  title: 'Success',
                  message: result.message,
                  type: 'success'
                })
                await loadSubscriptionData()
              }
            } catch (error: any) {
              showAlert({
                title: 'Error',
                message: error.message || 'Failed to cancel subscription',
                type: 'error'
              })
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }
  
  if (loadingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }
  
  if (!pricing) {
    return null
  }
  
  return (
    <>
          <LinearGradient
            colors={subscriptionStatus?.isActive ? ['#FFD700', '#FFA500'] : gradients.primary}
            style={styles.premiumBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons 
              name={subscriptionStatus?.isActive ? "star" : "star-outline"} 
              size={20} 
              color={isDarkMode ? '#000' : '#fff'} 
            />
            <Text style={[styles.premiumBadgeText, { color: isDarkMode ? '#000' : '#fff' }]}>
              {subscriptionStatus?.isActive ? 'PREMIUM MEMBER' : 'FREE ACCOUNT'}
            </Text>
          </LinearGradient>
          
          {subscriptionStatus?.isActive ? (
            <>
              <View style={[styles.subscriptionInfo, { marginTop: 12 }]}>
                <Text style={[styles.subscriptionType, { color: colors.text }]}>
                  {subscriptionStatus.type === 'monthly' ? 'Monthly' : 'Yearly'} Subscription
                </Text>
                <Text style={[styles.subscriptionDetail, { color: colors.textSecondary }]}>
                  Valid until {new Date(subscriptionStatus.endDate!).toLocaleDateString()}
                </Text>
                <Text style={[styles.subscriptionDetail, { color: colors.textSecondary }]}>
                  {subscriptionStatus.daysRemaining} days remaining
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: '#EF4444' }]}>
                  Cancel Subscription
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => setShowPremiumModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.upgradeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

    {/* Premium Modal */}
    <Modal
      visible={showPremiumModal && !!pricing}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPremiumModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowPremiumModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
          <BlurView intensity={60} style={styles.modalBlur}>
            <LinearGradient
              colors={gradients.surface}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.modalHeader}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="star" size={32} color="#fff" />
                <Text style={styles.modalTitle}>Unlock Premium</Text>
              </LinearGradient>
              
              <View style={styles.modalBody}>
                <Text style={[styles.modalSubtitle, { color: colors.text }]}>
                  Get exclusive features with Korus Premium
                </Text>
                
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      Hide sponsored posts
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      Premium badge
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      Unlimited username changes
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      Priority support
                    </Text>
                  </View>
                </View>
                
                {/* Pricing Options */}
                <View style={styles.pricingContainer}>
                  <TouchableOpacity
                    style={styles.pricingOption}
                    onPress={() => {
                      setShowPremiumModal(false)
                      handleSubscribe('monthly')
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.pricingGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.pricingTitle}>Monthly</Text>
                      <Text style={styles.pricingAmount}>{pricing.monthly.price} SOL</Text>
                      <Text style={styles.pricingPeriod}>per month</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.pricingOption}
                    onPress={() => {
                      setShowPremiumModal(false)
                      handleSubscribe('yearly')
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FFD700', '#FFA500']}
                      style={styles.pricingGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.bestBadge}>
                        <Text style={styles.bestBadgeText}>SAVE 2 MONTHS</Text>
                      </View>
                      <Text style={styles.pricingTitle}>Yearly</Text>
                      <Text style={styles.pricingAmount}>{pricing.yearly.price} SOL</Text>
                      <Text style={styles.pricingPeriod}>per year</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPremiumModal(false)}
                >
                  <Text style={[styles.cancelButtonModalText, { color: colors.textSecondary }]}>
                    Maybe Later
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  premiumBadgeText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
  },
  upgradeButton: {
    marginTop: 16,
  },
  upgradeButtonGradient: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 0.5,
  },
  subscriptionInfo: {
    paddingVertical: 8,
  },
  subscriptionType: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    marginBottom: 8,
  },
  subscriptionDetail: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
  cancelButtonModalText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  modalBlur: {
    borderRadius: 20,
    opacity: 0.95,
  },
  modalGradient: {
    borderRadius: 20,
    overflow: 'hidden',
    opacity: 0.98,
  },
  modalHeader: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#fff',
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    marginBottom: 16,
  },
  featureList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  pricingContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  pricingOption: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pricingGradient: {
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  pricingTitle: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: '#000',
    marginBottom: 2,
  },
  pricingAmount: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  pricingPeriod: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: '#000',
    opacity: 0.8,
  },
  bestBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    transform: [{ rotate: '15deg' }],
  },
  bestBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: '#fff',
  },
})