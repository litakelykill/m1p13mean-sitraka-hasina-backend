/**
 * Multer Configuration
 * 
 * Configuration pour l'upload de fichiers :
 * - Avatars utilisateurs (./uploads/avatars/)
 * - Logos boutiques (./uploads/boutiques/logos/)
 * - Bannieres boutiques (./uploads/boutiques/bannieres/)
 * 
 * NOTE: En production (Vercel), utiliser les routes /cloud avec Cloudinary
 * 
 * @module config/multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ============================================
// DÉTECTION ENVIRONNEMENT
// ============================================
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// CONFIGURATION
// Dossiers d'upload
const UPLOAD_DIRS = {
  avatars: './uploads/avatars',
  logos: './uploads/boutiques/logos',
  bannieres: './uploads/boutiques/bannieres',
  produits: './uploads/produits'
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024; // 2 MB
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5 MB pour les bannieres
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ============================================
// CRÉER LES DOSSIERS (SEULEMENT EN LOCAL)
// ============================================
if (!isProduction) {
  Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

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
// CONFIGURATION STOCKAGE SELON ENVIRONNEMENT
// ============================================
let avatarStorage, logoStorage, banniereStorage, produitStorage;

if (isProduction) {
  // PRODUCTION: Memory storage (routes locales désactivées, utiliser /cloud)
  avatarStorage = multer.memoryStorage();
  logoStorage = multer.memoryStorage();
  banniereStorage = multer.memoryStorage();
  produitStorage = multer.memoryStorage();
} else {
  // DÉVELOPPEMENT: Disk storage
  avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOAD_DIRS.avatars);
    },
    filename: function (req, file, cb) {
      const userId = req.user._id.toString();
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${userId}_${timestamp}${ext}`);
    }
  });

  logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOAD_DIRS.logos);
    },
    filename: function (req, file, cb) {
      const odId = req.user._id.toString();
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `logo_${odId}_${timestamp}${ext}`);
    }
  });

  banniereStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOAD_DIRS.bannieres);
    },
    filename: function (req, file, cb) {
      const odId = req.user._id.toString();
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `banniere_${odId}_${timestamp}${ext}`);
    }
  });

  produitStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOAD_DIRS.produits);
    },
    filename: function (req, file, cb) {
      const odId = req.user._id.toString();
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `produit_${odId}_${timestamp}${ext}`);
    }
  });
}

// ============================================
// CONFIGURATIONS MULTER
// ============================================
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

const uploadBanniere = multer({
  storage: banniereStorage,
  limits: { fileSize: MAX_BANNER_SIZE },
  fileFilter: imageFilter
});

const uploadProduit = multer({
  storage: produitStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

/**
 * @desc Supprime un fichier local
 * @param {string} filePath - Chemin du fichier à supprimer
 * @returns {Promise<boolean>} - Résout à true si supprimé ou inexistant, rejette en cas d'erreur
 */
const deleteLocalFile = (filePath) => {
  return new Promise((resolve, reject) => {
    // En production, ne pas essayer de supprimer (pas de fichiers locaux)
    if (isProduction) {
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

// ============================================
// HELPER : Construire URL complete
// ============================================
const buildFileUrl = (filename, type, req) => {
  if (!filename) return null;

  // Si c'est déjà une URL Cloudinary, la retourner telle quelle
  if (filename.includes('cloudinary.com')) {
    return filename;
  }

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

module.exports = {
  // Configurations upload
  upload: uploadAvatar, // Alias pour compatibilite
  uploadAvatar,
  uploadLogo,
  uploadBanniere,
  uploadProduit,

  // Helpers
  deleteLocalFile,
  buildFileUrl,

  // Constants
  UPLOAD_DIRS,
  MAX_FILE_SIZE,
  MAX_BANNER_SIZE,
  ALLOWED_TYPES,

  // Flag environnement
  isProduction
};