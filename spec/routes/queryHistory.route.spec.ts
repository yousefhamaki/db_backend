import authenticate from '../../src/middleware/authenticate';
import { QueryHistoryRoute } from '../../src/routes/queryHistory.route';

jest.mock('../../src/db/pool', () => ({ withConnection: jest.fn() }));
jest.mock('../../src/middleware/authenticate', () => ({ __esModule: true, default: jest.fn() }));

interface RouteLayer {
  route: { path: string; methods: Record<string, boolean>; stack: { handle: unknown }[] };
}

describe('QueryHistoryRoute', () => {
  const layers = (new QueryHistoryRoute().router as unknown as { stack: RouteLayer[] }).stack.filter((l) => l.route);

  const describeLayer = (layer: RouteLayer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`;

  it('exposes exactly the five query-history endpoints', () => {
    expect(layers.map(describeLayer).sort()).toEqual(
      ['DELETE /', 'DELETE /:historyId', 'GET /', 'POST /', 'POST /import'].sort()
    );
  });

  it('puts authenticate first on every route', () => {
    for (const layer of layers) {
      expect(layer.route.stack[0].handle).toBe(authenticate);
    }
  });

  it('validates, then handles: authenticate, validation, controller', () => {
    for (const layer of layers) {
      expect(layer.route.stack).toHaveLength(3);
      expect(layer.route.stack.every((s) => typeof s.handle === 'function')).toBe(true);
    }
  });
});
