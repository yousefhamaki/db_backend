import oracledb from 'oracledb';
import { ConflictError } from '../../src/errors/ConflictError';
import { IQueryHistoryTransaction, QueryHistoryRecord } from '../../src/interfaces/queryHistory.interface';
import { OracleQueryHistoryModel } from '../../src/models/queryHistory.model';

describe('OracleQueryHistoryModel', () => {
  let connection: { execute: jest.Mock; commit: jest.Mock; rollback: jest.Mock };
  let model: OracleQueryHistoryModel;

  beforeEach(() => {
    connection = {
      execute: jest.fn().mockResolvedValue({ rows: [], rowsAffected: 0 }),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    model = new OracleQueryHistoryModel((work) => work(connection as unknown as oracledb.Connection));
  });

  const sqlOf = (call = 0): string => connection.execute.mock.calls[call][0] as string;
  const bindsOf = (call = 0): Record<string, unknown> => connection.execute.mock.calls[call][1];
  const optionsOf = (call = 0): Record<string, unknown> => connection.execute.mock.calls[call][2];

  describe('findByDatabaseUser', () => {
    it("returns the user's rows for that database user, newest first", async () => {
      const rows = [{ historyId: 'a', sql: 'select 1', databaseUser: 'HR', siteName: null, executedAt: 'x' }];
      connection.execute.mockResolvedValue({ rows });

      const result = await model.findByDatabaseUser(3, 'HR');

      expect(result).toEqual(rows);
      expect(bindsOf()).toEqual({ userId: 3, databaseUser: 'HR' });
      expect(sqlOf()).toContain('USER_ID = :userId');
      expect(sqlOf()).toContain('DATABASE_USER = :databaseUser');
      expect(sqlOf()).toContain('ORDER BY EXECUTED_AT DESC');
    });

    it('reads the CLOB as a string and formats the timestamp as UTC ISO-8601', async () => {
      await model.findByDatabaseUser(3, 'HR');

      expect(optionsOf().fetchInfo).toEqual({ sql: { type: oracledb.STRING } });
      expect(optionsOf().outFormat).toBe(oracledb.OUT_FORMAT_OBJECT);
      expect(sqlOf()).toContain(`TO_CHAR(EXECUTED_AT, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"')`);
    });

    it('returns an empty list when the driver returns no rows', async () => {
      connection.execute.mockResolvedValue({});
      await expect(model.findByDatabaseUser(3, 'HR')).resolves.toEqual([]);
    });
  });

  describe('deleteById', () => {
    it("deletes only the caller's row and commits", async () => {
      connection.execute.mockResolvedValue({ rowsAffected: 1 });

      await expect(model.deleteById(3, 'abc')).resolves.toBe(true);
      expect(sqlOf()).toContain('HISTORY_ID = :historyId AND USER_ID = :userId');
      expect(bindsOf()).toEqual({ historyId: 'abc', userId: 3 });
      expect(optionsOf()).toEqual({ autoCommit: true });
    });

    it('returns false when nothing matched', async () => {
      connection.execute.mockResolvedValue({ rowsAffected: 0 });
      await expect(model.deleteById(3, 'abc')).resolves.toBe(false);
    });

    it('returns false when the driver reports no row count', async () => {
      connection.execute.mockResolvedValue({});
      await expect(model.deleteById(3, 'abc')).resolves.toBe(false);
    });
  });

  describe('deleteByDatabaseUser', () => {
    it('deletes only that database user for the caller and returns how many', async () => {
      connection.execute.mockResolvedValue({ rowsAffected: 4 });

      await expect(model.deleteByDatabaseUser(3, 'HR')).resolves.toBe(4);
      expect(sqlOf()).toContain('USER_ID = :userId AND DATABASE_USER = :databaseUser');
      expect(bindsOf()).toEqual({ userId: 3, databaseUser: 'HR' });
      expect(optionsOf()).toEqual({ autoCommit: true });
    });

    it('returns 0 when the driver reports no row count', async () => {
      connection.execute.mockResolvedValue({});
      await expect(model.deleteByDatabaseUser(3, 'HR')).resolves.toBe(0);
    });
  });

  describe('runInTransaction', () => {
    it('commits and returns the result when the work succeeds', async () => {
      await expect(model.runInTransaction(async () => 'done')).resolves.toBe('done');
      expect(connection.commit).toHaveBeenCalledTimes(1);
      expect(connection.rollback).not.toHaveBeenCalled();
    });

    it('rolls back and rethrows when the work fails', async () => {
      await expect(
        model.runInTransaction(async () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');
      expect(connection.rollback).toHaveBeenCalledTimes(1);
      expect(connection.commit).not.toHaveBeenCalled();
    });
  });

  describe('transaction operations', () => {
    const inTx = <T>(work: (tx: IQueryHistoryTransaction) => Promise<T>) => model.runInTransaction(work);

    const record: QueryHistoryRecord = {
      historyId: 'id-1',
      userId: 3,
      sql: 'select 1',
      sqlHash: 'h',
      databaseUser: 'HR',
      siteName: null,
      executedAt: '2026-10-07T09:12:00.000Z',
    };

    it('findByHash returns the existing entry', async () => {
      const existing = { historyId: 'x', executedAt: '2026-10-07T09:12:00.000Z' };
      connection.execute.mockResolvedValue({ rows: [existing] });

      await expect(inTx((tx) => tx.findByHash(3, 'HR', 'h'))).resolves.toEqual(existing);
      expect(bindsOf()).toEqual({ userId: 3, databaseUser: 'HR', sqlHash: 'h' });
      expect(sqlOf()).toContain('USER_ID = :userId AND DATABASE_USER = :databaseUser AND SQL_HASH = :sqlHash');
    });

    it('findByHash returns null when there is none', async () => {
      connection.execute.mockResolvedValue({ rows: [] });
      await expect(inTx((tx) => tx.findByHash(3, 'HR', 'h'))).resolves.toBeNull();
    });

    it('deleteById is scoped to the owner and does not auto-commit', async () => {
      await inTx((tx) => tx.deleteById(3, 'abc'));
      expect(sqlOf()).toContain('HISTORY_ID = :historyId AND USER_ID = :userId');
      expect(bindsOf()).toEqual({ historyId: 'abc', userId: 3 });
      expect(connection.execute.mock.calls[0][2]).toBeUndefined();
    });

    it('insert writes every column and converts the ISO timestamp in SQL', async () => {
      await inTx((tx) => tx.insert(record));

      expect(sqlOf()).toContain('INSERT INTO QUERY_HISTORY');
      expect(sqlOf()).toContain(`TO_TIMESTAMP(:executedAt, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"')`);
      expect(bindsOf()).toEqual({
        historyId: 'id-1',
        userId: 3,
        sql: { val: 'select 1', type: oracledb.DB_TYPE_NCLOB },
        sqlHash: 'h',
        databaseUser: 'HR',
        siteName: null,
        executedAt: '2026-10-07T09:12:00.000Z',
      });
    });

    it('insert binds the SQL as an NCLOB so characters outside the database charset survive', async () => {
      await inTx((tx) => tx.insert({ ...record, sql: "select '✓ مرحبا 你好' from dual" }));

      const bound = bindsOf().sql as { val: string; type: unknown };
      expect(bound.type).toBe(oracledb.DB_TYPE_NCLOB);
      expect(bound.val).toBe("select '✓ مرحبا 你好' from dual");
    });

    it('insert turns a unique-key violation into a ConflictError', async () => {
      connection.execute.mockRejectedValue(new Error('ORA-00001: unique constraint violated'));
      await expect(inTx((tx) => tx.insert(record))).rejects.toBeInstanceOf(ConflictError);
    });

    it('insert rethrows any other database error', async () => {
      connection.execute.mockRejectedValue(new Error('ORA-12899: value too large'));
      await expect(inTx((tx) => tx.insert(record))).rejects.toThrow('ORA-12899');
    });

    it('insert rethrows a non-Error rejection untouched', async () => {
      connection.execute.mockRejectedValue('weird');
      await expect(inTx((tx) => tx.insert(record))).rejects.toBe('weird');
    });

    it("trimToLimit ranks only the caller's rows and removes everything past the limit", async () => {
      await inTx((tx) => tx.trimToLimit(3, 200));

      expect(sqlOf()).toContain('ROW_NUMBER() OVER (ORDER BY EXECUTED_AT DESC');
      expect(sqlOf()).toContain('WHERE RN > :limit');
      expect(sqlOf().match(/USER_ID = :userId/g)).toHaveLength(2);
      expect(bindsOf()).toEqual({ userId: 3, limit: 200 });
    });

    it("countByUser counts the caller's rows", async () => {
      connection.execute.mockResolvedValue({ rows: [{ total: 42 }] });

      await expect(inTx((tx) => tx.countByUser(3))).resolves.toBe(42);
      expect(bindsOf()).toEqual({ userId: 3 });
    });

    it('countByUser returns 0 when the driver returns no rows', async () => {
      connection.execute.mockResolvedValue({});
      await expect(inTx((tx) => tx.countByUser(3))).resolves.toBe(0);
    });
  });
});
