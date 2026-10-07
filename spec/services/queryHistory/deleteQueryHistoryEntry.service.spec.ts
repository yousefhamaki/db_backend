import { NotFoundError } from '../../../src/errors/NotFoundError';
import { IQueryHistoryModel } from '../../../src/interfaces/queryHistory.interface';
import { DeleteQueryHistoryEntryService } from '../../../src/services/queryHistory/deleteQueryHistoryEntry.service';

describe('DeleteQueryHistoryEntryService', () => {
  let model: jest.Mocked<Pick<IQueryHistoryModel, 'deleteById'>>;
  let service: DeleteQueryHistoryEntryService;

  beforeEach(() => {
    model = { deleteById: jest.fn().mockResolvedValue(true) };
    service = new DeleteQueryHistoryEntryService(model as unknown as IQueryHistoryModel);
  });

  it("deletes the caller's entry", async () => {
    await expect(service.use({ userId: 3, historyId: 'abc' })).resolves.toBeUndefined();
    expect(model.deleteById).toHaveBeenCalledWith(3, 'abc');
  });

  it("throws NotFoundError when the entry doesn't exist or isn't the caller's", async () => {
    model.deleteById.mockResolvedValue(false);
    await expect(service.use({ userId: 3, historyId: 'abc' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
