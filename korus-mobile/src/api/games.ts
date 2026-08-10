import { api } from './client';
import type { Author } from './types';

/**
 * Games.
 *
 * Shapes verified against production. Wagered games are disabled behind
 * ENABLE_GAME_WAGERS on the backend, so new games are free-play — but older
 * rows still carry a non-zero `wager`, which is why it is displayed when
 * present rather than assumed to be zero.
 */

export type GameType = 'connectfour' | 'rps' | 'tictactoe';

/**
 * Move payloads, verified against the backend's processors:
 *   tictactoe   { index: 0-8 }   flat 9-array, cells 'X' | 'O' | null
 *   connectfour { column: 0-6 }  6x7 grid, cells 'red' | 'yellow' | null
 *   rps         { choice }       simultaneous — no currentTurn, played in rounds
 */
export type GameMove =
  | { index: number }
  | { column: number }
  | { choice: 'rock' | 'paper' | 'scissors' };

export interface GameState {
  board?: (string | null)[] | (string | null)[][];
  moves?: unknown[];
  round?: number;
  playerMoves?: Record<string, string>;
  roundResults?: { winner?: string | null }[];
}

export interface Game {
  id: string;
  postId: string | null;
  gameType: GameType | string;
  player1: string;
  player2: string | null;
  currentTurn: string | null;
  gameState: GameState | null;
  wager: string | number | null;
  winner: string | null;
  status: string;
  expiresAt: string | null;
  lastMoveAt: string | null;
  createdAt: string;
  player1User?: Author | null;
  player2User?: Author | null;
  player1DisplayName?: string | null;
  player2DisplayName?: string | null;
}

export const gamesAPI = {
  list: () => api.get<{ success: boolean; games: Game[] }>('/api/games'),

  get: (id: string) => api.get<{ success: boolean; game: Game }>(`/api/games/${id}`),

  byUser: (wallet: string) =>
    api.get<{ success: boolean; games: Game[] }>(`/api/games/user/${wallet}`),

  /**
   * Start a free game. The backend creates the backing post itself when no
   * postId is given.
   *
   * No wager is sent: wagered games are disabled behind ENABLE_GAME_WAGERS and
   * would be rejected, and they would also need an on-chain game id first.
   */
  create: (gameType: GameType, token: string) =>
    api.post<{ success: boolean; game?: Game; error?: string }>(
      '/api/games',
      { gameType, wager: 0 },
      token
    ),

  join: (id: string, token: string) =>
    api.post<{ success: boolean; game?: Game }>(`/api/games/${id}/join`, {}, token),

  move: (id: string, move: GameMove, token: string) =>
    api.post<{ success: boolean; game?: Game; error?: string }>(
      `/api/games/${id}/move`,
      { move },
      token
    ),
};

export function gameLabel(type: string): string {
  if (type === 'connectfour') return 'Connect Four';
  if (type === 'rps') return 'Rock Paper Scissors';
  if (type === 'tictactoe') return 'Tic-Tac-Toe';
  return type;
}
