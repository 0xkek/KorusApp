import { logger } from '../utils/logger'
import prisma from '../config/database'

/**
 * Retire expired shoutouts.
 *
 * A shoutout stops being promoted as soon as its window closes: it drops out of
 * the shoutout slot and the queue, and reappears in the normal feed at its
 * original position. The post itself is kept.
 *
 * This previously ran `deleteMany`, which permanently destroyed posts users had
 * paid up to 2 SOL for (along with their replies via cascade, and the
 * shoutoutTxSignature needed to audit the payment). Clearing `isShoutout`
 * achieves the same "promotion is over" outcome without losing paid content.
 */
export async function retireExpiredShoutouts() {
  try {
    const now = new Date()

    const retired = await prisma.post.updateMany({
      where: {
        isShoutout: true,
        shoutoutExpiresAt: { lt: now }
      },
      data: {
        isShoutout: false
      }
    })

    if (retired.count > 0) {
      logger.info(`Retired ${retired.count} expired shoutout(s) to normal posts`)
    }

    return retired.count
  } catch (error) {
    logger.error('Failed to retire expired shoutouts:', error)
    throw error
  }
}

/**
 * Promote the next queued shoutout when the slot is free.
 *
 * Activation also happens opportunistically in getPosts, but that only fires
 * when someone loads the feed — so during quiet periods a paid shoutout could
 * sit unstarted indefinitely. Running it on a timer means the queue advances
 * on schedule regardless of traffic.
 */
export async function activateNextShoutout() {
  try {
    const now = new Date()

    // Slot is taken if any shoutout is still within its window.
    const active = await prisma.post.findFirst({
      where: {
        isShoutout: true,
        isHidden: false,
        shoutoutExpiresAt: { gt: now }
      },
      select: { id: true }
    })
    if (active) return null

    // Oldest purchase first — queue order is by creation time.
    const nextQueued = await prisma.post.findFirst({
      where: {
        isShoutout: true,
        isHidden: false,
        shoutoutExpiresAt: null
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, shoutoutDuration: true }
    })
    if (!nextQueued) return null

    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + (nextQueued.shoutoutDuration || 10))

    // Guarded update: only claim the slot if this row is still unstarted, so a
    // concurrent getPosts activation can't double-start the same shoutout.
    const claimed = await prisma.post.updateMany({
      where: { id: nextQueued.id, shoutoutExpiresAt: null },
      data: { shoutoutExpiresAt: expiresAt }
    })

    if (claimed.count > 0) {
      logger.info(`Activated queued shoutout ${nextQueued.id} — expires at ${expiresAt.toISOString()}`)
      return nextQueued.id
    }

    return null
  } catch (error) {
    logger.error('Failed to activate next shoutout:', error)
    throw error
  }
}

async function runShoutoutMaintenance() {
  // Retire first so the slot is free for the next queued shoutout.
  await retireExpiredShoutouts()
  await activateNextShoutout()
}

/**
 * Start the shoutout maintenance scheduler.
 *
 * Runs every minute: shoutout durations start at 10 minutes, so an hourly tick
 * (the previous cadence) would let a paid slot sit idle for most of its window.
 */
export function startShoutoutCleanupJob() {
  runShoutoutMaintenance().catch(error => {
    logger.error('Initial shoutout maintenance failed:', error)
  })

  const intervalId = setInterval(() => {
    runShoutoutMaintenance().catch(error => {
      logger.error('Scheduled shoutout maintenance failed:', error)
    })
  }, 60 * 1000)

  logger.info('Shoutout maintenance job started (runs every minute)')

  return () => {
    clearInterval(intervalId)
    logger.info('Shoutout maintenance job stopped')
  }
}
