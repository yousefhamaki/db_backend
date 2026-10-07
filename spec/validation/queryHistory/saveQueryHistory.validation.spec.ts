import { QUERY_HISTORY } from '../../../src/constants/queryHistory.constants';
import { saveQueryHistorySchema } from '../../../src/validation/queryHistory/saveQueryHistory.validation';

describe('saveQueryHistorySchema', () => {
  const valid = { sql: 'select * from emp', databaseUser: 'hr', siteName: 'Prod' };

  it('accepts a valid payload, uppercasing the database user', () => {
    const { error, value } = saveQueryHistorySchema.validate(valid);
    expect(error).toBeUndefined();
    expect(value).toEqual({ sql: 'select * from emp', databaseUser: 'HR', siteName: 'Prod' });
  });

  it('trims the sql', () => {
    expect(saveQueryHistorySchema.validate({ ...valid, sql: '  select 1 \n' }).value.sql).toBe('select 1');
  });

  it('trims and uppercases the database user', () => {
    expect(saveQueryHistorySchema.validate({ ...valid, databaseUser: ' scott ' }).value.databaseUser).toBe('SCOTT');
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['an empty string', ''],
    ['only whitespace', '   \n\t '],
  ])('rejects sql that is %s', (_label, sql) => {
    expect(saveQueryHistorySchema.validate({ ...valid, sql }).error).toBeDefined();
  });

  it('rejects a missing body (no JSON Content-Type leaves req.body undefined)', () => {
    expect(saveQueryHistorySchema.validate(undefined).error).toBeDefined();
  });

  it('rejects a missing database user', () => {
    expect(saveQueryHistorySchema.validate({ sql: 'select 1' }).error).toBeDefined();
  });

  it('rejects sql longer than the limit but accepts exactly the limit', () => {
    const atLimit = 'x'.repeat(QUERY_HISTORY.MAX_SQL_LENGTH);
    expect(saveQueryHistorySchema.validate({ ...valid, sql: atLimit }).error).toBeUndefined();
    expect(saveQueryHistorySchema.validate({ ...valid, sql: atLimit + 'x' }).error).toBeDefined();
  });

  describe('siteName', () => {
    it.each([
      ['missing', undefined],
      ['null', null],
      ['an empty string', ''],
      ['only whitespace', '   '],
    ])('becomes null when %s', (_label, siteName) => {
      const payload = siteName === undefined ? { sql: 'select 1', databaseUser: 'HR' } : { ...valid, siteName };
      const { error, value } = saveQueryHistorySchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.siteName).toBeNull();
    });

    it('is trimmed', () => {
      expect(saveQueryHistorySchema.validate({ ...valid, siteName: '  Prod ' }).value.siteName).toBe('Prod');
    });

    it('rejects a name longer than 50 characters', () => {
      expect(saveQueryHistorySchema.validate({ ...valid, siteName: 'S'.repeat(51) }).error).toBeDefined();
    });
  });
});
