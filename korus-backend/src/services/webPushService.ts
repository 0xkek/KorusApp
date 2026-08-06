import webpush from 'web-push'
import { Prisma } from '@prisma/client'
import prisma from '../config/database'
import { logger } from '../utils/logger'

/**
 * Browser push notifications (Push API / VAPID).
 *
 * Distinct from pushNotificationService, which targets the Expo mobile app.
 * This is the web path: korus.fun users receive notifications with the tab
 * closed, which is the only mechanism that pulls someone back to the site.
 *
 * Dormant until VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are set, so deploying
 * without keys is safe — sends become no-ops rather than errors.
 */

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@korus.fun'

let configured = false

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    configured = true
    logger.info('Web push configured')
  } catch (error) {
    logger.error('Failed to configure web push — check VAPID keys:', error)
  }
} else {
  logger.warn('Web push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set')
}

export const isWebPushConfigured = () => configured
export const getVapidPublicKey = () => VAPID_PUBLIC_KEY || null

export interface WebPushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** Shape check — subscriptions come from client input and go straight to web-push. */
export function isValidSubscription(value: any): value is WebPushSubscription {
  return (
    !!value &&
    typeof value.endpoint === 'string' &&
    /^https:\/\//.test(value.endpoint) &&
    value.endpoint.length <= 2048 &&
    !!value.keys &&
    typeof value.keys.p256dh === 'string' &&
    typeof value.keys.auth === 'string'
  )
}

export async function saveSubscription(walletAddress: string, subscription: WebPushSubscription) {
  await prisma.user.update({
    where: { walletAddress },
    data: { webPushSubscription: subscription as any }
  })
}

export async function removeSubscription(walletAddress: string) {
  await prisma.user.update({
    where: { walletAddress },
    data: { webPushSubscription: Prisma.DbNull }
  })
}

export interface WebPushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Send to one user. Never throws — a failed notification must not break the
 * action that triggered it (a like should still succeed if push is down).
 */
export async function sendWebPush(walletAddress: string, payload: WebPushPayload): Promise<boolean> {
  if (!configured) return false

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: { webPushSubscription: true, pushNotificationsEnabled: true }
    })

    if (!user?.pushNotificationsEnabled || !user.webPushSubscription) return false
    if (!isValidSubscription(user.webPushSubscription)) return false

    await webpush.sendNotification(
      user.webPushSubscription as unknown as WebPushSubscription,
      JSON.stringify(payload)
    )
    return true
  } catch (error: any) {
    // 404/410 mean the browser dropped the subscription — clear it so we stop
    // retrying a dead endpoint on every future notification.
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      logger.debug(`Removing expired web push subscription for ${walletAddress}`)
      await removeSubscription(walletAddress).catch(() => {})
    } else {
      logger.error('Web push send failed:', error?.message || error)
    }
    return false
  }
}
