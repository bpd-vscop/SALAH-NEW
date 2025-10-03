const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn('SESSION_SECRET is not set; using insecure fallback.');
    return 'insecure-default-secret-change-me';
  }
  return secret;
};

const buildMongoUri = () => {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  const db = process.env.MONGO_DB || 'salah_store';
  const auth = process.env.MONGO_USER
    ? `${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@`
    : '';

  return `mongodb://${auth}${host}:${port}/${db}`;
};

const getSessionConfig = (MongoStore) => {
  const cookieMaxAgeMinutes = Number(process.env.SESSION_MAX_AGE_MINUTES || 60 * 24);

  return {
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: buildMongoUri(),
      stringify: false,
      touchAfter: Number(process.env.SESSION_TOUCH_AFTER || 3600),
    }),
    cookie: {
      httpOnly: true,
      sameSite: process.env.SESSION_SAMESITE || 'lax',
      secure: process.env.SESSION_SECURE === 'true',
      maxAge: cookieMaxAgeMinutes * 60 * 1000,
    },
  };
};

module.exports = {
  getSessionConfig,
};
