import { NextFunction, Request, Response } from 'express';
import { HistoryIdParamDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';
import { DeleteQueryHistoryEntryInput } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class DeleteQueryHistoryEntryController {
  constructor(private readonly service: IService<DeleteQueryHistoryEntryInput, void>) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { historyId } = req.params as unknown as HistoryIdParamDto;
      await this.service.use({ userId: req.user!.userId, historyId });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
