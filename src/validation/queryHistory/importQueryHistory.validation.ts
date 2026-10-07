import Joi from 'joi';
import { QUERY_HISTORY } from '../../constants/queryHistory.constants';
import { ImportQueryHistoryItemDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';
import { databaseUserField, siteNameField, sqlField } from './saveQueryHistory.validation';

const importItemSchema = Joi.object<ImportQueryHistoryItemDto>({
  sql: sqlField,
  databaseUser: databaseUserField,
  siteName: siteNameField,
  executedAt: Joi.date().iso().required(),
});

export const importQueryHistorySchema = Joi.array<ImportQueryHistoryItemDto[]>()
  .items(importItemSchema)
  .max(QUERY_HISTORY.MAX_IMPORT_ITEMS)
  .required();
