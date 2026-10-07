import { AppError } from './AppError';
import { ERROR_CODES } from '../constants/error.constants';

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(ERROR_CODES.VALIDATION_ERROR, message, 400, details);
  }
}
