/**
 * Multer Configuration
 * 
 * Configuration pour l'upload de fichiers :
 * - Avatars utilisateurs (./uploads/avatars/)
 * - Logos boutiques (./uploads/boutiques/logos/)
 * - Bannieres boutiques (./uploads/boutiques/bannieres/)
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

// Creer les dossiers s'ils n'existent pas
Object.values(UPLOAD_DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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
    default:
      return null;
  }
};

// ============================================
// CLOUDINARY (Commente - Pour migration future)
// ============================================
/*
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const cloudinaryAvatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'centre-commercial/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
    public_id: (req, file) => `avatar_${req.user._id}_${Date.now()}`
  }
});

const cloudinaryLogoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'centre-commercial/boutiques/logos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }],
    public_id: (req, file) => `logo_${req.user._id}_${Date.now()}`
  }
});

const cloudinaryBanniereStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'centre-commercial/boutiques/bannieres',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 400, crop: 'fill' }],
    public_id: (req, file) => `banniere_${req.user._id}_${Date.now()}`
  }
});

const deleteFromCloudinary = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Erreur suppression Cloudinary:', error);
    throw error;
  }
};
*/

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
  ALLOWED_TYPES
};