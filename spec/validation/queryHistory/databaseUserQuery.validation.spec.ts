import { databaseUserQuerySchema } from '../../../src/validation/queryHistory/databaseUserQuery.validation';

describe('databaseUserQuerySchema', () => {
  it('accepts a database user', () => {
    const { error, value } = databaseUserQuerySchema.validate({ databaseUser: 'HR' });
    expect(error).toBeUndefined();
    expect(value).toEqual({ databaseUser: 'HR' });
  });

  it('trims and uppercases it', () => {
    expect(databaseUserQuerySchema.validate({ databaseUser: '  hr ' }).value).toEqual({ databaseUser: 'HR' });
  });

  it.each([
    ['missing', {}],
    ['empty', { databaseUser: '' }],
    ['only spaces', { databaseUser: '   ' }],
    ['longer than 30 characters', { databaseUser: 'A'.repeat(31) }],
  ])('rejects a database user that is %s', (_label, payload) => {
    expect(databaseUserQuerySchema.validate(payload).error).toBeDefined();
  });
});
