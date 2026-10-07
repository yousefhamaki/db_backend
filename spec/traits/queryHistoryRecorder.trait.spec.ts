import { QUERY_HISTORY } from '../../src/constants/queryHistory.constants';
import { ConflictError } from '../../src/errors/ConflictError';
import {
  IQueryHistoryModel,
  IQueryHistoryTransaction,
  ISqlHasher,
} from '../../src/interfaces/queryHistory.interface';
import { QueryHistoryRecorder } from '../../src/traits/queryHistoryRecorder.trait';

describe('QueryHistoryRecorder', () => {
  const NOW = new Date('2026-10-07T10:00:00.000Z');
  const userId = 7;

  let tx: jest.Mocked<IQueryHistoryTransaction>;
  let model: jest.Mocked<IQueryHistoryModel>;
  let hasher: jest.Mocked<ISqlHasher>;
  let ids: number;
  let recorder: QueryHistoryRecorder;

  beforeEach(() => {
    tx = {
      findByHash: jest.fn().mockResolvedValue(null),
      deleteById: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
      trimToLimit: jest.fn().mockResolvedValue(undefined),
      countByUser: jest.fn().mockResolvedValue(1),
    };
    model = {
      findByDatabaseUser: jest.fn(),
      deleteById: jest.fn(),
      deleteByDatabaseUser: jest.fn(),
      runInTransaction: jest.fn().mockImplementation((work) => work(tx)),
    };
    hasher = { hash: jest.fn().mockImplementation((sql: string) => `hash(${sql})`) };
    ids = 0;
    recorder = new QueryHistoryRecorder(model, hasher, () => `id-${++ids}`, () => NOW);
  });

  const entry = (overrides: Record<string, unknown> = {}) => ({
    sql: 'select 1',
    databaseUser: 'HR',
    siteName: 'Prod' as string | null,
    ...overrides,
  });

  describe('saving a new entry', () => {
    it('inserts it with a generated id, the hash and "now" as executedAt', async () => {
      const result = await recorder.record(userId, [entry()], 'replace');

      expect(tx.insert).toHaveBeenCalledWith({
        historyId: 'id-1',
        userId,
        sql: 'select 1',
        sqlHash: 'hash(select 1)',
        databaseUser: 'HR',
        siteName: 'Prod',
        executedAt: '2026-10-07T10:00:00.000Z',
      });
      expect(result.saved).toEqual([
        {
          historyId: 'id-1',
          sql: 'select 1',
          databaseUser: 'HR',
          siteName: 'Prod',
          executedAt: '2026-10-07T10:00:00.000Z',
        },
      ]);
      expect(result.skipped).toBe(0);
    });

    it('does not leak the owner or the hash into the saved entities', async () => {
      const { saved } = await recorder.record(userId, [entry()], 'replace');
      expect(saved[0]).not.toHaveProperty('userId');
      expect(saved[0]).not.toHaveProperty('sqlHash');
    });

    it("keeps the client's executedAt when one is given", async () => {
      await recorder.record(userId, [entry({ executedAt: new Date('2026-01-02T03:04:05.678Z') })], 'keepNewer');
      expect(tx.insert).toHaveBeenCalledWith(expect.objectContaining({ executedAt: '2026-01-02T03:04:05.678Z' }));
    });

    it('looks for an existing duplicate by user, database user and hash', async () => {
      await recorder.record(userId, [entry()], 'replace');
      expect(tx.findByHash).toHaveBeenCalledWith(userId, 'HR', 'hash(select 1)');
    });
  });

  describe("policy 'replace'", () => {
    it('deletes the existing duplicate and inserts a fresh entry', async () => {
      tx.findByHash.mockResolvedValue({ historyId: 'old-id', executedAt: '2030-01-01T00:00:00.000Z' });

      const result = await recorder.record(userId, [entry()], 'replace');

      expect(tx.deleteById).toHaveBeenCalledWith(userId, 'old-id');
      expect(tx.insert).toHaveBeenCalledTimes(1);
      expect(result.saved[0].historyId).toBe('id-1');
      expect(tx.deleteById.mock.invocationCallOrder[0]).toBeLessThan(tx.insert.mock.invocationCallOrder[0]);
    });
  });

  describe("policy 'keepNewer'", () => {
    const incoming = entry({ executedAt: new Date('2026-05-01T00:00:00.000Z') });

    it('skips the incoming entry when the existing one is newer', async () => {
      tx.findByHash.mockResolvedValue({ historyId: 'old-id', executedAt: '2026-06-01T00:00:00.000Z' });

      const result = await recorder.record(userId, [incoming], 'keepNewer');

      expect(tx.deleteById).not.toHaveBeenCalled();
      expect(tx.insert).not.toHaveBeenCalled();
      expect(result.saved).toEqual([]);
      expect(result.skipped).toBe(1);
    });

    it('skips the incoming entry when both have the same time', async () => {
      tx.findByHash.mockResolvedValue({ historyId: 'old-id', executedAt: '2026-05-01T00:00:00.000Z' });

      const result = await recorder.record(userId, [incoming], 'keepNewer');

      expect(result.skipped).toBe(1);
      expect(tx.insert).not.toHaveBeenCalled();
    });

    it('replaces the existing entry when the incoming one is newer', async () => {
      tx.findByHash.mockResolvedValue({ historyId: 'old-id', executedAt: '2026-04-01T00:00:00.000Z' });

      const result = await recorder.record(userId, [incoming], 'keepNewer');

      expect(tx.deleteById).toHaveBeenCalledWith(userId, 'old-id');
      expect(tx.insert).toHaveBeenCalledTimes(1);
      expect(result.skipped).toBe(0);
      expect(result.saved).toHaveLength(1);
    });
  });

  describe('a batch with repeated SQL', () => {
    it('keeps only the newest entry for the same SQL and database user', async () => {
      await recorder.record(
        userId,
        [
          entry({ executedAt: new Date('2026-03-01T00:00:00.000Z') }),
          entry({ executedAt: new Date('2026-05-01T00:00:00.000Z') }),
          entry({ executedAt: new Date('2026-04-01T00:00:00.000Z') }),
        ],
        'keepNewer'
      );

      expect(tx.insert).toHaveBeenCalledTimes(1);
      expect(tx.insert).toHaveBeenCalledWith(expect.objectContaining({ executedAt: '2026-05-01T00:00:00.000Z' }));
    });

    it('treats the same SQL for different database users as different entries', async () => {
      await recorder.record(userId, [entry({ databaseUser: 'HR' }), entry({ databaseUser: 'SCOTT' })], 'replace');
      expect(tx.insert).toHaveBeenCalledTimes(2);
    });

    it('treats different SQL for the same database user as different entries', async () => {
      await recorder.record(userId, [entry({ sql: 'select 1' }), entry({ sql: 'select 2' })], 'replace');
      expect(tx.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('the per-user limit', () => {
    it('trims once, after the whole batch has been written', async () => {
      await recorder.record(userId, [entry({ sql: 'a' }), entry({ sql: 'b' }), entry({ sql: 'c' })], 'replace');

      expect(tx.trimToLimit).toHaveBeenCalledTimes(1);
      expect(tx.trimToLimit).toHaveBeenCalledWith(userId, QUERY_HISTORY.MAX_ENTRIES_PER_USER);
      const lastInsert = Math.max(...tx.insert.mock.invocationCallOrder);
      expect(tx.trimToLimit.mock.invocationCallOrder[0]).toBeGreaterThan(lastInsert);
    });

    it('reports the total counted after trimming', async () => {
      tx.countByUser.mockResolvedValue(200);
      const result = await recorder.record(userId, [entry()], 'replace');

      expect(result.total).toBe(200);
      expect(tx.countByUser.mock.invocationCallOrder[0]).toBeGreaterThan(tx.trimToLimit.mock.invocationCallOrder[0]);
    });

    it('still trims and counts for an empty batch', async () => {
      const result = await recorder.record(userId, [], 'keepNewer');

      expect(tx.insert).not.toHaveBeenCalled();
      expect(tx.trimToLimit).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ saved: [], skipped: 0, total: 1 });
    });
  });

  describe('transactions and conflicts', () => {
    it('does the whole job in a single transaction', async () => {
      await recorder.record(userId, [entry({ sql: 'a' }), entry({ sql: 'b' })], 'replace');
      expect(model.runInTransaction).toHaveBeenCalledTimes(1);
    });

    it('retries once when a concurrent save wins the unique key', async () => {
      tx.insert.mockRejectedValueOnce(new ConflictError('already there'));

      const result = await recorder.record(userId, [entry()], 'replace');

      expect(model.runInTransaction).toHaveBeenCalledTimes(2);
      expect(result.saved).toHaveLength(1);
    });

    it('gives up with the ConflictError when the retry conflicts too', async () => {
      tx.insert.mockRejectedValue(new ConflictError('already there'));

      await expect(recorder.record(userId, [entry()], 'replace')).rejects.toBeInstanceOf(ConflictError);
      expect(model.runInTransaction).toHaveBeenCalledTimes(2);
    });

    it('does not retry other errors', async () => {
      tx.insert.mockRejectedValue(new Error('connection lost'));

      await expect(recorder.record(userId, [entry()], 'replace')).rejects.toThrow('connection lost');
      expect(model.runInTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('defaults', () => {
    it('works with the real id generator and clock when none are injected', async () => {
      const real = new QueryHistoryRecorder(model, hasher);
      const { saved } = await real.record(userId, [entry()], 'replace');

      expect(saved[0].historyId).toMatch(/^[0-9a-f-]{36}$/);
      expect(new Date(saved[0].executedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
