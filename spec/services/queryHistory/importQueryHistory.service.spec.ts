import { ImportQueryHistoryResultDto } from '../../../src/dtos/queryHistory/importQueryHistoryResult.dto';
import { IQueryHistoryRecorder } from '../../../src/interfaces/queryHistory.interface';
import { ImportQueryHistoryService } from '../../../src/services/queryHistory/importQueryHistory.service';

describe('ImportQueryHistoryService', () => {
  const items = [
    { sql: 'select 1', databaseUser: 'HR', siteName: null, executedAt: new Date('2026-01-01T00:00:00.000Z') },
    { sql: 'select 2', databaseUser: 'HR', siteName: 'Prod', executedAt: new Date('2026-01-02T00:00:00.000Z') },
  ];

  let recorder: jest.Mocked<IQueryHistoryRecorder>;
  let service: ImportQueryHistoryService;

  beforeEach(() => {
    recorder = {
      record: jest.fn().mockResolvedValue({
        saved: [{ historyId: 'a', sql: 's', databaseUser: 'HR', siteName: null, executedAt: 'x' }],
        skipped: 1,
        total: 9,
      }),
    };
    service = new ImportQueryHistoryService(recorder);
  });

  it('records the whole batch for the caller, keeping the newer duplicate', async () => {
    await service.use({ userId: 3, items });
    expect(recorder.record).toHaveBeenCalledWith(3, items, 'keepNewer');
  });

  it('returns the import summary', async () => {
    const result = await service.use({ userId: 3, items });

    expect(result).toBeInstanceOf(ImportQueryHistoryResultDto);
    expect({ ...result }).toEqual({ imported: 1, skipped: 1, total: 9 });
  });

  it('lets recorder errors through', async () => {
    recorder.record.mockRejectedValue(new Error('db down'));
    await expect(service.use({ userId: 3, items })).rejects.toThrow('db down');
  });
});
