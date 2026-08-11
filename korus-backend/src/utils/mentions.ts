import prisma from '../config/database'
import { createNotification } from './notifications'
import { logger } from './logger'

/**
 * Extract @usernames from content text.
 *
 * Handles both identity forms Korus supports:
 *   @korusxbt        a username (max 20 chars, per the schema)
 *   @kingkitty.sol   an SNS domain
 *
 * The `.sol` branch is not cosmetic. processMentions below resolves against
 * snsUsername as well as username, but the previous pattern allowed no dot,
 * so "@kingkitty.sol" parsed as "kingkitty" — matching a different user, or
 * nobody, with no error either way. SNS holders simply never got notified.
 *
 * The trailing boundary rejects another name character, and rejects a dot
 * only when that dot is itself followed by one. Sentence-final punctuation is
 * the common case — "thanks @korusxbt." must still match — while "@foo.bar"
 * is left alone as a non-name.
 */
const MENTION_REGEX = /@([a-zA-Z0-9_]{1,32}(?:\.sol)?)(?![a-zA-Z0-9_]|\.[a-zA-Z0-9_])/g

export function parseMentions(content: string): string[] {
  const mentions: string[] = []
  let match
  // exec with /g is stateful; a module-level regex must be reset per call or
  // it resumes mid-string on the next post.
  MENTION_REGEX.lastIndex = 0
  while ((match = MENTION_REGEX.exec(content)) !== null) {
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
  const mentions = parseMentions(content)
  if (mentions.length === 0) return

  // snsUsername is stored with its suffix ("kingkitty.sol"), username without
  // it. Match a mention against both: "@kingkitty.sol" should still reach the
  // account whose username is "kingkitty" and who has no SNS name set.
  const bare = mentions.map((m) => (m.endsWith('.sol') ? m.slice(0, -4) : m))
  const usernames = [...new Set(bare)]

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { in: usernames, mode: 'insensitive' } },
          { snsUsername: { in: mentions, mode: 'insensitive' } },
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
