export type GameType = 'tictactoe' | 'connect4' | 'rps' | 'coinflip';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'expired';

export interface GameData {
  type: GameType;
  wager: number;
  player1: string;
  player2?: string;
  status: GameStatus;
  winner?: string;
  board?: any; // TicTacToe board state
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
  bumped: boolean;
  bumpedAt?: number;
  bumpExpiresAt?: number; // When the bump expires
  depth?: number; // Track nesting depth for visual threading
  parentId?: number; // Track parent reply for threading
  isPremium?: boolean; // Premium user status
  userTheme?: string; // User's selected theme color
}

export interface Post {
  id: number;
  wallet: string;
  time: string;
  content: string;
  likes: number;
  replies: Reply[];
  tips: number;
  liked: boolean;
  bumped: boolean;
  bumpedAt?: number;
  bumpExpiresAt?: number; // When the bump expires
  category: string;      // Category field
  subcategory: string;   // Subcategory field
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