/**
 * Games API Service
 * Handles all game-related API calls
 */

import { api } from './client';

export type GameType = 'tictactoe' | 'rps' | 'connectfour';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

export interface Game {
  id: number;
  postId: number;
  gameType: GameType;
  wager: number;
  player1: string;
  player2: string | null;
  gameState: any;
  status: GameStatus;
  winner: string | null;
  currentTurn: string | null;
  createdAt: string;
  updatedAt: string;
  onChainGameId: string | null;
}

export interface CreateGameData {
  postId: number;
  gameType: GameType;
  wager: number;
  onChainGameId?: number;
}

export interface JoinGameData {
  onChainTxSignature?: string;
}

export interface MakeMoveData {
  move: any;
}

export interface GameResponse {
  success: boolean;
  game: Game;
}

export interface GamesListResponse {
  success: boolean;
  games: Game[];
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
  async joinGame(gameId: number, data: JoinGameData, token: string): Promise<GameResponse> {
    return api.post<GameResponse>(`/api/games/${gameId}/join`, data, token);
  },

  /**
   * Make a move in a game
   */
  async makeMove(gameId: number, data: MakeMoveData, token: string): Promise<GameResponse> {
    return api.post<GameResponse>(`/api/games/${gameId}/move`, data, token);
  },

  /**
   * Get a game by ID
   */
  async getGame(gameId: number, token?: string): Promise<GameResponse> {
    return api.get<GameResponse>(`/api/games/${gameId}`, token);
  },

  /**
   * Get a game by post ID
   */
  async getGameByPostId(postId: number, token?: string): Promise<GameResponse> {
    return api.get<GameResponse>(`/api/games/post/${postId}`, token);
  },

  /**
   * Get all games (filtered by status)
   */
  async getAllGames(status?: GameStatus, token?: string): Promise<GamesListResponse> {
    const params = status ? `?status=${status}` : '';
    return api.get<GamesListResponse>(`/api/games${params}`, token);
  },
};
