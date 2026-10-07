import { AppError } from './AppError';
import { ERROR_CODES } from '../constants/error.constants';

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: unknown) {
    super(ERROR_CODES.CONFLICT, message, 409, details);
  }
}
