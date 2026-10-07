import { NextFunction, Request, Response } from 'express';
import { ImportQueryHistoryResultDto } from '../../dtos/queryHistory/importQueryHistoryResult.dto';
import { ImportQueryHistoryRequestDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';
import { ImportQueryHistoryInput } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class ImportQueryHistoryController {
  constructor(private readonly service: IService<ImportQueryHistoryInput, ImportQueryHistoryResultDto>) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({
        userId: req.user!.userId,
        items: req.body as ImportQueryHistoryRequestDto,
      });
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}
