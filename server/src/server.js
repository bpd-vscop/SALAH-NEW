require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const http = require('http');
const app = require('./app');
const { startCleanupService } = require('./services/cleanupService');

const port = Number(process.env.PORT || 5000);

app.set('trust proxy', process.env.TRUST_PROXY === 'true');

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);

  // Start the cleanup service for unverified accounts
  startCleanupService(24); // Run every 24 hours
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
