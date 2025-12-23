const multer = require('multer');

const { badRequest } = require('../utils/appError');

const allowedMimeTypes = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const maxFileSizeBytes = Number(process.env.SUPPORT_ATTACHMENT_MAX_MB || 10) * 1024 * 1024;
const maxFiles = Number(process.env.SUPPORT_ATTACHMENT_MAX_FILES || 5);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeBytes, files: maxFiles },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(badRequest('Unsupported attachment type', [{ allowed: allowedMimeTypes }]));
    }
    cb(null, true);
  },
});

module.exports = {
  supportAttachmentsUpload: upload.array('attachments', maxFiles),
};

