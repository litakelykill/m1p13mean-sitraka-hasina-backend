/**
 * Auth Routes
 * 
 * Routes pour l'authentification des utilisateurs
 * 
 * Routes publiques :
 * - POST /api/auth/register - Inscription
 * - POST /api/auth/login - Connexion
 * 
 * Routes protégées :
 * - GET /api/auth/me - Profil utilisateur connecté
 * - PUT /api/auth/profile - Mise à jour profil
 * - PUT /api/auth/password - Changement mot de passe
 * - PUT /api/auth/boutique - Mise à jour boutique (BOUTIQUE only)
 * - POST /api/auth/logout - Déconnexion
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
    logout,
    updateBoutique
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

// ============================================
// ROUTES PUBLIQUES
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur (CLIENT ou BOUTIQUE)
 * @access  Public
 * 
 * @body    {
 *            email: string (required),
 *            password: string (required, min 8 chars avec règles),
 *            nom: string (required),
 *            prenom: string (required),
 *            telephone: string (optional),
 *            adresse: object (optional),
 *            role: "CLIENT" | "BOUTIQUE" (optional, default: CLIENT),
 *            boutique: object (required if role=BOUTIQUE)
 *          }
 * 
 * @returns {
 *            success: boolean,
 *            message: string,
 *            token: string,
 *            data: { user: object }
 *          }
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'un utilisateur
 * @access  Public
 * 
 * @body    {
 *            email: string (required),
 *            password: string (required)
 *          }
 * 
 * @returns {
 *            success: boolean,
 *            message: string,
 *            token: string,
 *            data: { user: object }
 *          }
 */
router.post('/login', validateLogin, login);

// ============================================
// ROUTES PROTÉGÉES (nécessitent authentification)
// ============================================

/**
 * @route   GET /api/auth/me
 * @desc    Récupérer le profil de l'utilisateur connecté
 * @access  Private (tous les rôles)
 * 
 * @header  Authorization: Bearer <token>
 * 
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: { user: object }
 *          }
 */
router.get('/me', auth, getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Mettre à jour le profil de l'utilisateur connecté
 * @access  Private (tous les rôles)
 * 
 * @header  Authorization: Bearer <token>
 * 
 * @body    {
 *            nom: string (optional),
 *            prenom: string (optional),
 *            telephone: string (optional),
 *            adresse: object (optional)
 *          }
 * 
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: { user: object }
 *          }
 */
router.put('/profile', auth, validateUpdateProfile, updateProfile);

/**
 * @route   PUT /api/auth/password
 * @desc    Changer le mot de passe de l'utilisateur connecté
 * @access  Private (tous les rôles)
 * 
 * @header  Authorization: Bearer <token>
 * 
 * @body    {
 *            currentPassword: string (required),
 *            newPassword: string (required, mêmes règles que register)
 *          }
 * 
 * @returns {
 *            success: boolean,
 *            message: string,
 *            token: string (nouveau token),
 *            data: { user: object }
 *          }
 */
router.put('/password', auth, validateChangePassword, changePassword);

/**
 * @route   PUT /api/auth/boutique
 * @desc    Mettre à jour les informations de la boutique
 * @access  Private (BOUTIQUE only)
 * 
 * @header  Authorization: Bearer <token>
 * 
 * @body    {
 *            boutique: {
 *              nomBoutique: string (optional),
 *              description: string (optional),
 *              categorie: string (optional),
 *              siret: string (optional),
 *              telephone: string (optional),
 *              email: string (optional),
 *              horaires: string (optional),
 *              adresse: object (optional)
 *            }
 *          }
 * 
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: { user: object }
 *          }
 */
router.put('/boutique', auth, checkRole('BOUTIQUE'), validateUpdateBoutique, updateBoutique);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion de l'utilisateur
 * @access  Private (tous les rôles)
 * 
 * @header  Authorization: Bearer <token>
 * 
 * @returns {
 *            success: boolean,
 *            message: string,
 *            data: null
 *          }
 * 
 * @note    Le client doit supprimer le token localement
 */
router.post('/logout', auth, logout);

module.exports = router;