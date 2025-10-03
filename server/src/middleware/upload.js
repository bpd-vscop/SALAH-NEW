const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { badRequest } = require('../utils/appError');

const verificationDir = path.resolve(__dirname, '..', '..', 'uploads', 'verification');

if (!fs.existsSync(verificationDir)) {
  fs.mkdirSync(verificationDir, { recursive: true });
}

const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, verificationDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.dat';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(badRequest('Unsupported file type', [{ allowed: allowedMimeTypes }]));
  }
  cb(null, true);
};

const maxFileSize = Number(process.env.UPLOAD_MAX_MB || 10) * 1024 * 1024;

const verificationUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxFileSize },
});

module.exports = {
  verificationUpload,
};
