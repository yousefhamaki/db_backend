import { RecordResult } from '../../interfaces/queryHistory.interface';

export class ImportQueryHistoryResultDto {
  /** Entries stored from the batch (before the per-user limit is applied). */
  readonly imported: number;
  /** Entries ignored because the user already had a newer duplicate. */
  readonly skipped: number;
  /** How many entries the user has after the import and the limit. */
  readonly total: number;

  constructor(result: RecordResult) {
    this.imported = result.saved.length;
    this.skipped = result.skipped;
    this.total = result.total;
  }
}
