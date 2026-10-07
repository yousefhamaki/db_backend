import { Sha256SqlHasher } from '../../src/traits/sqlHasher.trait';

describe('Sha256SqlHasher', () => {
  const hasher = new Sha256SqlHasher();

  it('returns the known SHA-256 hex digest', () => {
    expect(hasher.hash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('is deterministic and 64 hex characters long', () => {
    expect(hasher.hash('select 1 from dual')).toBe(hasher.hash('select 1 from dual'));
    expect(hasher.hash('select 1 from dual')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is case and whitespace sensitive, so different SQL never collides by accident', () => {
    expect(hasher.hash('select 1')).not.toBe(hasher.hash('SELECT 1'));
    expect(hasher.hash('select 1')).not.toBe(hasher.hash('select  1'));
  });

  it('hashes non-ASCII text', () => {
    expect(hasher.hash("select 'مرحبا' from dual")).toMatch(/^[0-9a-f]{64}$/);
  });
});
