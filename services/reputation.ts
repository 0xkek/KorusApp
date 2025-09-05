import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReputationScore, ReputationTier, Achievement, ReputationEvent } from '../types';
import { logger } from '../utils/logger';

const REPUTATION_STORAGE_KEY = 'korus_reputation_scores';
const ACHIEVEMENTS_KEY = 'korus_achievements';
const REPUTATION_HISTORY_KEY = 'korus_reputation_history';

// Tier thresholds and multipliers
const TIERS = {
  seedling: { min: 0, max: 999, multiplier: 1, name: '🌱 Seedling' },
  sprout: { min: 1000, max: 4999, multiplier: 1.5, name: '🌿 Sprout' },
  tree: { min: 5000, max: 19999, multiplier: 2, name: '🌳 Tree' },
  forest: { min: 20000, max: 49999, multiplier: 3, name: '🌲 Forest' },
  mountain: { min: 50000, max: 99999, multiplier: 5, name: '🏔️ Mountain' },
  celestial: { min: 100000, max: Infinity, multiplier: 10, name: '🌟 Celestial' }
};

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined Korus in the first month',
    icon: '🎯',
    points: 1000
  },
  {
    id: 'content_king',
    name: 'Content King',
    description: 'Created 100 quality posts',
    icon: '👑',
    points: 500,
    maxProgress: 100
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Made 1000 interactions',
    icon: '🦋',
    points: 500,
    maxProgress: 1000
  },
  {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    description: 'Hold 10,000 $ALLY',
    icon: '💎',
    points: 1000
  },
  {
    id: 'game_master',
    name: 'Game Master',
    description: 'Win 50 games',
    icon: '🎮',
    points: 750,
    maxProgress: 50
  },
  {
    id: 'tip_generous',
    name: 'Generous Tipper',
    description: 'Tip 5000 $ALLY total',
    icon: '💰',
    points: 600,
    maxProgress: 5000
  },
  {
    id: 'streak_warrior',
    name: 'Streak Warrior',
    description: '30 day posting streak',
    icon: '🔥',
    points: 800,
    maxProgress: 30
  }
];

class ReputationService {
  private userScores: Map<string, ReputationScore> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const savedScores = await AsyncStorage.getItem(REPUTATION_STORAGE_KEY);
      if (savedScores) {
        const parsed = JSON.parse(savedScores);
        Object.entries(parsed).forEach(([wallet, score]) => {
          this.userScores.set(wallet, score as ReputationScore);
        });
      }
      this.isInitialized = true;
    } catch (error) {
      logger.error('Failed to load reputation scores:', error);
    }
  }

  private getTier(score: number): { tier: ReputationTier; tierName: string; multiplier: number } {
    for (const [tier, config] of Object.entries(TIERS)) {
      if (score >= config.min && score <= config.max) {
        return {
          tier: tier as ReputationTier,
          tierName: config.name,
          multiplier: config.multiplier
        };
      }
    }
    return { tier: 'seedling', tierName: TIERS.seedling.name, multiplier: 1 };
  }

  async getUserReputation(walletAddress: string): Promise<ReputationScore> {
    await this.initialize();
    
    let userScore = this.userScores.get(walletAddress);
    if (!userScore) {
      // Initialize new user
      const tierInfo = this.getTier(0);
      userScore = {
        total: 0,
        breakdown: {
          content: 0,
          engagement: 0,
          community: 0,
          loyalty: 0
        },
        tier: tierInfo.tier,
        tierName: tierInfo.tierName,
        multiplier: tierInfo.multiplier,
        achievements: [],
        history: [],
        lastUpdated: new Date()
      };
      this.userScores.set(walletAddress, userScore);
      await this.saveScores();
    }
    
    return userScore;
  }

  async addReputationPoints(
    walletAddress: string,
    category: 'content' | 'engagement' | 'community' | 'loyalty',
    points: number,
    eventType: ReputationEvent['type'],
    description: string,
    metadata?: any
  ): Promise<ReputationScore> {
    await this.initialize();
    
    const userScore = await this.getUserReputation(walletAddress);
    
    // Apply multipliers for premium/genesis users
    const finalPoints = Math.round(points * userScore.multiplier);
    
    // Update breakdown
    userScore.breakdown[category] += finalPoints;
    
    // Update total
    userScore.total = Object.values(userScore.breakdown).reduce((a, b) => a + b, 0);
    
    // Update tier
    const tierInfo = this.getTier(userScore.total);
    userScore.tier = tierInfo.tier;
    userScore.tierName = tierInfo.tierName;
    userScore.multiplier = tierInfo.multiplier;
    
    // Add to history
    const event: ReputationEvent = {
      id: `${Date.now()}-${Math.random()}`,
      type: eventType,
      points: finalPoints,
      description,
      timestamp: new Date(),
      metadata
    };
    
    userScore.history.unshift(event);
    if (userScore.history.length > 100) {
      userScore.history = userScore.history.slice(0, 100); // Keep last 100 events
    }
    
    userScore.lastUpdated = new Date();
    
    // Check for achievements
    await this.checkAchievements(walletAddress, userScore);
    
    // Save
    await this.saveScores();
    
    return userScore;
  }

  private async checkAchievements(walletAddress: string, score: ReputationScore) {
    // Check content king
    const postCount = score.history.filter(e => e.type === 'post').length;
    this.updateAchievementProgress(score, 'content_king', postCount);
    
    // Check social butterfly
    const interactionCount = score.history.filter(e => 
      ['like', 'comment', 'tip'].includes(e.type)
    ).length;
    this.updateAchievementProgress(score, 'social_butterfly', interactionCount);
    
    // Check game master
    const gameWins = score.history.filter(e => 
      e.type === 'game' && e.metadata?.won
    ).length;
    this.updateAchievementProgress(score, 'game_master', gameWins);
    
    // Add more achievement checks...
  }

  private updateAchievementProgress(score: ReputationScore, achievementId: string, progress: number) {
    const definition = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
    if (!definition) return;
    
    let achievement = score.achievements.find(a => a.id === achievementId);
    if (!achievement) {
      achievement = { ...definition, progress: 0 };
      score.achievements.push(achievement);
    }
    
    achievement.progress = progress;
    
    // Check if completed
    if (definition.maxProgress && progress >= definition.maxProgress && !achievement.unlockedAt) {
      achievement.unlockedAt = new Date();
      score.total += definition.points;
      score.breakdown.community += definition.points;
    }
  }

  async getLeaderboard(limit: number = 100): Promise<Array<{ wallet: string; score: ReputationScore; rank: number }>> {
    await this.initialize();
    
    const scores = Array.from(this.userScores.entries())
      .map(([wallet, score]) => ({ wallet, score }))
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, limit)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));
    
    return scores;
  }

  async getUserRank(walletAddress: string): Promise<number> {
    const leaderboard = await this.getLeaderboard(1000);
    const userEntry = leaderboard.find(entry => entry.wallet === walletAddress);
    return userEntry?.rank || 0;
  }

  private async saveScores() {
    try {
      const data: Record<string, ReputationScore> = {};
      this.userScores.forEach((score, wallet) => {
        data[wallet] = score;
      });
      await AsyncStorage.setItem(REPUTATION_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      logger.error('Failed to save reputation scores:', error);
    }
  }

  // Utility methods for common actions
  async onPostCreated(walletAddress: string, hasMedia: boolean = false) {
    const basePoints = 10;
    const mediaBonus = hasMedia ? 5 : 0;
    return this.addReputationPoints(
      walletAddress,
      'content',
      basePoints + mediaBonus,
      'post',
      hasMedia ? 'Created a post with media' : 'Created a post'
    );
  }

  async onLikeGiven(walletAddress: string) {
    return this.addReputationPoints(
      walletAddress,
      'engagement',
      1,
      'like',
      'Liked a post'
    );
  }

  async onLikeReceived(authorWallet: string) {
    return this.addReputationPoints(
      authorWallet,
      'engagement',
      2,
      'like',
      'Received a like'
    );
  }

  async onCommentMade(walletAddress: string) {
    return this.addReputationPoints(
      walletAddress,
      'engagement',
      3,
      'comment',
      'Made a comment'
    );
  }

  async onCommentReceived(authorWallet: string) {
    return this.addReputationPoints(
      authorWallet,
      'engagement',
      5,
      'comment',
      'Received a comment'
    );
  }

  async onTipSent(walletAddress: string, amount: number) {
    const points = Math.floor(amount / 100) * 10; // 10 points per 100 ALLY
    return this.addReputationPoints(
      walletAddress,
      'engagement',
      points,
      'tip',
      `Tipped ${amount} $ALLY`,
      { amount }
    );
  }

  async onTipReceived(authorWallet: string, amount: number) {
    const points = Math.floor(amount / 100) * 15; // 15 points per 100 ALLY
    return this.addReputationPoints(
      authorWallet,
      'engagement',
      points,
      'tip',
      `Received ${amount} $ALLY tip`,
      { amount }
    );
  }

  async onGameWon(walletAddress: string, gameType: string, wager: number) {
    const points = 20 + Math.floor(wager / 50); // Base 20 + bonus for wager
    return this.addReputationPoints(
      walletAddress,
      'engagement',
      points,
      'game',
      `Won a ${gameType} game`,
      { gameType, wager, won: true }
    );
  }

  async onDailyLogin(walletAddress: string, streak: number) {
    const points = 2 + Math.min(streak, 30); // 2 base + streak bonus (max 30)
    return this.addReputationPoints(
      walletAddress,
      'loyalty',
      points,
      'daily',
      `Daily login (${streak} day streak)`,
      { streak }
    );
  }
}

export const reputationService = new ReputationService();