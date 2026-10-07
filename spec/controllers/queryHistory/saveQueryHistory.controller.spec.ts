import { Request } from 'express';
import { SaveQueryHistoryController } from '../../../src/controllers/queryHistory/saveQueryHistory.controller';
import { mockRes } from '../../support/mockRes';

describe('SaveQueryHistoryController', () => {
  const body = { sql: 'select 1', databaseUser: 'HR', siteName: null };
  const req = { user: { userId: 3, userName: 'a@b.c' }, body } as unknown as Request;

  it('responds 201 with the saved entry, using the caller from the token', async () => {
    const saved = { historyId: 'a', sql: 'select 1' };
    const service = { use: jest.fn().mockResolvedValue(saved) };
    const res = mockRes();
    const next = jest.fn();

    await new SaveQueryHistoryController(service).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ userId: 3, body });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(saved);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('boom');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();

    await new SaveQueryHistoryController(service).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
