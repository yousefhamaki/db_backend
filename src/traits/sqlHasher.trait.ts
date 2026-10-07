import { createHash } from 'crypto';
import { ISqlHasher } from '../interfaces/queryHistory.interface';

export class Sha256SqlHasher implements ISqlHasher {
  hash(sql: string): string {
    return createHash('sha256').update(sql, 'utf8').digest('hex');
  }
}
