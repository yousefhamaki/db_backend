import Joi from 'joi';
import { HistoryIdParamDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';

export const historyIdParamSchema = Joi.object<HistoryIdParamDto>({
  historyId: Joi.string().guid().lowercase().required(),
});
