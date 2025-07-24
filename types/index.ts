export type GameType = 'tictactoe' | 'connect4' | 'rps' | 'coinflip';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'expired';

export interface GameData {
  type: GameType;
  wager: number;
  player1: string;
  player2?: string;
  status: GameStatus;
  winner?: string;
  board?: any; // TicTacToe and Connect4 board state
  currentPlayer?: string;
  createdAt: number;
  expiresAt: number;
  // Rock Paper Scissors specific
  rounds?: any[];
  currentRound?: number;
  // Coin Flip specific
  player1Choice?: 'heads' | 'tails';
  player2Choice?: 'heads' | 'tails';
  result?: 'heads' | 'tails';
}

export interface Reply {
  id: number;
  wallet: string;
  time: string;
  content: string;
  likes: number;
  liked: boolean;
  replies: Reply[];
  tips: number;
  depth?: number; // Track nesting depth for visual threading
  parentId?: number; // Track parent reply for threading
  isPremium?: boolean; // Premium user status
  userTheme?: string; // User's selected theme color
}

export interface Post {
  id: number | string;  // Backend returns string IDs
  wallet: string;
  time: string;
  content: string;
  likes: number;
  replies: Reply[];
  tips: number;
  liked: boolean;
  category: string;      // Category field
  sponsored?: boolean;   // Sponsored/paid post flag
  imageUrl?: string;     // Optional image URL
  videoUrl?: string;     // Optional video URL
  isPremium?: boolean;   // Premium user status
  userTheme?: string;    // User's selected theme color
  gameData?: GameData;   // Optional game data for game posts
}

export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Post: { postId: string };
};

// Reputation System Types
export type ReputationTier = 'seedling' | 'sprout' | 'tree' | 'forest' | 'mountain' | 'celestial';

export interface ReputationScore {
  total: number;
  breakdown: {
    content: number;
    engagement: number;
    community: number;
    loyalty: number;
  };
  tier: ReputationTier;
  tierName: string;
  multiplier: number;
  achievements: Achievement[];
  history: ReputationEvent[];
  lastUpdated: Date;
  rank?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

export interface ReputationEvent {
  id: string;
  type: 'post' | 'like' | 'comment' | 'tip' | 'game' | 'referral' | 'achievement' | 'daily' | 'streak';
  points: number;
  description: string;
  timestamp: Date;
  metadata?: any;
}