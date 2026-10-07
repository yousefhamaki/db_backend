import { ImportQueryHistoryResultDto } from '../../../src/dtos/queryHistory/importQueryHistoryResult.dto';

describe('ImportQueryHistoryResultDto', () => {
  it('summarises a record result', () => {
    const dto = new ImportQueryHistoryResultDto({
      saved: [
        { historyId: 'a', sql: 's', databaseUser: 'HR', siteName: null, executedAt: 'x' },
        { historyId: 'b', sql: 't', databaseUser: 'HR', siteName: null, executedAt: 'y' },
      ],
      skipped: 3,
      total: 17,
    });

    expect({ ...dto }).toEqual({ imported: 2, skipped: 3, total: 17 });
  });

  it('reports zero imported when everything was skipped', () => {
    expect({ ...new ImportQueryHistoryResultDto({ saved: [], skipped: 4, total: 4 }) }).toEqual({
      imported: 0,
      skipped: 4,
      total: 4,
    });
  });
});
