import oracledb from 'oracledb';
import { QUERY_HISTORY } from '../constants/queryHistory.constants';
import { ConflictError } from '../errors/ConflictError';
import {
  ExistingHistoryEntry,
  IQueryHistoryModel,
  IQueryHistoryTransaction,
  QueryHistoryEntity,
  QueryHistoryRecord,
} from '../interfaces/queryHistory.interface';

/** Runs `work` on a pooled connection and releases it afterwards (see db/pool.js `withConnection`). */
export type ConnectionRunner = <T>(work: (connection: oracledb.Connection) => Promise<T>) => Promise<T>;

const TIMESTAMP = QUERY_HISTORY.TIMESTAMP_FORMAT;

const SELECT_ENTRY = `
  SELECT HISTORY_ID AS "historyId",
         SQL_TEXT AS "sql",
         DATABASE_USER AS "databaseUser",
         SITE_NAME AS "siteName",
         TO_CHAR(EXECUTED_AT, '${TIMESTAMP}') AS "executedAt"
  FROM QUERY_HISTORY`;

const READ_OPTIONS = {
  outFormat: oracledb.OUT_FORMAT_OBJECT,
  fetchInfo: { sql: { type: oracledb.STRING } },
};

class OracleQueryHistoryTransaction implements IQueryHistoryTransaction {
  constructor(private readonly connection: oracledb.Connection) {}

  async findByHash(userId: number, databaseUser: string, sqlHash: string): Promise<ExistingHistoryEntry | null> {
    const result = await this.connection.execute<ExistingHistoryEntry>(
      `SELECT HISTORY_ID AS "historyId", TO_CHAR(EXECUTED_AT, '${TIMESTAMP}') AS "executedAt"
       FROM QUERY_HISTORY
       WHERE USER_ID = :userId AND DATABASE_USER = :databaseUser AND SQL_HASH = :sqlHash`,
      { userId, databaseUser, sqlHash },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return result.rows?.[0] ?? null;
  }

  async deleteById(userId: number, historyId: string): Promise<void> {
    await this.connection.execute(
      `DELETE FROM QUERY_HISTORY WHERE HISTORY_ID = :historyId AND USER_ID = :userId`,
      { historyId, userId }
    );
  }

  async insert(record: QueryHistoryRecord): Promise<void> {
    try {
      await this.connection.execute(
        `INSERT INTO QUERY_HISTORY
           (HISTORY_ID, USER_ID, SQL_TEXT, SQL_HASH, DATABASE_USER, SITE_NAME, EXECUTED_AT)
         VALUES
           (:historyId, :userId, :sql, :sqlHash, :databaseUser, :siteName,
            TO_TIMESTAMP(:executedAt, '${TIMESTAMP}'))`,
        {
          historyId: record.historyId,
          userId: record.userId,
          // Bound as NCLOB so the text reaches the national (UTF-16) character set untouched.
          sql: { val: record.sql, type: oracledb.DB_TYPE_NCLOB },
          sqlHash: record.sqlHash,
          databaseUser: record.databaseUser,
          siteName: record.siteName,
          executedAt: record.executedAt,
        }
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('ORA-00001')) {
        throw new ConflictError('This query is already in the history');
      }
      throw error;
    }
  }

  async trimToLimit(userId: number, limit: number): Promise<void> {
    await this.connection.execute(
      `DELETE FROM QUERY_HISTORY
       WHERE USER_ID = :userId
         AND HISTORY_ID IN (
           SELECT HISTORY_ID FROM (
             SELECT HISTORY_ID,
                    ROW_NUMBER() OVER (ORDER BY EXECUTED_AT DESC, HISTORY_ID) AS RN
             FROM QUERY_HISTORY
             WHERE USER_ID = :userId
           )
           WHERE RN > :limit
         )`,
      { userId, limit }
    );
  }

  async countByUser(userId: number): Promise<number> {
    const result = await this.connection.execute<{ total: number }>(
      `SELECT COUNT(*) AS "total" FROM QUERY_HISTORY WHERE USER_ID = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return Number(result.rows?.[0]?.total ?? 0);
  }
}

export class OracleQueryHistoryModel implements IQueryHistoryModel {
  constructor(private readonly run: ConnectionRunner) {}

  findByDatabaseUser(userId: number, databaseUser: string): Promise<QueryHistoryEntity[]> {
    return this.run(async (connection) => {
      const result = await connection.execute<QueryHistoryEntity>(
        `${SELECT_ENTRY}
         WHERE USER_ID = :userId AND DATABASE_USER = :databaseUser
         ORDER BY EXECUTED_AT DESC, HISTORY_ID`,
        { userId, databaseUser },
        READ_OPTIONS
      );
      return result.rows ?? [];
    });
  }

  deleteById(userId: number, historyId: string): Promise<boolean> {
    return this.run(async (connection) => {
      const result = await connection.execute(
        `DELETE FROM QUERY_HISTORY WHERE HISTORY_ID = :historyId AND USER_ID = :userId`,
        { historyId, userId },
        { autoCommit: true }
      );
      return (result.rowsAffected ?? 0) > 0;
    });
  }

  deleteByDatabaseUser(userId: number, databaseUser: string): Promise<number> {
    return this.run(async (connection) => {
      const result = await connection.execute(
        `DELETE FROM QUERY_HISTORY WHERE USER_ID = :userId AND DATABASE_USER = :databaseUser`,
        { userId, databaseUser },
        { autoCommit: true }
      );
      return result.rowsAffected ?? 0;
    });
  }

  runInTransaction<T>(work: (tx: IQueryHistoryTransaction) => Promise<T>): Promise<T> {
    return this.run(async (connection) => {
      try {
        const outcome = await work(new OracleQueryHistoryTransaction(connection));
        await connection.commit();
        return outcome;
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    });
  }
}
