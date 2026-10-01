const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./swagger');
const authRoutes = require('./routes/auth.routes');
const connectionsRoutes = require('./routes/connections.routes');
const devicesRoutes = require('./routes/devices.routes');
const preferencesRoutes = require('./routes/preferences.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/preferences', preferencesRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
