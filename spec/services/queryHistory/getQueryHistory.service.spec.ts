import { QueryHistoryDto } from '../../../src/dtos/queryHistory/queryHistory.dto';
import { IQueryHistoryModel } from '../../../src/interfaces/queryHistory.interface';
import { GetQueryHistoryService } from '../../../src/services/queryHistory/getQueryHistory.service';

describe('GetQueryHistoryService', () => {
  const rows = [
    { historyId: 'b', sql: 'select 2', databaseUser: 'HR', siteName: 'Prod', executedAt: '2026-10-07T09:13:00.000Z' },
    { historyId: 'a', sql: 'select 1', databaseUser: 'HR', siteName: null, executedAt: '2026-10-07T09:12:00.000Z' },
  ];

  let model: jest.Mocked<Pick<IQueryHistoryModel, 'findByDatabaseUser'>>;
  let service: GetQueryHistoryService;

  beforeEach(() => {
    model = { findByDatabaseUser: jest.fn().mockResolvedValue(rows) };
    service = new GetQueryHistoryService(model as unknown as IQueryHistoryModel);
  });

  it("asks the model for the caller's entries for that database user", async () => {
    await service.use({ userId: 3, databaseUser: 'HR' });
    expect(model.findByDatabaseUser).toHaveBeenCalledWith(3, 'HR');
  });

  it('returns DTOs in the order the model gave them', async () => {
    const result = await service.use({ userId: 3, databaseUser: 'HR' });

    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(QueryHistoryDto);
    expect(result.map((r) => r.historyId)).toEqual(['b', 'a']);
  });

  it('returns an empty list when there is no history', async () => {
    model.findByDatabaseUser.mockResolvedValue([]);
    await expect(service.use({ userId: 3, databaseUser: 'HR' })).resolves.toEqual([]);
  });
});
