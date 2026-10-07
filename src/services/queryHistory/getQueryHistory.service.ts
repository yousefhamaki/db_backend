import { QueryHistoryDto } from '../../dtos/queryHistory/queryHistory.dto';
import { GetQueryHistoryInput, IQueryHistoryModel } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class GetQueryHistoryService implements IService<GetQueryHistoryInput, QueryHistoryDto[]> {
  constructor(private readonly model: IQueryHistoryModel) {}

  async use({ userId, databaseUser }: GetQueryHistoryInput): Promise<QueryHistoryDto[]> {
    const entries = await this.model.findByDatabaseUser(userId, databaseUser);
    return entries.map((entry) => new QueryHistoryDto(entry));
  }
}
