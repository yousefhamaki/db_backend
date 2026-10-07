import { QUERY_HISTORY } from '../../../src/constants/queryHistory.constants';
import { importQueryHistorySchema } from '../../../src/validation/queryHistory/importQueryHistory.validation';

describe('importQueryHistorySchema', () => {
  // Same options the ValidationMiddleware uses.
  const validate = (payload: unknown) => importQueryHistorySchema.validate(payload, { abortEarly: false, stripUnknown: true });

  const item = {
    sql: ' select 1 ',
    databaseUser: 'hr',
    siteName: 'Prod',
    executedAt: '2026-10-07T09:12:00Z',
  };

  it('accepts a valid batch, normalising each item and turning executedAt into a Date', () => {
    const { error, value } = validate([item]);

    expect(error).toBeUndefined();
    expect(value[0].sql).toBe('select 1');
    expect(value[0].databaseUser).toBe('HR');
    expect(value[0].executedAt).toBeInstanceOf(Date);
    expect(value[0].executedAt.toISOString()).toBe('2026-10-07T09:12:00.000Z');
  });

  it('accepts an empty array', () => {
    expect(validate([]).error).toBeUndefined();
  });

  it('defaults a missing siteName to null', () => {
    const { siteName: _omit, ...withoutSite } = item;
    expect(validate([withoutSite]).value[0].siteName).toBeNull();
  });

  it('rejects the whole batch when one item is invalid, and says which', () => {
    const { error } = validate([item, { ...item, sql: '   ' }]);

    expect(error).toBeDefined();
    expect(error!.details.some((d) => d.path.join('.') === '1.sql')).toBe(true);
  });

  it.each([
    ['missing executedAt', { ...item, executedAt: undefined }],
    ['an invalid executedAt', { ...item, executedAt: 'yesterday' }],
    ['a non-ISO executedAt', { ...item, executedAt: '10/07/2026' }],
    ['a missing database user', { ...item, databaseUser: undefined }],
  ])('rejects an item with %s', (_label, bad) => {
    expect(validate([bad]).error).toBeDefined();
  });

  it('rejects a body that is not an array', () => {
    expect(validate(item).error).toBeDefined();
    expect(validate(undefined).error).toBeDefined();
  });

  it('accepts exactly the maximum number of items and rejects one more', () => {
    const batch = (n: number) => Array.from({ length: n }, () => item);
    expect(validate(batch(QUERY_HISTORY.MAX_IMPORT_ITEMS)).error).toBeUndefined();
    expect(validate(batch(QUERY_HISTORY.MAX_IMPORT_ITEMS + 1)).error).toBeDefined();
  });
});
