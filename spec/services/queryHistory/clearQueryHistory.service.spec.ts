import { IQueryHistoryModel } from '../../../src/interfaces/queryHistory.interface';
import { ClearQueryHistoryService } from '../../../src/services/queryHistory/clearQueryHistory.service';

describe('ClearQueryHistoryService', () => {
  let model: jest.Mocked<Pick<IQueryHistoryModel, 'deleteByDatabaseUser'>>;
  let service: ClearQueryHistoryService;

  beforeEach(() => {
    model = { deleteByDatabaseUser: jest.fn().mockResolvedValue(5) };
    service = new ClearQueryHistoryService(model as unknown as IQueryHistoryModel);
  });

  it("deletes only that database user's entries for the caller", async () => {
    await service.use({ userId: 3, databaseUser: 'HR' });
    expect(model.deleteByDatabaseUser).toHaveBeenCalledWith(3, 'HR');
  });

  it('succeeds with no result even when there was nothing to delete', async () => {
    model.deleteByDatabaseUser.mockResolvedValue(0);
    await expect(service.use({ userId: 3, databaseUser: 'HR' })).resolves.toBeUndefined();
  });
});
