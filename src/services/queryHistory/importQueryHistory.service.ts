import { ImportQueryHistoryResultDto } from '../../dtos/queryHistory/importQueryHistoryResult.dto';
import { IQueryHistoryRecorder, ImportQueryHistoryInput } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class ImportQueryHistoryService implements IService<ImportQueryHistoryInput, ImportQueryHistoryResultDto> {
  constructor(private readonly recorder: IQueryHistoryRecorder) {}

  async use({ userId, items }: ImportQueryHistoryInput): Promise<ImportQueryHistoryResultDto> {
    const result = await this.recorder.record(userId, items, 'keepNewer');
    return new ImportQueryHistoryResultDto(result);
  }
}
