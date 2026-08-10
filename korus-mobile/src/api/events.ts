import { api } from './client';

/**
 * Events — whitelist and raffle style listings.
 *
 * Shape verified against production.
 */

export interface KorusEvent {
  id: string;
  type: string;
  projectName: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  externalLink: string | null;
  maxSpots: number | null;
  startDate: string | null;
  endDate: string | null;
  selectionMethod: string | null;
  requirements: unknown;
  minReputation: number | null;
  minAccountAge: number | null;
  creatorWallet: string;
  verified: boolean;
  featured: boolean;
  registrationCount: number;
  viewCount: number;
  status: string;
  createdAt: string;
}

/**
 * The message the wallet signs to register. Format must match what korus-web
 * generates, since both go through the same backend verification.
 */
export function generateSignatureMessage(eventId: string, projectName: string): string {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(7);
  return `I want to join the ${projectName} whitelist.\nEvent ID: ${eventId}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
}

export const eventsAPI = {
  list: () => api.get<{ success: boolean; events: KorusEvent[] }>('/api/events'),

  get: (id: string) =>
    api.get<{ success: boolean; event: KorusEvent }>(`/api/events/${id}`),

  /**
   * Registering needs a fresh wallet signature, not just a session token —
   * it proves the holder personally approved joining this specific whitelist.
   * Being signed in is not enough.
   */
  register: (
    id: string,
    payload: { signature: string; signedMessage: string },
    token: string
  ) =>
    api.post<{ success: boolean; message?: string }>(
      `/api/events/${id}/register`,
      payload,
      token
    ),

  /** Whether the signed-in user is already registered. */
  registrationStatus: (id: string, token: string) =>
    api.get<{ success: boolean; registered?: boolean; status?: string }>(
      `/api/events/${id}/status`,
      token
    ),
};
