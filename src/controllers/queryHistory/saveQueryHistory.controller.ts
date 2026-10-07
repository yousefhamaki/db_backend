import { NextFunction, Request, Response } from 'express';
import { QueryHistoryDto } from '../../dtos/queryHistory/queryHistory.dto';
import { SaveQueryHistoryRequestDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';
import { SaveQueryHistoryInput } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class SaveQueryHistoryController {
  constructor(private readonly service: IService<SaveQueryHistoryInput, QueryHistoryDto>) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({
        userId: req.user!.userId,
        body: req.body as SaveQueryHistoryRequestDto,
      });
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  };
}
