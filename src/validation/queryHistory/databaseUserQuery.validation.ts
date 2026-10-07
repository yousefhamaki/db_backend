import Joi from 'joi';
import { QUERY_HISTORY } from '../../constants/queryHistory.constants';
import { DatabaseUserQueryDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';

export const databaseUserQuerySchema = Joi.object<DatabaseUserQueryDto>({
  databaseUser: Joi.string().trim().uppercase().max(QUERY_HISTORY.MAX_DATABASE_USER_LENGTH).required(),
});
