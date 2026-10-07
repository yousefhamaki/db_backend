import { Request } from 'express';
import Joi from 'joi';
import { ValidationError } from '../../src/errors/ValidationError';
import { ValidationMiddleware } from '../../src/middleware/validation.middleware';
import { mockRes } from '../support/mockRes';

describe('ValidationMiddleware', () => {
  const schema = Joi.object({ name: Joi.string().trim().uppercase().required() });

  it('replaces the body with the validated, normalised value and calls next()', () => {
    const req = { body: { name: ' ann ', extra: 1 } } as Request;
    const next = jest.fn();

    ValidationMiddleware.validate(schema, 'body')(req, mockRes(), next);

    expect(req.body).toEqual({ name: 'ANN' });
    expect(next).toHaveBeenCalledWith();
  });

  it('defaults to validating the body', () => {
    const req = { body: { name: 'bob' } } as Request;
    ValidationMiddleware.validate(schema)(req, mockRes(), jest.fn());
    expect(req.body).toEqual({ name: 'BOB' });
  });

  it('passes a ValidationError with a readable message and per-field details', () => {
    const req = { body: {} } as Request;
    const next = jest.fn();

    ValidationMiddleware.validate(schema, 'body')(req, mockRes(), next);

    const error = next.mock.calls[0][0] as ValidationError;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain('"name" is required');
    expect(error.details).toEqual([{ field: 'name', message: '"name" is required' }]);
  });

  it('validates params and writes the result back', () => {
    const req = { params: { name: 'zed' } } as unknown as Request;
    ValidationMiddleware.validate(schema, 'params')(req, mockRes(), jest.fn());
    expect(req.params).toEqual({ name: 'ZED' });
  });

  it('shadows req.query with an own property so Express 5 does not discard the result', () => {
    const req = {} as Request;
    Object.defineProperty(req, 'query', { get: () => ({ name: ' kim ' }), configurable: true });
    const next = jest.fn();

    ValidationMiddleware.validate(schema, 'query')(req, mockRes(), next);

    expect(req.query).toEqual({ name: 'KIM' });
    expect(next).toHaveBeenCalledWith();
  });

  it('reports an invalid query', () => {
    const req = { query: {} } as unknown as Request;
    const next = jest.fn();

    ValidationMiddleware.validate(schema, 'query')(req, mockRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
  });
});
