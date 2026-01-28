/**
 * Multer Configuration
 * 
 * Configuration pour l'upload de fichiers (avatars)
 * Stockage : Local (./uploads/avatars/)
 * 
 * Pour migrer vers Cloudinary :
 * 1. Decommenter la section CLOUDINARY
 * 2. Commenter la section STOCKAGE LOCAL
 * 3. Installer : npm install cloudinary multer-storage-cloudinary
 * 4. Ajouter les variables d'environnement CLOUDINARY_*
 * 
 * @module config/multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// CONFIGURATION
const UPLOAD_DIR = './uploads/avatars';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024; // 2 MB par defaut
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Creer le dossier uploads/avatars s'il n'existe pas
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// STOCKAGE LOCAL (Actif)
const localStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        // Format : userId_timestamp.extension
        const userId = req.user._id.toString();
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${userId}_${timestamp}${ext}`;
        cb(null, filename);
    }
});
// STOCKAGE LOCAL (Actif)

// ============================================
// CLOUDINARY (Commente - Pour migration future)
// ============================================
/*
// 1. Installer les dependances :
// npm install cloudinary multer-storage-cloudinary

// 2. Ajouter dans .env :
// CLOUDINARY_CLOUD_NAME=votre_cloud_name
// CLOUDINARY_API_KEY=votre_api_key
// CLOUDINARY_API_SECRET=votre_api_secret

// 3. Decommenter ce code :

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Stockage Cloudinary
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'centre-commercial/avatars', // Dossier sur Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face' } // Redimensionner et centrer sur visage
    ],
    public_id: (req, file) => {
      const userId = req.user._id.toString();
      const timestamp = Date.now();
      return `avatar_${userId}_${timestamp}`;
    }
  }
});

// Pour utiliser Cloudinary, remplacer localStorage par cloudinaryStorage dans multer()
// const upload = multer({ storage: cloudinaryStorage, ... });

// Fonction pour supprimer une image de Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Erreur suppression Cloudinary:', error);
    throw error;
  }
};

// Extraire le public_id depuis l'URL Cloudinary
const getPublicIdFromUrl = (url) => {
  // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.jpg
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  const publicId = `${folder}/${filename.split('.')[0]}`;
  return publicId;
};

module.exports = { upload, cloudinary, deleteFromCloudinary, getPublicIdFromUrl };
*/

// ============================================
// FILTRE DES FICHIERS
// ============================================
/**
 * @desc Filtre pour accepter uniquement les types d'images autorises
 * @param {Object} req - Requete Express
 * @param {Object} file - Fichier uploadé
 * @param {Function} cb - Callback
 */
const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error('Type de fichier non autorise. Types acceptes : JPEG, JPG, PNG, WEBP');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// Configuration de multer avec stockage local
const upload = multer({
    storage: localStorage, // Remplacer par cloudinaryStorage pour Cloudinary
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter: fileFilter
});

/**
 * @desc Supprimer un fichier local - HELPER
 * @param {string} filePath - Chemin du fichier à supprimer
 * @returns {Promise} - Résout si supprimé, rejette en cas d'erreur
 */
const deleteLocalFile = (filePath) => {
    return new Promise((resolve, reject) => {
        // Construire le chemin complet si necessaire
        const fullPath = filePath.startsWith('./') ? filePath : `./${filePath}`;

        fs.unlink(fullPath, (err) => {
            if (err) {
                // Si le fichier n'existe pas, on considere que c'est OK
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

/**
 * @desc Generer l'URL complete d'un avatar stocke localement - HELPER
 * @param {string} filename - Nom du fichier avatar
 * @param {Object} req - Requete Express pour construire l'URL
 * @returns {string|null} - URL complete ou null si pas de filename
 */
const getAvatarUrl = (filename, req) => {
    if (!filename) return null;

    // En local : construire l'URL complete
    const protocol = req.protocol;
    const host = req.get('host');
    return `${protocol}://${host}/uploads/avatars/${filename}`;

    // Pour Cloudinary : l'URL est deja complete dans file.path
};

module.exports = {
    upload,
    deleteLocalFile,
    getAvatarUrl,
    UPLOAD_DIR,
    MAX_FILE_SIZE,
    ALLOWED_TYPES
};