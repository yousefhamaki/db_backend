import { QueryHistoryDto } from '../../dtos/queryHistory/queryHistory.dto';
import { IQueryHistoryRecorder, SaveQueryHistoryInput } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class SaveQueryHistoryService implements IService<SaveQueryHistoryInput, QueryHistoryDto> {
  constructor(private readonly recorder: IQueryHistoryRecorder) {}

  async use({ userId, body }: SaveQueryHistoryInput): Promise<QueryHistoryDto> {
    const { saved } = await this.recorder.record(userId, [body], 'replace');
    return new QueryHistoryDto(saved[0]);
  }
}
