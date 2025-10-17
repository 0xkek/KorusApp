const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Event {
  id: string;
  type: 'whitelist' | 'token_launch' | 'nft_mint' | 'airdrop' | 'ido';
  projectName: string;
  title: string;
  description: string;
  imageUrl?: string;
  externalLink: string;
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
    [key: string]: any;
  };
  registeredAt: string;
}

export interface CreateEventData {
  type: 'whitelist' | 'token_launch' | 'nft_mint' | 'airdrop' | 'ido';
  projectName: string;
  title: string;
  description: string;
  imageUrl?: string;
  externalLink: string;
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
    [key: string]: any;
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

  const url = `${API_BASE_URL}/api/events${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get single event details (public endpoint)
 */
export async function getEvent(eventId: string): Promise<{ success: boolean; event: Event }> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch event: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new event (requires authentication)
 */
export async function createEvent(
  eventData: CreateEventData,
  authToken: string
): Promise<{ success: boolean; event: Event }> {
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(eventData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create event');
  }

  return response.json();
}

/**
 * Register for whitelist (requires authentication)
 */
export async function registerForWhitelist(
  eventId: string,
  registrationData: RegisterForWhitelistData,
  authToken: string
): Promise<{ success: boolean; registration: WhitelistRegistration; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(registrationData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to register for whitelist');
  }

  return response.json();
}

/**
 * Check registration status (requires authentication)
 */
export async function getRegistrationStatus(
  eventId: string,
  authToken: string
): Promise<{ success: boolean; registered: boolean; registration?: WhitelistRegistration }> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/status`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to check registration status');
  }

  return response.json();
}

/**
 * Get all registrations for an event (creator only)
 */
export async function getEventRegistrations(
  eventId: string,
  authToken: string
): Promise<{ success: boolean; registrations: WhitelistRegistration[] }> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/registrations`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch registrations');
  }

  return response.json();
}

/**
 * Export registrations (creator only)
 */
export async function exportRegistrations(
  eventId: string,
  format: 'csv' | 'json',
  authToken: string
): Promise<string | any> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/export?format=${format}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to export registrations');
  }

  if (format === 'csv') {
    return response.text();
  } else {
    return response.json();
  }
}

/**
 * Close event early (creator only)
 */
export async function closeEvent(
  eventId: string,
  authToken: string
): Promise<{ success: boolean; event: Event }> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/close`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to close event');
  }

  return response.json();
}

/**
 * Cancel event (creator only)
 */
export async function cancelEvent(
  eventId: string,
  authToken: string
): Promise<{ success: boolean; event: Event }> {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel event');
  }

  return response.json();
}

/**
 * Get user's created events (requires authentication)
 */
export async function getMyEvents(authToken: string): Promise<{ success: boolean; events: Event[] }> {
  const response = await fetch(`${API_BASE_URL}/api/events/my-events`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user events');
  }

  return response.json();
}

/**
 * Generate signature message for wallet signing
 */
export function generateSignatureMessage(eventId: string, projectName: string): string {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(7);

  return `I want to join the ${projectName} whitelist.\nEvent ID: ${eventId}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
}
