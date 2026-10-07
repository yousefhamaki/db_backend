const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./swagger');
const authRoutes = require('./routes/auth.routes');
const connectionsRoutes = require('./routes/connections.routes');
const devicesRoutes = require('./routes/devices.routes');
const preferencesRoutes = require('./routes/preferences.routes');
const authenticate = require('./middleware/authenticate');
const { QueryHistoryRoute } = require('./routes/queryHistory.route');
const { ErrorHandlerMiddleware } = require('./middleware/errorHandler.middleware');
const { QUERY_HISTORY } = require('./constants/queryHistory.constants');

const app = express();
app.use(cors());
// Query history carries large SQL text: authenticate first, then allow a bigger JSON body for this path only.
app.use('/api/query-history', authenticate, express.json({ limit: QUERY_HISTORY.BODY_LIMIT }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/query-history', new QueryHistoryRoute().router);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use(new ErrorHandlerMiddleware().handle);

module.exports = app;
