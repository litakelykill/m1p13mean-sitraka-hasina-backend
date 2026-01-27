/**
 * Middlewares Index
 * 
 * Export centralisé de tous les middlewares
 * Permet une importation simplifiée
 * 
 * @example
 * const { auth, checkRole, validateRegister } = require('./middlewares');
 * 
 * @module middlewares/index
 */

// Middleware d'authentification
const { auth, optionalAuth, AUTH_ERRORS } = require('./auth.middleware');

// Middleware de rôles
const {
    checkRole,
    checkBoutiqueValidated,
    checkRoleAndBoutiqueValidation,
    checkOwnershipOrAdmin,
    ROLE_ERRORS
} = require('./role.middleware');

// Middlewares de validation
const {
    validateRegister,
    validateLogin,
    validateUpdateProfile,
    validateChangePassword,
    validateUpdateBoutique,
    validateForgotPassword,
    validateResetPassword,
    handleValidationErrors,
    PATTERNS,
    MESSAGES
} = require('./validation.middleware');

module.exports = {
    // Auth
    auth,
    optionalAuth,
    AUTH_ERRORS,

    // Roles
    checkRole,
    checkBoutiqueValidated,
    checkRoleAndBoutiqueValidation,
    checkOwnershipOrAdmin,
    ROLE_ERRORS,

    // Validation
    validateRegister,
    validateLogin,
    validateUpdateProfile,
    validateChangePassword,
    validateUpdateBoutique,
    validateForgotPassword,
    validateResetPassword,
    handleValidationErrors,
    PATTERNS,
    MESSAGES
};