const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const registerRoutes = require('./routes');
const { initMongo } = require('./config/mongo');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandlers');
const { bootstrap } = require('./config/bootstrap');
const { attachCurrentUser } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');

initMongo()
  .then(() => bootstrap())
  .catch((err) => console.error('Mongo initialization failed', err));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(','),
    credentials: true,
  })
);
app.use(cookieParser());
app.use(attachCurrentUser);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api', registerRoutes());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
