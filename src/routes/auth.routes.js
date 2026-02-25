/**
 * Auth Routes
 * 
 * Routes pour l'authentification des utilisateurs
 * 
 * Routes publiques :
 * - POST /api/auth/register - Inscription
 * - POST /api/auth/login - Connexion
 * 
 * Routes protegees :
 * - GET /api/auth/me - Profil utilisateur connecte
 * - PUT /api/auth/profile - Mise a jour profil
 * - PUT /api/auth/password - Changement mot de passe
 * - PUT /api/auth/avatar - Upload photo de profil (LOCAL)
 * - DELETE /api/auth/avatar - Supprimer photo de profil (LOCAL)
 * - PUT /api/auth/boutique - Mise a jour boutique (BOUTIQUE only)
 * - POST /api/auth/logout - Deconnexion
 * 
 * CLOUDINARY :
 * - PUT /api/auth/avatar/cloud - Upload photo de profil (CLOUDINARY)
 * - DELETE /api/auth/avatar/cloud - Supprimer photo de profil (CLOUDINARY)
 * 
 * @module routes/auth.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    uploadAvatar,
    deleteAvatar,
    logout,
    updateBoutique,
    // CLOUDINARY
    uploadAvatarCloudinary,
    deleteAvatarCloudinary
} = require('../controllers/auth.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateRegister,
    validateLogin,
    validateUpdateProfile,
    validateChangePassword,
    validateUpdateBoutique
} = require('../middlewares/validation.middleware');

// Multer pour upload fichiers (LOCAL)
const { upload } = require('../config/multer');

// ============================================
// CLOUDINARY - Multer config
// ============================================
const { uploadAvatar: multerAvatarCloudinary } = require('../config/multer-cloudinary');

// ============================================
// ROUTES PUBLIQUES
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur (CLIENT ou BOUTIQUE)
 * @access  Public
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'un utilisateur
 * @access  Public
 */
router.post('/login', validateLogin, login);

// ============================================
// ROUTES PROTEGEES (necessitent authentification)
// ============================================

/**
 * @route   GET /api/auth/me
 * @desc    Recuperer le profil de l'utilisateur connecte
 * @access  Private (tous les roles)
 */
router.get('/me', auth, getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Mettre a jour le profil de l'utilisateur connecte
 * @access  Private (tous les roles)
 */
router.put('/profile', auth, validateUpdateProfile, updateProfile);

/**
 * @route   PUT /api/auth/password
 * @desc    Changer le mot de passe de l'utilisateur connecte
 * @access  Private (tous les roles)
 */
router.put('/password', auth, validateChangePassword, changePassword);

/**
 * @route   PUT /api/auth/avatar
 * @desc    Upload ou remplacer la photo de profil (LOCAL)
 * @access  Private (tous les roles)
 * 
 * @header  Authorization: Bearer <token>
 * @header  Content-Type: multipart/form-data
 * 
 * @body    FormData avec champ "avatar" (fichier image)
 *          Types acceptes : jpeg, jpg, png, webp
 *          Taille max : 2 MB
 */
router.put('/avatar', auth, upload.single('avatar'), uploadAvatar);

/**
 * @route   DELETE /api/auth/avatar
 * @desc    Supprimer la photo de profil (LOCAL)
 * @access  Private (tous les roles)
 */
router.delete('/avatar', auth, deleteAvatar);

// ============================================
// CLOUDINARY - ROUTES AVATAR
// ============================================

/**
 * @route   PUT /api/auth/avatar/cloud
 * @desc    Upload ou remplacer la photo de profil (CLOUDINARY)
 * @access  Private (tous les roles)
 * 
 * @header  Authorization: Bearer <token>
 * @header  Content-Type: multipart/form-data
 * 
 * @body    FormData avec champ "avatar" (fichier image)
 *          Types acceptes : jpeg, jpg, png, webp
 *          Taille max : 2 MB
 */
router.put('/avatar/cloud', auth, multerAvatarCloudinary.single('avatar'), uploadAvatarCloudinary);

/**
 * @route   DELETE /api/auth/avatar/cloud
 * @desc    Supprimer la photo de profil (CLOUDINARY)
 * @access  Private (tous les roles)
 */
router.delete('/avatar/cloud', auth, deleteAvatarCloudinary);

// ============================================
// ROUTES BOUTIQUE
// ============================================

/**
 * @route   PUT /api/auth/boutique
 * @desc    Mettre a jour les informations de la boutique
 * @access  Private (BOUTIQUE only)
 */
router.put('/boutique', auth, checkRole('BOUTIQUE'), validateUpdateBoutique, updateBoutique);

/**
 * @route   POST /api/auth/logout
 * @desc    Deconnexion de l'utilisateur
 * @access  Private (tous les roles)
 */
router.post('/logout', auth, logout);

module.exports = router;