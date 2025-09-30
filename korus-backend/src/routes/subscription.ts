import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getSubscriptionPricing,
  subscribe,
  getSubscriptionStatus,
  cancelSubscription,
  getSubscriptionHistory
} from '../controllers/subscriptionController'

const router = express.Router()

/**
 * @route   GET /api/subscription/pricing
 * @desc    Get subscription pricing
 * @access  Public
 */
router.get('/pricing', getSubscriptionPricing)

/**
 * @route   POST /api/subscription/subscribe
 * @desc    Process subscription payment
 * @access  Private
 */
router.post('/subscribe', authenticate, subscribe)

/**
 * @route   GET /api/subscription/status
 * @desc    Get subscription status
 * @access  Private
 */
router.get('/status', authenticate, getSubscriptionStatus)

/**
 * @route   POST /api/subscription/cancel
 * @desc    Cancel subscription
 * @access  Private
 */
router.post('/cancel', authenticate, cancelSubscription)

/**
 * @route   GET /api/subscription/history
 * @desc    Get subscription payment history
 * @access  Private
 */
router.get('/history', authenticate, getSubscriptionHistory)

export default router