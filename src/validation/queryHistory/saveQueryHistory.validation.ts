import Joi from 'joi';
import { QUERY_HISTORY } from '../../constants/queryHistory.constants';
import { SaveQueryHistoryRequestDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';

export const sqlField = Joi.string().trim().max(QUERY_HISTORY.MAX_SQL_LENGTH).required();

export const databaseUserField = Joi.string()
  .trim()
  .uppercase()
  .max(QUERY_HISTORY.MAX_DATABASE_USER_LENGTH)
  .required();

export const siteNameField = Joi.string()
  .trim()
  .max(QUERY_HISTORY.MAX_SITE_NAME_LENGTH)
  .empty('')
  .allow(null)
  .default(null);

// `.required()` on the object itself: a request without a JSON Content-Type leaves req.body undefined.
export const saveQueryHistorySchema = Joi.object<SaveQueryHistoryRequestDto>({
  sql: sqlField,
  databaseUser: databaseUserField,
  siteName: siteNameField,
}).required();
