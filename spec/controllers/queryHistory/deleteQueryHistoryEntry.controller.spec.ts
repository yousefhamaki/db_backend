import { Request } from 'express';
import { DeleteQueryHistoryEntryController } from '../../../src/controllers/queryHistory/deleteQueryHistoryEntry.controller';
import { mockRes } from '../../support/mockRes';

describe('DeleteQueryHistoryEntryController', () => {
  const req = { user: { userId: 3, userName: 'a@b.c' }, params: { historyId: 'abc' } } as unknown as Request;

  it('responds 204 with no body, using the caller from the token', async () => {
    const service = { use: jest.fn().mockResolvedValue(undefined) };
    const res = mockRes();
    const next = jest.fn();

    await new DeleteQueryHistoryEntryController(service).handle(req, res, next);

    expect(service.use).toHaveBeenCalledWith({ userId: 3, historyId: 'abc' });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service errors (such as not found) to next', async () => {
    const error = new Error('not found');
    const service = { use: jest.fn().mockRejectedValue(error) };
    const res = mockRes();
    const next = jest.fn();

    await new DeleteQueryHistoryEntryController(service).handle(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
