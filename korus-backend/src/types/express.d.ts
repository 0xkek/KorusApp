import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      userWallet?: string;
    }
  }
}

export {};