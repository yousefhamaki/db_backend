import { Request } from 'express';
import { ImportQueryHistoryController } from '../../../src/controllers/queryHistory/importQueryHistory.controller';
import { mockRes } from '../../support/mockRes';

describe('ImportQueryHistoryController', () => {
  const body = [{ sql: 'select 1', databaseUser: 'HR', siteName: null, executedAt: new Date() }];
  const req = { user: { userId: 3, userName: 'a@b.c' }, body } as unknown as Request;

  it('responds 200 with the import summary, using the caller from the token', async () => {
    const summary = { imported: 1, skipped: 0, total: 1 };
    const service = { use: jest.fn().mockResolvedValue(summary) };
    const res = mockRes();
    const next = jest.fn();

    await new ImportQueryHistoryController(service).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ userId: 3, items: body });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(summary);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors to next', async () => {
    const error = new Error('boom');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();

    await new ImportQueryHistoryController(service).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});
