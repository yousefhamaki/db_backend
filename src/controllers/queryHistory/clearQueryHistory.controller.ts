import { NextFunction, Request, Response } from 'express';
import { DatabaseUserQueryDto } from '../../dtos/queryHistory/queryHistoryRequest.dto';
import { ClearQueryHistoryInput } from '../../interfaces/queryHistory.interface';
import { IService } from '../../interfaces/service.interface';

export class ClearQueryHistoryController {
  constructor(private readonly service: IService<ClearQueryHistoryInput, void>) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { databaseUser } = req.query as unknown as DatabaseUserQueryDto;
      await this.service.use({ userId: req.user!.userId, databaseUser });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
