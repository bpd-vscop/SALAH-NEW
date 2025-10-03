const mongoose = require('mongoose');

let connectionInstance = null;

const buildMongoUri = () => {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  const db = process.env.MONGO_DB || 'salah_store';
  const auth = process.env.MONGO_USER
    ? ${process.env.MONGO_USER}:@
    : '';

  return mongodb://System.Management.Automation.Internal.Host.InternalHost:/;
};

const initMongo = async () => {
  if (connectionInstance) {
    return connectionInstance;
  }

  const uri = buildMongoUri();

  mongoose.set('strictQuery', true);

  connectionInstance = mongoose
    .connect(uri, {
      autoIndex: false,
      maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 10),
    })
    .then((conn) => {
      console.log('MongoDB connected');
      return conn;
    })
    .catch((err) => {
      console.error('Mongo connection error', err);
      connectionInstance = null;
      throw err;
    });

  return connectionInstance;
};

module.exports = {
  initMongo,
};
