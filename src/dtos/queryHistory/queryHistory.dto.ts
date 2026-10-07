import { QueryHistoryEntity } from '../../interfaces/queryHistory.interface';

export class QueryHistoryDto {
  readonly historyId: string;
  readonly sql: string;
  readonly databaseUser: string;
  readonly siteName: string | null;
  readonly executedAt: string;

  constructor(entry: QueryHistoryEntity) {
    this.historyId = entry.historyId;
    this.sql = entry.sql;
    this.databaseUser = entry.databaseUser;
    this.siteName = entry.siteName;
    this.executedAt = entry.executedAt;
  }
}
