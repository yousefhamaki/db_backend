import { historyIdParamSchema } from '../../../src/validation/queryHistory/historyIdParam.validation';

describe('historyIdParamSchema', () => {
  const uuid = '3f2b8c1e-5d4a-4b6f-9a7e-1c2d3e4f5a6b';

  it('accepts a uuid', () => {
    expect(historyIdParamSchema.validate({ historyId: uuid }).error).toBeUndefined();
  });

  it('lowercases an uppercase uuid so it matches what is stored', () => {
    expect(historyIdParamSchema.validate({ historyId: uuid.toUpperCase() }).value).toEqual({ historyId: uuid });
  });

  it.each([
    ['missing', {}],
    ['not a uuid', { historyId: 'abc' }],
    ['a number', { historyId: '12345' }],
    ['a sql fragment', { historyId: "' OR 1=1 --" }],
  ])('rejects a historyId that is %s', (_label, payload) => {
    expect(historyIdParamSchema.validate(payload).error).toBeDefined();
  });
});
