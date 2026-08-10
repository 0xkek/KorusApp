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

export interface Game {
  id: string;
  postId: string | null;
  gameType: GameType | string;
  player1: string;
  player2: string | null;
  currentTurn: string | null;
  gameState: unknown;
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

  join: (id: string, token: string) =>
    api.post<{ success: boolean; game?: Game }>(`/api/games/${id}/join`, {}, token),

  move: (id: string, move: unknown, token: string) =>
    api.post<{ success: boolean; game?: Game }>(`/api/games/${id}/move`, { move }, token),
};

export function gameLabel(type: string): string {
  if (type === 'connectfour') return 'Connect Four';
  if (type === 'rps') return 'Rock Paper Scissors';
  if (type === 'tictactoe') return 'Tic-Tac-Toe';
  return type;
}
