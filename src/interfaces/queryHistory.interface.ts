import type {
  ImportQueryHistoryItemDto,
  SaveQueryHistoryRequestDto,
} from '../dtos/queryHistory/queryHistoryRequest.dto';

/** A stored entry as the API exposes it. `executedAt` is ISO-8601 UTC with milliseconds. */
export interface QueryHistoryEntity {
  historyId: string;
  sql: string;
  databaseUser: string;
  siteName: string | null;
  executedAt: string;
}

/** A row ready to be inserted: the entity plus its owner and the hash used for uniqueness. */
export interface QueryHistoryRecord extends QueryHistoryEntity {
  userId: number;
  sqlHash: string;
}

export interface ExistingHistoryEntry {
  historyId: string;
  executedAt: string;
}

/** Operations that must share one database transaction. */
export interface IQueryHistoryTransaction {
  findByHash(userId: number, databaseUser: string, sqlHash: string): Promise<ExistingHistoryEntry | null>;
  deleteById(userId: number, historyId: string): Promise<void>;
  insert(record: QueryHistoryRecord): Promise<void>;
  trimToLimit(userId: number, limit: number): Promise<void>;
  countByUser(userId: number): Promise<number>;
}

/** Data access for the QUERY_HISTORY table. Every method is scoped to the owning user. */
export interface IQueryHistoryModel {
  findByDatabaseUser(userId: number, databaseUser: string): Promise<QueryHistoryEntity[]>;
  deleteById(userId: number, historyId: string): Promise<boolean>;
  deleteByDatabaseUser(userId: number, databaseUser: string): Promise<number>;
  runInTransaction<T>(work: (tx: IQueryHistoryTransaction) => Promise<T>): Promise<T>;
}

export interface ISqlHasher {
  hash(sql: string): string;
}

/** `replace`: a duplicate is deleted and re-inserted. `keepNewer`: the newer of the two survives. */
export type DuplicatePolicy = 'replace' | 'keepNewer';

export interface RecordEntryInput {
  sql: string;
  databaseUser: string;
  siteName: string | null;
  /** Omit to use "now". */
  executedAt?: Date;
}

export interface RecordResult {
  saved: QueryHistoryEntity[];
  skipped: number;
  total: number;
}

export interface IQueryHistoryRecorder {
  record(userId: number, entries: RecordEntryInput[], policy: DuplicatePolicy): Promise<RecordResult>;
}

export interface GetQueryHistoryInput {
  userId: number;
  databaseUser: string;
}

export type ClearQueryHistoryInput = GetQueryHistoryInput;

export interface SaveQueryHistoryInput {
  userId: number;
  body: SaveQueryHistoryRequestDto;
}

export interface DeleteQueryHistoryEntryInput {
  userId: number;
  historyId: string;
}

export interface ImportQueryHistoryInput {
  userId: number;
  items: ImportQueryHistoryItemDto[];
}
