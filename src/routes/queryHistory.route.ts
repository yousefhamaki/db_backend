import { Router } from 'express';
import { withConnection } from '../db/pool';
import authenticate from '../middleware/authenticate';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { OracleQueryHistoryModel } from '../models/queryHistory.model';
import { Sha256SqlHasher } from '../traits/sqlHasher.trait';
import { QueryHistoryRecorder } from '../traits/queryHistoryRecorder.trait';
import { GetQueryHistoryService } from '../services/queryHistory/getQueryHistory.service';
import { SaveQueryHistoryService } from '../services/queryHistory/saveQueryHistory.service';
import { DeleteQueryHistoryEntryService } from '../services/queryHistory/deleteQueryHistoryEntry.service';
import { ClearQueryHistoryService } from '../services/queryHistory/clearQueryHistory.service';
import { ImportQueryHistoryService } from '../services/queryHistory/importQueryHistory.service';
import { GetQueryHistoryController } from '../controllers/queryHistory/getQueryHistory.controller';
import { SaveQueryHistoryController } from '../controllers/queryHistory/saveQueryHistory.controller';
import { DeleteQueryHistoryEntryController } from '../controllers/queryHistory/deleteQueryHistoryEntry.controller';
import { ClearQueryHistoryController } from '../controllers/queryHistory/clearQueryHistory.controller';
import { ImportQueryHistoryController } from '../controllers/queryHistory/importQueryHistory.controller';
import { databaseUserQuerySchema } from '../validation/queryHistory/databaseUserQuery.validation';
import { historyIdParamSchema } from '../validation/queryHistory/historyIdParam.validation';
import { saveQueryHistorySchema } from '../validation/queryHistory/saveQueryHistory.validation';
import { importQueryHistorySchema } from '../validation/queryHistory/importQueryHistory.validation';

/**
 * @openapi
 * components:
 *   schemas:
 *     QueryHistoryEntry:
 *       type: object
 *       properties:
 *         historyId: { type: string, format: uuid }
 *         sql: { type: string }
 *         databaseUser: { type: string, example: HR }
 *         siteName: { type: string, nullable: true, example: Prod }
 *         executedAt: { type: string, format: date-time, example: '2026-10-07T09:12:00.000Z' }
 *     QueryHistorySaveRequest:
 *       type: object
 *       required: [sql, databaseUser]
 *       properties:
 *         sql: { type: string, description: 'Trimmed by the server; empty is rejected' }
 *         databaseUser: { type: string, description: 'Trimmed and uppercased by the server' }
 *         siteName: { type: string, nullable: true, description: 'Display only' }
 *     QueryHistoryImportItem:
 *       type: object
 *       required: [sql, databaseUser, executedAt]
 *       properties:
 *         sql: { type: string }
 *         databaseUser: { type: string }
 *         siteName: { type: string, nullable: true }
 *         executedAt: { type: string, format: date-time }
 *     QueryHistoryImportResult:
 *       type: object
 *       properties:
 *         imported: { type: integer, description: 'Entries stored from the batch, before the 200 limit is applied' }
 *         skipped: { type: integer, description: 'Entries ignored because a newer duplicate already existed' }
 *         total: { type: integer, description: 'Entries the caller has after the import and the limit' }
 */
export class QueryHistoryRoute {
  readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    const model = new OracleQueryHistoryModel(withConnection);
    const recorder = new QueryHistoryRecorder(model, new Sha256SqlHasher());

    /**
     * @openapi
     * /query-history:
     *   get:
     *     tags: [Query history]
     *     summary: List your saved queries for one database user, newest first
     *     description: No paging. `databaseUser` is trimmed and uppercased before comparing.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - { name: databaseUser, in: query, required: true, schema: { type: string }, example: HR }
     *     responses:
     *       200:
     *         description: OK
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items: { $ref: '#/components/schemas/QueryHistoryEntry' }
     *       400: { description: databaseUser missing or too long }
     *       401: { description: Unauthorized }
     */
    this.router.get(
      '/',
      authenticate,
      ValidationMiddleware.validate(databaseUserQuerySchema, 'query'),
      new GetQueryHistoryController(new GetQueryHistoryService(model)).handle
    );

    /**
     * @openapi
     * /query-history:
     *   post:
     *     tags: [Query history]
     *     summary: Save a query (moves it to the top if it already exists)
     *     description: >
     *       If you already have the same SQL for this database user it is deleted and saved again with
     *       `executedAt` = now, so there is never a duplicate. If you then have more than 200 entries in
     *       total (across all database users) the oldest are deleted until 200 remain.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema: { $ref: '#/components/schemas/QueryHistorySaveRequest' }
     *     responses:
     *       201:
     *         description: The saved entry
     *         content:
     *           application/json:
     *             schema: { $ref: '#/components/schemas/QueryHistoryEntry' }
     *       400: { description: sql is empty, or a field is missing or too long }
     *       401: { description: Unauthorized }
     */
    this.router.post(
      '/',
      authenticate,
      ValidationMiddleware.validate(saveQueryHistorySchema, 'body'),
      new SaveQueryHistoryController(new SaveQueryHistoryService(recorder)).handle
    );

    /**
     * @openapi
     * /query-history/import:
     *   post:
     *     tags: [Query history]
     *     summary: Upload existing history once (e.g. from the phone)
     *     description: >
     *       Same rules as saving a single query, but each entry keeps the client's `executedAt`.
     *       When the same SQL already exists the newer entry is kept. The 200-entry limit is applied
     *       once, after the whole batch. If any item is invalid, nothing is imported.
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: array
     *             maxItems: 1000
     *             items: { $ref: '#/components/schemas/QueryHistoryImportItem' }
     *     responses:
     *       200:
     *         description: Import summary
     *         content:
     *           application/json:
     *             schema: { $ref: '#/components/schemas/QueryHistoryImportResult' }
     *       400: { description: An item is invalid, or the body is not an array }
     *       401: { description: Unauthorized }
     *       413: { description: Body too large }
     */
    this.router.post(
      '/import',
      authenticate,
      ValidationMiddleware.validate(importQueryHistorySchema, 'body'),
      new ImportQueryHistoryController(new ImportQueryHistoryService(recorder)).handle
    );

    /**
     * @openapi
     * /query-history/{historyId}:
     *   delete:
     *     tags: [Query history]
     *     summary: Delete one of your saved queries
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - { name: historyId, in: path, required: true, schema: { type: string, format: uuid } }
     *     responses:
     *       204: { description: Deleted }
     *       400: { description: historyId is not a uuid }
     *       401: { description: Unauthorized }
     *       404: { description: Not found, or not yours }
     */
    this.router.delete(
      '/:historyId',
      authenticate,
      ValidationMiddleware.validate(historyIdParamSchema, 'params'),
      new DeleteQueryHistoryEntryController(new DeleteQueryHistoryEntryService(model)).handle
    );

    /**
     * @openapi
     * /query-history:
     *   delete:
     *     tags: [Query history]
     *     summary: Delete all your saved queries for one database user
     *     description: Your entries for other database users are left alone. `databaseUser` is required.
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - { name: databaseUser, in: query, required: true, schema: { type: string }, example: HR }
     *     responses:
     *       204: { description: Deleted (also when there was nothing to delete) }
     *       400: { description: databaseUser missing or too long }
     *       401: { description: Unauthorized }
     */
    this.router.delete(
      '/',
      authenticate,
      ValidationMiddleware.validate(databaseUserQuerySchema, 'query'),
      new ClearQueryHistoryController(new ClearQueryHistoryService(model)).handle
    );
  }
}
