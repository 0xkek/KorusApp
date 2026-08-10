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

export const eventsAPI = {
  list: () => api.get<{ success: boolean; events: KorusEvent[] }>('/api/events'),

  get: (id: string) =>
    api.get<{ success: boolean; event: KorusEvent }>(`/api/events/${id}`),

  register: (id: string, token: string) =>
    api.post<{ success: boolean; message?: string }>(
      `/api/events/${id}/register`,
      {},
      token
    ),

  /** Whether the signed-in user is already registered. */
  registrationStatus: (id: string, token: string) =>
    api.get<{ success: boolean; registered?: boolean; status?: string }>(
      `/api/events/${id}/status`,
      token
    ),
};
