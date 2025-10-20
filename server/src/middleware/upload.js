const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { badRequest } = require('../utils/appError');

const verificationDir = path.resolve(__dirname, '..', '..', 'uploads', 'verification');
const profileDir = path.resolve(__dirname, '..', '..', 'uploads', 'profile');

if (!fs.existsSync(verificationDir)) {
  fs.mkdirSync(verificationDir, { recursive: true });
}

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

const verificationAllowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
const profileAllowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

const verificationStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, verificationDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.dat';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, profileDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const verificationFileFilter = (_req, file, cb) => {
  if (!verificationAllowedMimeTypes.includes(file.mimetype)) {
    return cb(badRequest('Unsupported file type', [{ allowed: verificationAllowedMimeTypes }]));
  }
  cb(null, true);
};

const profileFileFilter = (_req, file, cb) => {
  if (!profileAllowedMimeTypes.includes(file.mimetype)) {
    return cb(badRequest('Unsupported profile image type', [{ allowed: profileAllowedMimeTypes }]));
  }
  cb(null, true);
};

const verificationMaxFileSize = Number(process.env.UPLOAD_MAX_MB || 10) * 1024 * 1024;
const profileMaxFileSize = Number(process.env.PROFILE_UPLOAD_MAX_MB || 5) * 1024 * 1024;

const verificationUpload = multer({
  storage: verificationStorage,
  fileFilter: verificationFileFilter,
  limits: { fileSize: verificationMaxFileSize },
});

const profileUpload = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter,
  limits: { fileSize: profileMaxFileSize },
});

module.exports = {
  verificationUpload,
  profileUpload,
};
