import { QueryHistoryDto } from '../../../src/dtos/queryHistory/queryHistory.dto';
import { QueryHistoryEntity } from '../../../src/interfaces/queryHistory.interface';

describe('QueryHistoryDto', () => {
  const entity: QueryHistoryEntity = {
    historyId: 'id-1',
    sql: 'select 1',
    databaseUser: 'HR',
    siteName: 'Prod',
    executedAt: '2026-10-07T09:12:00.000Z',
  };

  it('copies exactly the five public fields', () => {
    expect({ ...new QueryHistoryDto(entity) }).toEqual(entity);
  });

  it('never exposes anything that is not whitelisted', () => {
    const leaky = { ...entity, userId: 9, sqlHash: 'secret' } as QueryHistoryEntity;
    const dto = new QueryHistoryDto(leaky);

    expect(dto).not.toHaveProperty('userId');
    expect(dto).not.toHaveProperty('sqlHash');
  });

  it('keeps a null siteName', () => {
    expect(new QueryHistoryDto({ ...entity, siteName: null }).siteName).toBeNull();
  });
});
