import { Request } from 'express';
import { ConflictError } from '../../src/errors/ConflictError';
import { NotFoundError } from '../../src/errors/NotFoundError';
import { ValidationError } from '../../src/errors/ValidationError';
import { ErrorHandlerMiddleware } from '../../src/middleware/errorHandler.middleware';
import { mockRes } from '../support/mockRes';

describe('ErrorHandlerMiddleware', () => {
  const handler = new ErrorHandlerMiddleware();
  const req = {} as Request;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => errorSpy.mockRestore());

  it.each([
    [new ValidationError('"sql" is required'), 400, '"sql" is required'],
    [new NotFoundError('Query history entry not found'), 404, 'Query history entry not found'],
    [new ConflictError('already there'), 409, 'already there'],
  ])('answers an AppError with its status and just { error: message }', (error, status, message) => {
    const res = mockRes();

    handler.handle(error, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error: message });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not put validation details in the response', () => {
    const res = mockRes();
    handler.handle(new ValidationError('bad', [{ field: 'sql' }]), req, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ error: 'bad' });
  });

  describe('client errors raised outside the app (body-parser)', () => {
    const bodyParserError = (status: number) =>
      Object.assign(new Error('Unexpected token in "select * from secrets"'), {
        status,
        body: 'select * from secrets',
      });

    it('answers malformed JSON with 400 and a generic message, without echoing or logging the body', () => {
      const res = mockRes();

      handler.handle(bodyParserError(400), req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid request body' });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('answers a too-large body with 413', () => {
      const res = mockRes();
      handler.handle(bodyParserError(413), req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({ error: 'Request body is too large' });
    });

    it('answers any other 4xx with a generic message', () => {
      const res = mockRes();
      handler.handle(Object.assign(new Error('x'), { statusCode: 415 }), req, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(415);
      expect(res.json).toHaveBeenCalledWith({ error: 'Bad request' });
    });
  });

  describe('unexpected errors', () => {
    it('answers 500 with a generic message and logs only the stack', () => {
      const res = mockRes();
      const error = new Error('ORA-03113: end-of-file');

      handler.handle(error, req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(errorSpy).toHaveBeenCalledWith(error.stack);
    });

    it('never logs properties of the error object, such as a request body', () => {
      const error = Object.assign(new Error('boom'), { body: 'select * from secrets', status: 500 });

      handler.handle(error, req, mockRes(), jest.fn());

      const logged = errorSpy.mock.calls.flat().join(' ');
      expect(logged).not.toContain('select * from secrets');
    });

    it('handles values that are not Error objects', () => {
      const res = mockRes();

      handler.handle('just a string', req, res, jest.fn());
      handler.handle(null, req, res, jest.fn());

      expect(res.status).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(errorSpy).toHaveBeenCalledWith('just a string');
    });
  });
});
