require('dotenv').config();
const app = require('./app');
const { initPool, closePool } = require('./db/pool');

const PORT = process.env.PORT || 3000;

async function main() {
  await initPool();
  const server = app.listen(PORT, () => console.log(`API listening on port ${PORT}`));

  const shutdown = async () => {
    server.close();
    await closePool();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
