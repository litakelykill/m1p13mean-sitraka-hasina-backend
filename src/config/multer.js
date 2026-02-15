/**
 * Multer Configuration
 * 
 * Configuration pour l'upload de fichiers :
 * - Avatars utilisateurs (./uploads/avatars/)
 * - Logos boutiques (./uploads/boutiques/logos/)
 * - Bannieres boutiques (./uploads/boutiques/bannieres/)
 * 
 * Note: Sur Vercel (serverless), le systeme de fichiers est en lecture seule.
 * Les uploads locaux ne fonctionneront pas sur Vercel.
 * 
 * @module config/multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Verifier si on est sur Vercel (serverless) ou AWS Lambda
// Vercel definit plusieurs variables qu'on peut verifier
const isServerless = !!(
  process.env.VERCEL ||
  process.env.VERCEL_ENV ||
  process.env.VERCEL_URL ||
  process.env.VERCEL_REGION ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION // ancienne variable Vercel
);

// Alternative: verifier si on est en production ET pas en local
const isProduction = process.env.NODE_ENV === 'production';

// Fonction pour verifier si on peut ecrire sur le systeme de fichiers
const canWriteToFileSystem = () => {
  if (isServerless) return false;

  try {
    // Essayer de creer un dossier temporaire
    const testDir = './uploads/.test';
    if (!fs.existsSync('./uploads')) {
      fs.mkdirSync('./uploads', { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.rmdirSync(testDir);
    return true;
  } catch (error) {
    console.log('Systeme de fichiers en lecture seule, utilisation de memoryStorage');
    return false;
  }
};

// Determiner si on peut utiliser le stockage disque
const useDiskStorage = canWriteToFileSystem();

// Creer les dossiers SEULEMENT si on peut ecrire
if (useDiskStorage) {
  Object.values(UPLOAD_DIRS).forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.error(`Erreur creation dossier ${dir}:`, error.message);
    }
  });
}

// ============================================
// STOCKAGE MEMOIRE (pour Vercel/Serverless)
// ============================================
const memoryStorage = multer.memoryStorage();

// ============================================
// STOCKAGE AVATAR
// ============================================
const avatarStorage = multer.diskStorage({
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

// ============================================
// STOCKAGE LOGO BOUTIQUE
// ============================================
const logoStorage = multer.diskStorage({
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

// ============================================
// STOCKAGE BANNIERE BOUTIQUE
// ============================================
const banniereStorage = multer.diskStorage({
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

// CONFIGURATIONS MULTER
// Utilise memoryStorage si on ne peut pas ecrire sur le disque
const uploadAvatar = multer({
  storage: useDiskStorage ? avatarStorage : memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

const uploadLogo = multer({
  storage: useDiskStorage ? logoStorage : memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

const uploadBanniere = multer({
  storage: useDiskStorage ? banniereStorage : memoryStorage,
  limits: { fileSize: MAX_BANNER_SIZE },
  fileFilter: imageFilter
});

// ============================================
// STOCKAGE PRODUITS
// ============================================
const produitStorage = multer.diskStorage({
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

const uploadProduit = multer({
  storage: useDiskStorage ? produitStorage : memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFilter
});

/**
 * @desc Supprime un fichier local
 * @param {string} filePath - Chemin du fichier a supprimer
 * @returns {Promise<boolean>} - Resout a true si supprime ou inexistant, rejette en cas d'erreur
 */
const deleteLocalFile = (filePath) => {
  return new Promise((resolve, reject) => {
    // Sur Vercel/serverless, ne pas essayer de supprimer
    if (!useDiskStorage) {
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

// ============================================
// HELPER : Verifier si uploads sont disponibles
// ============================================
const isUploadAvailable = () => {
  return useDiskStorage;
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
  isUploadAvailable,

  // Constants
  UPLOAD_DIRS,
  MAX_FILE_SIZE,
  MAX_BANNER_SIZE,
  ALLOWED_TYPES,
  isServerless,
  useDiskStorage
};