/** Validated request shapes for the query-history endpoints. */

export interface DatabaseUserQueryDto {
  databaseUser: string;
}

export interface HistoryIdParamDto {
  historyId: string;
}

export interface SaveQueryHistoryRequestDto {
  sql: string;
  databaseUser: string;
  siteName: string | null;
}

export interface ImportQueryHistoryItemDto extends SaveQueryHistoryRequestDto {
  executedAt: Date;
}

export type ImportQueryHistoryRequestDto = ImportQueryHistoryItemDto[];
