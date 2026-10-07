import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';

const CLIENT_MESSAGES: Record<number, string> = {
  400: 'Invalid request body',
  413: 'Request body is too large',
};

/**
 * Turns every error into `{ error: message }`.
 * Only the stack is logged, never the error object: body-parser errors carry the raw
 * request body (`err.body`), and query-history bodies hold the user's SQL.
 */
export class ErrorHandlerMiddleware {
  handle = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }

    const status = this.clientErrorStatus(err);
    if (status) {
      res.status(status).json({ error: CLIENT_MESSAGES[status] ?? 'Bad request' });
      return;
    }

    console.error(err instanceof Error ? err.stack : String(err));
    res.status(500).json({ error: 'Internal server error' });
  };

  private clientErrorStatus(err: unknown): number | null {
    if (typeof err !== 'object' || err === null) return null;
    const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
    const code = typeof status === 'number' ? status : statusCode;
    return typeof code === 'number' && code >= 400 && code < 500 ? code : null;
  }
}
