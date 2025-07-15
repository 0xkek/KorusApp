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