const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { badRequest } = require('../utils/appError');

const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
const verificationDir = path.join(uploadsRoot, 'verification');
const profileDir = path.join(uploadsRoot, 'profile');

if (!fs.existsSync(verificationDir)) {
  fs.mkdirSync(verificationDir, { recursive: true });
}
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

const buildStorage = (directory) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, directory);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname) || '.dat';
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

const maxFileSize = Number(process.env.UPLOAD_MAX_MB || 10) * 1024 * 1024;

const verificationUpload = multer({
  storage: buildStorage(verificationDir),
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(badRequest('Unsupported file type', [{ allowed: allowedMimeTypes }]));
    }
    cb(null, true);
  },
  limits: { fileSize: maxFileSize },
});

const profileUpload = multer({
  storage: buildStorage(profileDir),
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(badRequest('Unsupported file type', [{ allowed: allowedMimeTypes }]));
    }
    cb(null, true);
  },
  limits: { fileSize: Number(process.env.PROFILE_UPLOAD_MAX_MB || 5) * 1024 * 1024 },
});

module.exports = {
  verificationUpload,
  profileUpload,
};
