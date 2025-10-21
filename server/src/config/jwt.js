const jwt = require('jsonwebtoken');

const TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 6); // default 6h

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('JWT_SECRET is not set; using insecure fallback.');
    return 'insecure-default-jwt-secret-change-me';
  }
  return secret;
};

const getAuthCookieName = () => process.env.AUTH_COOKIE_NAME || 'auth_token';

const getCookieOptions = () => {
  const secureEnv = process.env.AUTH_COOKIE_SECURE;
  const sameSiteEnv = process.env.AUTH_COOKIE_SAMESITE || 'lax';
  return {
    httpOnly: true,
    secure: secureEnv === 'true',
    sameSite: sameSiteEnv,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: '/',
  };
};

const signAuthToken = (user) => {
  const payload = { sub: user.id, role: user.role };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL_SECONDS });
};

const verifyAuthToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = {
  TOKEN_TTL_SECONDS,
  getJwtSecret,
  getAuthCookieName,
  getCookieOptions,
  signAuthToken,
  verifyAuthToken,
};

