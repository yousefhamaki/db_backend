import { NotFoundError } from '../../errors/NotFoundError';
import { DeleteQueryHistoryEntryInput, IQueryHistoryModel } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class DeleteQueryHistoryEntryService implements IService<DeleteQueryHistoryEntryInput, void> {
  constructor(private readonly model: IQueryHistoryModel) {}

  async use({ userId, historyId }: DeleteQueryHistoryEntryInput): Promise<void> {
    const deleted = await this.model.deleteById(userId, historyId);
    if (!deleted) throw new NotFoundError('Query history entry not found');
  }
}
