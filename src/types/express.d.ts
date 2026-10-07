import { AuthenticatedUser } from '../interfaces/auth.interface';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
