const mongoose = require('mongoose');

let connectionInstance = null;

const buildMongoUri = () => {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  const db = process.env.MONGO_DB || 'salah_store';
  let auth = '';

  if (process.env.MONGO_USER && process.env.MONGO_PASSWORD) {
    auth = `${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@`;
  } else if (process.env.MONGO_USER) {
    auth = `${process.env.MONGO_USER}@`;
  }

  return `mongodb://${auth}${host}:${port}/${db}`;
};

const initMongo = async () => {
  if (connectionInstance) {
    return connectionInstance;
  }

  const uri = buildMongoUri();

  mongoose.set('strictQuery', true);

  try {
    connectionInstance = await mongoose.connect(uri, {
      autoIndex: false,
      maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 10),
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Mongo connection error', error);
    connectionInstance = null;
    throw error;
  }

  return connectionInstance;
};

module.exports = {
  initMongo,
};
