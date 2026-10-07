import { AppError } from '../../src/errors/AppError';
import { ConflictError } from '../../src/errors/ConflictError';
import { NotFoundError } from '../../src/errors/NotFoundError';
import { ValidationError } from '../../src/errors/ValidationError';
import { ERROR_CODES } from '../../src/constants/error.constants';

describe('AppError subclasses', () => {
  it.each([
    [new ValidationError('bad', [{ field: 'sql' }]), 400, ERROR_CODES.VALIDATION_ERROR, 'ValidationError'],
    [new NotFoundError('missing'), 404, ERROR_CODES.NOT_FOUND, 'NotFoundError'],
    [new ConflictError('dupe'), 409, ERROR_CODES.CONFLICT, 'ConflictError'],
  ])('%s carries its status, code and name', (error, statusCode, code, name) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(statusCode);
    expect(error.code).toBe(code);
    expect(error.name).toBe(name);
  });

  it('keeps the message and details', () => {
    const error = new ValidationError('bad', [{ field: 'sql' }]);
    expect(error.message).toBe('bad');
    expect(error.details).toEqual([{ field: 'sql' }]);
  });

  it('has sensible default messages', () => {
    expect(new ValidationError().message).toBe('Validation failed');
    expect(new NotFoundError().message).toBe('Resource not found');
    expect(new ConflictError().message).toBe('Resource already exists');
  });
});
