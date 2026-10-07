import { ClearQueryHistoryInput, IQueryHistoryModel } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class ClearQueryHistoryService implements IService<ClearQueryHistoryInput, void> {
  constructor(private readonly model: IQueryHistoryModel) {}

  async use({ userId, databaseUser }: ClearQueryHistoryInput): Promise<void> {
    await this.model.deleteByDatabaseUser(userId, databaseUser);
  }
}
