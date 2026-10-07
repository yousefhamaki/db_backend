import { QueryHistoryDto } from '../../../src/dtos/queryHistory/queryHistory.dto';
import { IQueryHistoryRecorder } from '../../../src/interfaces/queryHistory.interface';
import { SaveQueryHistoryService } from '../../../src/services/queryHistory/saveQueryHistory.service';

describe('SaveQueryHistoryService', () => {
  const body = { sql: 'select 1', databaseUser: 'HR', siteName: 'Prod' };
  const saved = {
    historyId: 'id-1',
    sql: 'select 1',
    databaseUser: 'HR',
    siteName: 'Prod',
    executedAt: '2026-10-07T09:12:00.000Z',
  };

  let recorder: jest.Mocked<IQueryHistoryRecorder>;
  let service: SaveQueryHistoryService;

  beforeEach(() => {
    recorder = { record: jest.fn().mockResolvedValue({ saved: [saved], skipped: 0, total: 1 }) };
    service = new SaveQueryHistoryService(recorder);
  });

  it('records the entry for the caller, replacing any duplicate', async () => {
    await service.use({ userId: 3, body });
    expect(recorder.record).toHaveBeenCalledWith(3, [body], 'replace');
  });

  it('returns the saved entry as a DTO', async () => {
    const result = await service.use({ userId: 3, body });

    expect(result).toBeInstanceOf(QueryHistoryDto);
    expect({ ...result }).toEqual(saved);
  });

  it('lets recorder errors through', async () => {
    recorder.record.mockRejectedValue(new Error('db down'));
    await expect(service.use({ userId: 3, body })).rejects.toThrow('db down');
  });
});
