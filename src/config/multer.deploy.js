/**
 * Multer Configuration
 * 
 * Configuration pour l'upload de fichiers.
 * Compatible avec Vercel (serverless) et local.
 * 
 * @module config/multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// CONFIGURATION
const UPLOAD_DIRS = {
  avatars: './uploads/avatars',
  logos: './uploads/boutiques/logos',
  bannieres: './uploads/boutiques/bannieres',
  produits: './uploads/produits'
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024;
const MAX_BANNER_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ============================================
// DETECTION ENVIRONNEMENT
// ============================================
// Ne JAMAIS creer de dossiers au demarrage du module
// La creation se fait uniquement lors de l'upload en local

const isServerless = () => {
  return !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.VERCEL_URL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );
};

// ============================================
// STOCKAGE MEMOIRE (pour Serverless)
// ============================================
const memoryStorage = multer.memoryStorage();

// ============================================
// STOCKAGE DISQUE (pour Local)
// Cree les dossiers a la demande, pas au demarrage
// ============================================
const createDiskStorage = (uploadDir) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      // Creer le dossier seulement au moment de l'upload
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      } catch (error) {
        cb(error, null);
      }
    },
    filename: function (req, file, cb) {
      const userId = req.user._id.toString();
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${userId}_${timestamp}${ext}`);
    }
  });
};

// ============================================
// FILTRE DES FICHIERS
// ============================================
const imageFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Type de fichier non autorise. Types acceptes : JPEG, JPG, PNG, WEBP');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// ============================================
// FONCTION POUR CHOISIR LE STORAGE
// ============================================
const getStorage = (type) => {
  if (isServerless()) {
    return memoryStorage;
  }
  return createDiskStorage(UPLOAD_DIRS[type]);
};

// ============================================
// CONFIGURATIONS MULTER
// ============================================
const uploadAvatar = multer({
  storage: getStorage('avatars'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

const uploadLogo = multer({
  storage: getStorage('logos'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

const uploadBanniere = multer({
  storage: getStorage('bannieres'),
  limits: { fileSize: MAX_BANNER_SIZE },
  fileFilter: imageFilter
});

const uploadProduit = multer({
  storage: getStorage('produits'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

// ============================================
// HELPERS
// ============================================
const deleteLocalFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (isServerless()) {
      return resolve(true);
    }

    const fullPath = filePath.startsWith('./') ? filePath : `./${filePath}`;

    fs.unlink(fullPath, (err) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(true);
        } else {
          reject(err);
        }
      } else {
        resolve(true);
      }
    });
  });
};

const buildFileUrl = (filename, type, req) => {
  if (!filename) return null;

  const baseUrl = `${req.protocol}://${req.get('host')}`;

  switch (type) {
    case 'avatar':
      return `${baseUrl}/uploads/avatars/${filename}`;
    case 'logo':
      return `${baseUrl}/uploads/boutiques/logos/${filename}`;
    case 'banniere':
      return `${baseUrl}/uploads/boutiques/bannieres/${filename}`;
    case 'produit':
      return `${baseUrl}/uploads/produits/${filename}`;
    default:
      return null;
  }
};

const isUploadAvailable = () => {
  return !isServerless();
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  upload: uploadAvatar,
  uploadAvatar,
  uploadLogo,
  uploadBanniere,
  uploadProduit,
  deleteLocalFile,
  buildFileUrl,
  isUploadAvailable,
  UPLOAD_DIRS,
  MAX_FILE_SIZE,
  MAX_BANNER_SIZE,
  ALLOWED_TYPES
};
