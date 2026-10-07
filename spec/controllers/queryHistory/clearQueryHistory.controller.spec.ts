import { Request } from 'express';
import { ClearQueryHistoryController } from '../../../src/controllers/queryHistory/clearQueryHistory.controller';
import { mockRes } from '../../support/mockRes';

describe('ClearQueryHistoryController', () => {
  const req = { user: { userId: 3, userName: 'a@b.c' }, query: { databaseUser: 'HR' } } as unknown as Request;

  it('responds 204 with no body, using the caller from the token', async () => {
    const service = { use: jest.fn().mockResolvedValue(undefined) };
    const res = mockRes();
    const next = jest.fn();

    await new ClearQueryHistoryController(service).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ userId: 3, databaseUser: 'HR' });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('boom');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();

    await new ClearQueryHistoryController(service).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
