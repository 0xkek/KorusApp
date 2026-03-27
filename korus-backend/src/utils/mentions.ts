import prisma from '../config/database'
import { createNotification } from './notifications'
import { logger } from './logger'

/**
 * Extract @usernames from content text
 */
export function parseMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]{1,20})\b/g
  const mentions: string[] = []
  let match
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].toLowerCase())
  }
  return [...new Set(mentions)]
}

/**
 * Resolve @usernames to wallet addresses and send notifications
 */
export async function processMentions(
  content: string,
  fromWallet: string,
  postId?: string
): Promise<void> {
  const usernames = parseMentions(content)
  if (usernames.length === 0) return

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { in: usernames, mode: 'insensitive' } },
          { snsUsername: { in: usernames, mode: 'insensitive' } },
        ]
      },
      select: { walletAddress: true, username: true, snsUsername: true }
    })

    for (const user of users) {
      if (user.walletAddress === fromWallet) continue // Don't notify self
      await createNotification({
        userId: user.walletAddress,
        type: 'mention',
        fromUserId: fromWallet,
        postId,
      })
    }

    if (users.length > 0) {
      logger.info(`Processed ${users.length} mentions in post ${postId} by ${fromWallet}`)
    }
  } catch (error) {
    logger.error('Error processing mentions:', error)
  }
}
