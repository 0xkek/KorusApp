import { api } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Event {
  id: string;
  type: 'whitelist' | 'token_launch' | 'nft_mint' | 'airdrop' | 'ido' | 'raffle';
  projectName: string;
  title: string;
  description: string;
  imageUrl?: string;
  externalLink?: string;
  maxSpots?: number;
  startDate: string;
  endDate: string;
  selectionMethod: 'fcfs' | 'lottery';
  requirements?: string[];
  minReputation?: number;
  minAccountAge?: number;
  creatorWallet: string;
  verified: boolean;
  featured: boolean;
  registrationCount: number;
  viewCount: number;
  status: 'active' | 'closed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface WhitelistRegistration {
  id: string;
  eventId: string;
  walletAddress: string;
  signature: string;
  signedMessage: string;
  reputationScore: number;
  accountAge: number;
  status: 'registered' | 'selected' | 'waitlist';
  position?: number;
  selectedAt?: string;
  metadata?: {
    twitter?: string;
    discord?: string;
    [key: string]: unknown;
  };
  registeredAt: string;
}

export interface CreateEventData {
  type: 'whitelist' | 'token_launch' | 'nft_mint' | 'airdrop' | 'ido' | 'raffle';
  projectName: string;
  title: string;
  description: string;
  imageUrl?: string;
  externalLink?: string;
  maxSpots?: number;
  startDate: string;
  endDate: string;
  selectionMethod: 'fcfs' | 'lottery';
  requirements?: string[];
  minReputation?: number;
  minAccountAge?: number;
}

export interface RegisterForWhitelistData {
  signature: string;
  signedMessage: string;
  metadata?: {
    twitter?: string;
    discord?: string;
    [key: string]: unknown;
  };
}

/**
 * Get all events (public endpoint)
 */
export async function getEvents(filters?: {
  type?: string;
  status?: string;
  featured?: boolean;
}): Promise<{ success: boolean; events: Event[] }> {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.featured !== undefined) params.append('featured', String(filters.featured));

  const query = params.toString() ? '?' + params.toString() : '';
  return api.get<{ success: boolean; events: Event[] }>(`/api/events${query}`);
}

/**
 * Get single event details (public endpoint)
 */
export async function getEvent(eventId: string): Promise<{ success: boolean; event: Event }> {
  return api.get<{ success: boolean; event: Event }>(`/api/events/${eventId}`);
}

/**
 * Create a new event (requires authentication + CSRF)
 */
export async function createEvent(
  eventData: CreateEventData,
  authToken: string
): Promise<{ success: boolean; event: Event }> {
  return api.post<{ success: boolean; event: Event }>('/api/events', eventData, authToken);
}

/**
 * Register for whitelist (requires authentication + CSRF)
 */
export async function registerForWhitelist(
  eventId: string,
  registrationData: RegisterForWhitelistData,
  authToken: string
): Promise<{ success: boolean; registration: WhitelistRegistration; message?: string }> {
  return api.post<{ success: boolean; registration: WhitelistRegistration; message?: string }>(
    `/api/events/${eventId}/register`,
    registrationData,
    authToken
  );
}

/**
 * Check registration status (requires authentication)
 */
export async function getRegistrationStatus(
  eventId: string,
  authToken: string
): Promise<{ success: boolean; registered: boolean; registration?: WhitelistRegistration }> {
  return api.get<{ success: boolean; registered: boolean; registration?: WhitelistRegistration }>(
    `/api/events/${eventId}/status`,
    authToken
  );
}

/**
 * Get all registrations for an event (creator only)
 */
export async function getEventRegistrations(
  eventId: string,
  authToken: string
): Promise<{ success: boolean; registrations: WhitelistRegistration[] }> {
  return api.get<{ success: boolean; registrations: WhitelistRegistration[] }>(
    `/api/events/${eventId}/registrations`,
    authToken
  );
}

/**
 * Export registrations (creator only)
 */
export async function exportRegistrations(
  eventId: string,
  format: 'csv' | 'json',
  authToken: string
): Promise<string | unknown> {
  // Export needs raw response for CSV, so use fetch directly for CSV
  if (format === 'csv') {
    const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/export?format=csv`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!response.ok) throw new Error('Failed to export registrations');
    return response.text();
  }
  return api.get<unknown>(`/api/events/${eventId}/export?format=json`, authToken);
}

/**
 * Close event early (creator only, requires CSRF)
 */
export async function closeEvent(
  eventId: string,
  authToken: string
): Promise<{ success: boolean; event: Event }> {
  return api.post<{ success: boolean; event: Event }>(`/api/events/${eventId}/close`, undefined, authToken);
}

/**
 * Cancel event (creator only, requires CSRF)
 */
export async function cancelEvent(
  eventId: string,
  authToken: string
): Promise<{ success: boolean; event: Event }> {
  return api.post<{ success: boolean; event: Event }>(`/api/events/${eventId}/cancel`, undefined, authToken);
}

/**
 * Get user's created events (requires authentication)
 */
export async function getMyEvents(authToken: string): Promise<{ success: boolean; events: Event[] }> {
  return api.get<{ success: boolean; events: Event[] }>('/api/events/my-events', authToken);
}

/**
 * Generate signature message for wallet signing
 */
export function generateSignatureMessage(eventId: string, projectName: string): string {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(7);

  return `I want to join the ${projectName} whitelist.\nEvent ID: ${eventId}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
}
