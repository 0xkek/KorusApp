import { Request } from 'express';

// Extended Express Request with authenticated user
export interface AuthRequest extends Request {
  userWallet?: string;
  user?: { walletAddress: string };
}

// Authentication request body
export interface AuthRequestBody {
  walletAddress: string;
  signature: string;
  message: string;
}