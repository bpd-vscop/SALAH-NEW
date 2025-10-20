const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { badRequest } = require('../utils/appError');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
const verificationDir = path.join(uploadsRoot, 'verification');
const profileDir = path.join(uploadsRoot, 'profile');

ensureDir(verificationDir);
ensureDir(profileDir);

const allowedVerificationMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
const allowedProfileMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

const makeStorage = (dir) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname) || '.dat';
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

const makeFilter = (allowed) => (_req, file, cb) => {
  if (!allowed.includes(file.mimetype)) {
    return cb(badRequest('Unsupported file type', [{ allowed }]));
  }
  cb(null, true);
};

const verificationUpload = multer({
  storage: makeStorage(verificationDir),
  fileFilter: makeFilter(allowedVerificationMimeTypes),
  limits: { fileSize: Number(process.env.UPLOAD_MAX_MB || 10) * 1024 * 1024 },
});

const profileUpload = multer({
  storage: makeStorage(profileDir),
  fileFilter: makeFilter(allowedProfileMimeTypes),
  limits: { fileSize: Number(process.env.PROFILE_UPLOAD_MAX_MB || 5) * 1024 * 1024 },
});

module.exports = {
  verificationUpload,
  profileUpload,
};
