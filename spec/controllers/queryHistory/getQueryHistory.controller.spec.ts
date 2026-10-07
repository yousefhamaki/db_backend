import { Request } from 'express';
import { GetQueryHistoryController } from '../../../src/controllers/queryHistory/getQueryHistory.controller';
import { mockRes } from '../../support/mockRes';

describe('GetQueryHistoryController', () => {
  const req = { user: { userId: 3, userName: 'a@b.c' }, query: { databaseUser: 'HR' } } as unknown as Request;

  it('responds 200 with the bare list, using the caller from the token', async () => {
    const list = [{ historyId: 'a' }];
    const service = { use: jest.fn().mockResolvedValue(list) };
    const res = mockRes();
    const next = jest.fn();

    await new GetQueryHistoryController(service).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ userId: 3, databaseUser: 'HR' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(list);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('boom');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();

    await new GetQueryHistoryController(service).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
