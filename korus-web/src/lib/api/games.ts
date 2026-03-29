/**
 * Games API Service
 * Handles all game-related API calls
 */

import { api } from './client';

export type GameType = 'tictactoe' | 'rps' | 'connectfour';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

export interface GameEscrow {
  id: string;
  gameId: string;
  status: string;
  payoutTxSig: string | null;
  escrowPda: string;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string; // CUID string from database
  postId: string;
  gameType: GameType;
  wager: string; // Decimal as string
  player1: string;
  player2: string | null;
  player1DisplayName?: string;
  player2DisplayName?: string;
  gameState: unknown;
  status: GameStatus;
  winner: string | null;
  currentTurn: string | null;
  createdAt: string;
  updatedAt: string;
  onChainGameId: string | null;
  expiresAt: string | null; // ISO date string
  lastMoveAt: string | null; // Last move timestamp for 10-min timeout
  escrow?: GameEscrow;
}

export interface CreateGameData {
  postId: string | number; // Can be string (existing) or number (new)
  gameType: GameType;
  wager: number;
  onChainGameId?: number;
}

export interface JoinGameData {
  onChainTxSignature?: string;
}

export interface MakeMoveData {
  move: unknown;
}

export interface GameResponse {
  success: boolean;
  game: Game;
}

export interface GamesListResponse {
  success: boolean;
  games: Game[];
}

export interface UserGameHistory {
  id: string;
  gameType: GameType;
  result: 'win' | 'loss' | 'draw' | 'cancelled';
  wager: string;
  earnings: string;
  opponentWallet: string | null;
  opponentDisplayName: string | null;
  createdAt: string;
  payoutTxSig: string | null;
}

export interface UserGameStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  totalEarnings: string;
}

export interface UserGamesResponse {
  success: boolean;
  games: UserGameHistory[];
  stats: UserGameStats;
}

export const gamesAPI = {
  /**
   * Create a new game
   * For wagered games, onChainGameId must be provided (after creating game on blockchain)
   */
  async createGame(data: CreateGameData, token: string): Promise<GameResponse> {
    return api.post<GameResponse>('/api/games', data, token);
  },

  /**
   * Join an existing game
   */
  async joinGame(gameId: string, data: JoinGameData, token: string): Promise<GameResponse> {
    return api.post<GameResponse>(`/api/games/${gameId}/join`, data, token);
  },

  /**
   * Make a move in a game
   */
  async makeMove(gameId: string, data: MakeMoveData, token: string): Promise<GameResponse> {
    return api.post<GameResponse>(`/api/games/${gameId}/move`, data, token);
  },

  /**
   * Get a game by ID
   */
  async getGame(gameId: string, token?: string): Promise<GameResponse> {
    return api.get<GameResponse>(`/api/games/${gameId}`, token);
  },

  /**
   * Get a game by post ID
   */
  async getGameByPostId(postId: string, token?: string): Promise<GameResponse> {
    return api.get<GameResponse>(`/api/games/post/${postId}`, token);
  },

  /**
   * Get all games (filtered by status)
   */
  async getAllGames(status?: GameStatus, token?: string): Promise<GamesListResponse> {
    const params = status ? `?status=${status}` : '';
    return api.get<GamesListResponse>(`/api/games${params}`, token);
  },

  /**
   * Get game history for a specific user
   */
  async getGamesByUser(walletAddress: string): Promise<UserGamesResponse> {
    return api.get<UserGamesResponse>(`/api/games/user/${walletAddress}`);
  },

  /**
   * Delete/cancel a game
   */
  async deleteGame(gameId: string, token: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/api/games/${gameId}`, token);
  },
};
