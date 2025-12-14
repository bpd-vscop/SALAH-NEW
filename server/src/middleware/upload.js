const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { badRequest } = require('../utils/appError');

const usersUploadsDir = path.resolve(__dirname, '..', '..', 'uploads', 'users');
const productDocumentsTmpDir = path.resolve(__dirname, '..', '..', 'uploads', 'products', '_tmp', 'documents');

if (!fs.existsSync(usersUploadsDir)) {
  fs.mkdirSync(usersUploadsDir, { recursive: true });
}

if (!fs.existsSync(productDocumentsTmpDir)) {
  fs.mkdirSync(productDocumentsTmpDir, { recursive: true });
}

const verificationAllowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg'];
const profileAllowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
const productImageAllowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
const marketingImageAllowedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
const productDocumentAllowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const resolveUserUploadsDirectory = (req, subdirectory) => {
  const candidate =
    (req.params && req.params.id) ||
    (req.user && (req.user.id || req.user._id)) ||
    null;
  const userId = candidate ? String(candidate) : '';
  if (!userId) {
    throw badRequest('User context missing for upload');
  }
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  const absolutePath = path.resolve(usersUploadsDir, safeId, subdirectory);
  fs.mkdirSync(absolutePath, { recursive: true });
  return absolutePath;
};

const verificationStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      cb(null, resolveUserUploadsDirectory(req, 'verification'));
    } catch (error) {
      cb(error);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.dat';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const profileStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      cb(null, resolveUserUploadsDirectory(req, 'profile'));
    } catch (error) {
      cb(error);
    }
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

const productImageFileFilter = (_req, file, cb) => {
  if (!productImageAllowedMimeTypes.includes(file.mimetype)) {
    return cb(badRequest('Invalid product image type', [{ allowed: productImageAllowedMimeTypes }]));
  }
  cb(null, true);
};

const marketingImageFileFilter = (_req, file, cb) => {
  if (!marketingImageAllowedMimeTypes.includes(file.mimetype)) {
    return cb(badRequest('Unsupported image type', [{ allowed: marketingImageAllowedMimeTypes }]));
  }
  cb(null, true);
};

const productDocumentFileFilter = (_req, file, cb) => {
  if (!productDocumentAllowedMimeTypes.includes(file.mimetype)) {
    return cb(badRequest('Unsupported document type', [{ allowed: productDocumentAllowedMimeTypes }]));
  }
  cb(null, true);
};

const verificationMaxFileSize = Number(process.env.UPLOAD_MAX_MB || 10) * 1024 * 1024;
const profileMaxFileSize = Number(process.env.PROFILE_UPLOAD_MAX_MB || 5) * 1024 * 1024;
const productImageMaxFileSize = Number(process.env.PRODUCT_IMAGE_UPLOAD_MAX_MB || 5) * 1024 * 1024;
const marketingImageMaxFileSize = Number(process.env.MARKETING_IMAGE_UPLOAD_MAX_MB || 5) * 1024 * 1024;
const productDocumentMaxFileSize = Number(process.env.PRODUCT_DOCUMENT_UPLOAD_MAX_MB || 20) * 1024 * 1024;

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

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: productImageFileFilter,
  limits: { fileSize: productImageMaxFileSize },
});

const marketingImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: marketingImageFileFilter,
  limits: { fileSize: marketingImageMaxFileSize },
});

const productDocumentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, productDocumentsTmpDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname) || '.dat';
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: productDocumentFileFilter,
  limits: { fileSize: productDocumentMaxFileSize },
});

// Combined upload that accepts both profile image and verification file
const userUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        if (file.fieldname === 'verificationFile') {
          cb(null, resolveUserUploadsDirectory(req, 'verification'));
        } else {
          cb(null, resolveUserUploadsDirectory(req, 'profile'));
        }
      } catch (error) {
        cb(error);
      }
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname) || (file.fieldname === 'verificationFile' ? '.dat' : '.jpg');
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'verificationFile') {
      if (!verificationAllowedMimeTypes.includes(file.mimetype)) {
        return cb(badRequest('Unsupported file type', [{ allowed: verificationAllowedMimeTypes }]));
      }
    } else if (file.fieldname === 'profileImage') {
      if (!profileAllowedMimeTypes.includes(file.mimetype)) {
        return cb(badRequest('Unsupported profile image type', [{ allowed: profileAllowedMimeTypes }]));
      }
    }
    cb(null, true);
  },
  limits: { fileSize: verificationMaxFileSize }, // Use the larger limit
});

module.exports = {
  verificationUpload,
  profileUpload,
  productImageUpload,
  marketingImageUpload,
  productDocumentUpload,
  userUpload,
};
