/**
 * Multer Configuration avec Cloudinary
 * 
 * Configuration SEPAREE pour l'upload de fichiers sur Cloudinary
 * A utiliser en parallele de config/multer.js (local)
 * 
 * Fichier : config/multer-cloudinary.js
 * 
 * @module config/multer-cloudinary
 */

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ============================================
// CONFIGURATION CLOUDINARY
// ============================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// CONSTANTS
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 2 * 1024 * 1024; // 2 MB
const MAX_BANNER_SIZE = 5 * 1024 * 1024; // 5 MB pour les bannieres
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

// ============================================
// FILTRE DES FICHIERS
// ============================================
const imageFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error('Type de fichier non autorise. Types acceptes : JPEG, JPG, PNG, WEBP');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// ============================================
// STOCKAGE CLOUDINARY - AVATAR
// ============================================
const cloudinaryAvatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'centre-commercial/avatars',
        allowed_formats: ALLOWED_FORMATS,
        transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' }
        ],
        public_id: (req, file) => `avatar_${req.user._id}_${Date.now()}`
    }
});

// ============================================
// STOCKAGE CLOUDINARY - LOGO BOUTIQUE
// ============================================
const cloudinaryLogoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'centre-commercial/boutiques/logos',
        allowed_formats: ALLOWED_FORMATS,
        transformation: [
            { width: 400, height: 400, crop: 'fill' }
        ],
        public_id: (req, file) => `logo_${req.user._id}_${Date.now()}`
    }
});

// ============================================
// STOCKAGE CLOUDINARY - BANNIERE BOUTIQUE
// ============================================
const cloudinaryBanniereStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'centre-commercial/boutiques/bannieres',
        allowed_formats: ALLOWED_FORMATS,
        transformation: [
            { width: 1200, height: 400, crop: 'fill' }
        ],
        public_id: (req, file) => `banniere_${req.user._id}_${Date.now()}`
    }
});

// ============================================
// STOCKAGE CLOUDINARY - PRODUITS
// ============================================
const cloudinaryProduitStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'centre-commercial/produits',
        allowed_formats: ALLOWED_FORMATS,
        transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto' }
        ],
        public_id: (req, file) => `produit_${req.user._id}_${Date.now()}`
    }
});

// ============================================
// CONFIGURATIONS MULTER
// ============================================
const uploadAvatar = multer({
    storage: cloudinaryAvatarStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: imageFilter
});

const uploadLogo = multer({
    storage: cloudinaryLogoStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: imageFilter
});

const uploadBanniere = multer({
    storage: cloudinaryBanniereStorage,
    limits: { fileSize: MAX_BANNER_SIZE },
    fileFilter: imageFilter
});

const uploadProduit = multer({
    storage: cloudinaryProduitStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: imageFilter
});

// ============================================
// HELPER : Supprimer une image de Cloudinary
// ============================================
/**
 * @desc Supprime une image de Cloudinary
 * @param {string} publicId - Public ID de l'image sur Cloudinary
 * @returns {Promise<object>} - Resultat de la suppression
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return { result: 'no public_id provided' };
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Erreur suppression Cloudinary:', error);
        throw error;
    }
};

// ============================================
// HELPER : Extraire le Public ID depuis l'URL
// ============================================
/**
 * @desc Extrait le public_id d'une URL Cloudinary
 * @param {string} url - URL complete de l'image Cloudinary
 * @returns {string|null} - Public ID ou null
 * 
 * @example
 * // URL: https://res.cloudinary.com/xxx/image/upload/v123/centre-commercial/avatars/avatar_123_456.jpg
 * // Retourne: centre-commercial/avatars/avatar_123_456
 */
const extractPublicId = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;

    try {
        // Pattern: .../upload/v{version}/{public_id}.{ext}
        const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i;
        const match = url.match(regex);
        return match ? match[1] : null;
    } catch (error) {
        console.error('Erreur extraction public_id:', error);
        return null;
    }
};

// ============================================
// HELPER : Construire URL Cloudinary optimisee
// ============================================
/**
 * @desc Construit une URL Cloudinary avec transformations
 * @param {string} publicId - Public ID de l'image
 * @param {object} options - Options de transformation
 * @returns {string} - URL optimisee
 */
const buildCloudinaryUrl = (publicId, options = {}) => {
    if (!publicId) return null;

    const defaultOptions = {
        secure: true,
        fetch_format: 'auto',
        quality: 'auto'
    };

    return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
    // Instance Cloudinary (pour usage direct si necessaire)
    cloudinary,

    // Configurations upload Multer
    uploadAvatar,
    uploadLogo,
    uploadBanniere,
    uploadProduit,

    // Helpers
    deleteFromCloudinary,
    extractPublicId,
    buildCloudinaryUrl,

    // Constants
    MAX_FILE_SIZE,
    MAX_BANNER_SIZE,
    ALLOWED_FORMATS
};