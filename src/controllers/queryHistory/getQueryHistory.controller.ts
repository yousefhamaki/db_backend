import { NextFunction, Request, Response } from 'express';
import { QueryHistoryDto } from '../../dtos/queryHistory/queryHistory.dto';
import { DatabaseUserQueryDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';
import { GetQueryHistoryInput } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class GetQueryHistoryController {
  constructor(private readonly service: IService<GetQueryHistoryInput, QueryHistoryDto[]>) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { databaseUser } = req.query as unknown as DatabaseUserQueryDto;
      const data = await this.service.use({ userId: req.user!.userId, databaseUser });
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  };
}
