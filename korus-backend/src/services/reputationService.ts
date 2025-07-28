import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { getWeekDates } from '../utils/dateHelpers';

const prisma = new PrismaClient();

interface RepEventData {
  userWallet: string;
  eventType: string;
  category: 'content' | 'engagement' | 'community' | 'loyalty';
  points: number;
  description?: string;
  metadata?: any;
}

class ReputationService {
  // Point values for different actions
  private readonly POINTS = {
    // Content creation
    POST_CREATED: 10,
    POST_WITH_MEDIA: 15,
    
    // Engagement given
    LIKE_GIVEN: 1,
    COMMENT_MADE: 5,
    TIP_SENT_PER_100: 10, // 10 points per 100 ALLY tipped
    
    // Engagement received
    LIKE_RECEIVED: 2,
    COMMENT_RECEIVED: 3,
    TIP_RECEIVED_PER_100: 15, // 15 points per 100 ALLY received
    
    // Games
    GAME_WON: 20,
    GAME_LOST: 5, // Participation points
    GAME_WAGER_BONUS_PER_100: 5, // Extra points based on wager size
    
    // Loyalty
    DAILY_LOGIN: 5,
    STREAK_BONUS_PER_DAY: 1, // Max 30
    FIRST_POST_OF_DAY: 10,
  };

  // Multipliers
  private readonly MULTIPLIERS = {
    PREMIUM: 1.2,
    GENESIS: 1.5,
  };

  /**
   * Add reputation points for a user
   */
  async addReputation(data: RepEventData): Promise<void> {
    try {
      // Get user to check for multipliers
      const user = await prisma.user.findUnique({
        where: { walletAddress: data.userWallet },
      });

      if (!user) {
        logger.error(`User not found: ${data.userWallet}`);
        return;
      }

      // Calculate multiplier
      let multiplier = 1.0;
      if (user.genesisVerified) {
        multiplier = this.MULTIPLIERS.GENESIS;
      } else if (user.tier === 'premium') {
        multiplier = this.MULTIPLIERS.PREMIUM;
      }

      // Apply multiplier to points
      const finalPoints = Math.floor(data.points * multiplier);

      // Create reputation event
      await prisma.repEvent.create({
        data: {
          userWallet: data.userWallet,
          eventType: data.eventType,
          category: data.category,
          points: data.points,
          multiplier: new Prisma.Decimal(multiplier),
          description: data.description,
          metadata: data.metadata,
        },
      });

      // Get current week dates
      const { weekStart } = getWeekDates(new Date());
      
      // Check if we need to reset weekly counter
      const needsReset = !user.weekStartDate || 
        user.weekStartDate.getTime() < weekStart.getTime();
      
      // Update user's reputation scores
      const updates: any = {
        reputationScore: { increment: finalPoints },
        weeklyRepEarned: needsReset ? finalPoints : { increment: finalPoints },
        weekStartDate: needsReset ? weekStart : undefined,
        lastRepUpdate: new Date(),
      };

      // Update category-specific score
      switch (data.category) {
        case 'content':
          updates.contentScore = { increment: finalPoints };
          break;
        case 'engagement':
          updates.engagementScore = { increment: finalPoints };
          break;
        case 'community':
          updates.communityScore = { increment: finalPoints };
          break;
        case 'loyalty':
          updates.loyaltyScore = { increment: finalPoints };
          break;
      }

      await prisma.user.update({
        where: { walletAddress: data.userWallet },
        data: updates,
      });

      logger.info(`Added ${finalPoints} rep to ${data.userWallet} for ${data.eventType}`);
    } catch (error) {
      logger.error('Error adding reputation:', error);
    }
  }

  /**
   * Handle post creation
   */
  async onPostCreated(walletAddress: string, hasMedia: boolean): Promise<void> {
    const points = hasMedia ? this.POINTS.POST_WITH_MEDIA : this.POINTS.POST_CREATED;
    
    await this.addReputation({
      userWallet: walletAddress,
      eventType: 'post_created',
      category: 'content',
      points,
      description: hasMedia ? 'Created post with media' : 'Created post',
    });

    // Check if first post of the day
    await this.checkFirstPostOfDay(walletAddress);
  }

  /**
   * Handle like given
   */
  async onLikeGiven(walletAddress: string, targetType: string): Promise<void> {
    await this.addReputation({
      userWallet: walletAddress,
      eventType: 'like_given',
      category: 'engagement',
      points: this.POINTS.LIKE_GIVEN,
      description: `Liked a ${targetType}`,
    });
  }

  /**
   * Handle like received
   */
  async onLikeReceived(authorWallet: string, targetType: string): Promise<void> {
    await this.addReputation({
      userWallet: authorWallet,
      eventType: 'like_received',
      category: 'engagement',
      points: this.POINTS.LIKE_RECEIVED,
      description: `Received like on ${targetType}`,
    });
  }

  /**
   * Handle comment/reply made
   */
  async onCommentMade(walletAddress: string): Promise<void> {
    await this.addReputation({
      userWallet: walletAddress,
      eventType: 'comment_made',
      category: 'engagement',
      points: this.POINTS.COMMENT_MADE,
      description: 'Made a comment',
    });
  }

  /**
   * Handle comment received
   */
  async onCommentReceived(authorWallet: string): Promise<void> {
    await this.addReputation({
      userWallet: authorWallet,
      eventType: 'comment_received',
      category: 'engagement',
      points: this.POINTS.COMMENT_RECEIVED,
      description: 'Received a comment',
    });
  }

  /**
   * Handle tip sent
   */
  async onTipSent(walletAddress: string, amount: number): Promise<void> {
    const points = Math.floor(amount / 100) * this.POINTS.TIP_SENT_PER_100;
    
    await this.addReputation({
      userWallet: walletAddress,
      eventType: 'tip_sent',
      category: 'engagement',
      points,
      description: `Sent ${amount} ALLY tip`,
      metadata: { amount },
    });
  }

  /**
   * Handle tip received
   */
  async onTipReceived(authorWallet: string, amount: number): Promise<void> {
    const points = Math.floor(amount / 100) * this.POINTS.TIP_RECEIVED_PER_100;
    
    await this.addReputation({
      userWallet: authorWallet,
      eventType: 'tip_received',
      category: 'engagement',
      points,
      description: `Received ${amount} ALLY tip`,
      metadata: { amount },
    });
  }

  /**
   * Handle game completion
   */
  async onGameCompleted(
    winnerWallet: string, 
    loserWallet: string, 
    gameType: string, 
    wager: number
  ): Promise<void> {
    // Winner points
    const winnerPoints = this.POINTS.GAME_WON + 
      Math.floor(wager / 100) * this.POINTS.GAME_WAGER_BONUS_PER_100;
    
    await this.addReputation({
      userWallet: winnerWallet,
      eventType: 'game_won',
      category: 'engagement',
      points: winnerPoints,
      description: `Won ${gameType} game with ${wager} ALLY wager`,
      metadata: { gameType, wager },
    });

    // Loser participation points
    await this.addReputation({
      userWallet: loserWallet,
      eventType: 'game_lost',
      category: 'engagement',
      points: this.POINTS.GAME_LOST,
      description: `Lost ${gameType} game`,
      metadata: { gameType, wager },
    });
  }

  /**
   * Handle daily login
   */
  async onDailyLogin(walletAddress: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
    if (lastLogin) {
      lastLogin.setHours(0, 0, 0, 0);
    }

    // Check if already logged in today
    if (lastLogin && lastLogin.getTime() === today.getTime()) {
      return;
    }

    // Calculate streak
    let newStreak = 1;
    if (lastLogin) {
      const daysDiff = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        // Consecutive day
        newStreak = user.loginStreak + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    // Update user
    await prisma.user.update({
      where: { walletAddress },
      data: {
        lastLoginDate: today,
        loginStreak: newStreak,
      },
    });

    // Award points
    const points = this.POINTS.DAILY_LOGIN + Math.min(newStreak, 30) * this.POINTS.STREAK_BONUS_PER_DAY;
    
    await this.addReputation({
      userWallet: walletAddress,
      eventType: 'daily_login',
      category: 'loyalty',
      points,
      description: `Daily login - ${newStreak} day streak`,
      metadata: { streak: newStreak },
    });
  }

  /**
   * Check if this is the first post of the day
   */
  private async checkFirstPostOfDay(walletAddress: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysPosts = await prisma.post.count({
      where: {
        authorWallet: walletAddress,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (todaysPosts === 1) {
      await this.addReputation({
        userWallet: walletAddress,
        eventType: 'first_post_of_day',
        category: 'loyalty',
        points: this.POINTS.FIRST_POST_OF_DAY,
        description: 'First post of the day bonus',
      });
    }
  }

  /**
   * Get reputation leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<any[]> {
    const users = await prisma.user.findMany({
      where: {
        reputationScore: { gt: 0 },
      },
      orderBy: {
        reputationScore: 'desc',
      },
      take: limit,
      select: {
        walletAddress: true,
        reputationScore: true,
        contentScore: true,
        engagementScore: true,
        communityScore: true,
        loyaltyScore: true,
        tier: true,
        genesisVerified: true,
      },
    });

    return users.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));
  }

  /**
   * Get daily leaderboard for token distribution
   */
  async getDailyLeaderboard(date?: Date): Promise<any[]> {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    const users = await prisma.user.findMany({
      where: {
        weeklyRepEarned: { gt: 0 },
        lastRepUpdate: {
          gte: targetDate,
        },
      },
      orderBy: {
        weeklyRepEarned: 'desc',
      },
      select: {
        walletAddress: true,
        weeklyRepEarned: true,
        tier: true,
      },
    });

    const totalDailyRep = users.reduce((sum, user) => sum + user.weeklyRepEarned, 0);

    return users.map((user) => ({
      ...user,
      sharePercentage: totalDailyRep > 0 ? (user.weeklyRepEarned / totalDailyRep) * 100 : 0,
    }));
  }

  /**
   * Reset daily reputation (to be called at midnight UTC)
   */
  async resetDailyReputation(): Promise<void> {
    await prisma.user.updateMany({
      where: {
        weeklyRepEarned: { gt: 0 },
      },
      data: {
        weeklyRepEarned: 0,
      },
    });

    logger.info('Daily reputation reset completed');
  }
}

export const reputationService = new ReputationService();