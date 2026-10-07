import { AppError } from './AppError';
import { ERROR_CODES } from '../constants/error.constants';

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(ERROR_CODES.NOT_FOUND, message, 404, details);
  }
}
