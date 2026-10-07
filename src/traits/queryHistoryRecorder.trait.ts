import { randomUUID } from 'crypto';
import { QUERY_HISTORY } from '../constants/queryHistory.constants';
import { ConflictError } from '../errors/ConflictError';
import {
  DuplicatePolicy,
  IQueryHistoryModel,
  IQueryHistoryRecorder,
  ISqlHasher,
  QueryHistoryEntity,
  QueryHistoryRecord,
  RecordEntryInput,
  RecordResult,
} from '../interfaces/queryHistory.interface';

type PreparedEntry = Omit<QueryHistoryRecord, 'historyId' | 'userId'>;

/**
 * Stores query-history entries: replaces duplicates, then enforces the per-user limit.
 * Shared by the save and import endpoints so both follow exactly the same rules.
 */
export class QueryHistoryRecorder implements IQueryHistoryRecorder {
  constructor(
    private readonly model: IQueryHistoryModel,
    private readonly hasher: ISqlHasher,
    private readonly newId: () => string = randomUUID,
    private readonly now: () => Date = () => new Date()
  ) {}

  async record(userId: number, entries: RecordEntryInput[], policy: DuplicatePolicy): Promise<RecordResult> {
    const prepared = this.dedupe(entries.map((entry) => this.prepare(entry)));
    return this.withOneRetry(() => this.store(userId, prepared, policy));
  }

  private prepare(entry: RecordEntryInput): PreparedEntry {
    return {
      sql: entry.sql,
      sqlHash: this.hasher.hash(entry.sql),
      databaseUser: entry.databaseUser,
      siteName: entry.siteName,
      executedAt: (entry.executedAt ?? this.now()).toISOString(),
    };
  }

  /** Within one batch the same SQL for the same database user keeps only its newest entry. */
  private dedupe(entries: PreparedEntry[]): PreparedEntry[] {
    const newest = new Map<string, PreparedEntry>();
    for (const entry of entries) {
      const key = `${entry.databaseUser}\u0000${entry.sqlHash}`;
      const current = newest.get(key);
      if (!current || entry.executedAt >= current.executedAt) newest.set(key, entry);
    }
    return [...newest.values()];
  }

  private store(userId: number, entries: PreparedEntry[], policy: DuplicatePolicy): Promise<RecordResult> {
    return this.model.runInTransaction(async (tx) => {
      const saved: QueryHistoryEntity[] = [];
      let skipped = 0;

      for (const entry of entries) {
        const existing = await tx.findByHash(userId, entry.databaseUser, entry.sqlHash);
        if (existing) {
          // ISO-8601 UTC strings of the same shape sort the same way as the instants they describe.
          if (policy === 'keepNewer' && existing.executedAt >= entry.executedAt) {
            skipped += 1;
            continue;
          }
          await tx.deleteById(userId, existing.historyId);
        }

        const record: QueryHistoryRecord = { ...entry, historyId: this.newId(), userId };
        await tx.insert(record);
        saved.push({
          historyId: record.historyId,
          sql: record.sql,
          databaseUser: record.databaseUser,
          siteName: record.siteName,
          executedAt: record.executedAt,
        });
      }

      await tx.trimToLimit(userId, QUERY_HISTORY.MAX_ENTRIES_PER_USER);
      const total = await tx.countByUser(userId);
      return { saved, skipped, total };
    });
  }

  /** Two simultaneous saves of the same SQL can collide on the unique key; the second simply retries. */
  private async withOneRetry<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ConflictError) return work();
      throw error;
    }
  }
}
