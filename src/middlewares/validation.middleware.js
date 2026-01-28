/**
 * Validation Middleware
 * 
 * Middlewares de validation des données d'entrée
 * Utilise express-validator pour valider les requêtes
 * 
 * @module middlewares/validation.middleware
 */

const { body, validationResult } = require('express-validator');

// REGEX PATTERNS - Patterns regex réutilisables pour la validation
const PATTERNS = {
    // Password : min 8 chars, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,;:!§+-])[A-Za-z\d@$!%*?&.,;:!§+-]{8,}$/,
    // Téléphone : format flexible
    PHONE: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/,
    // SIRET : 14 chiffres
    SIRET: /^[0-9]{14}$/
};

/**
 * @desc Messages d'erreur pour la validation
 */
const MESSAGES = {
    EMAIL_REQUIRED: 'L\'email est requis.',
    EMAIL_INVALID: 'Veuillez fournir un email valide.',
    PASSWORD_REQUIRED: 'Le mot de passe est requis.',
    PASSWORD_WEAK: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial (@$!%*?&.,;:!§+-).',
    PASSWORD_MIN: 'Le mot de passe doit contenir au moins 8 caractères.',
    NOM_REQUIRED: 'Le nom est requis.',
    NOM_MAX: 'Le nom ne peut pas dépasser 50 caractères.',
    PRENOM_REQUIRED: 'Le prénom est requis.',
    PRENOM_MAX: 'Le prénom ne peut pas dépasser 50 caractères.',
    ROLE_INVALID: 'Le rôle doit être CLIENT ou BOUTIQUE.',
    BOUTIQUE_NOM_REQUIRED: 'Le nom de la boutique est requis pour le rôle BOUTIQUE.',
    BOUTIQUE_NOM_MAX: 'Le nom de la boutique ne peut pas dépasser 100 caractères.',
    BOUTIQUE_DESC_MAX: 'La description de la boutique ne peut pas dépasser 1000 caractères.',
    PHONE_INVALID: 'Format de numéro de téléphone invalide.',
    SIRET_INVALID: 'Le numéro SIRET doit contenir 14 chiffres.',
    CURRENT_PASSWORD_REQUIRED: 'Le mot de passe actuel est requis.',
    NEW_PASSWORD_REQUIRED: 'Le nouveau mot de passe est requis.'
};

/**
 * @desc Middleware pour gérer les erreurs de validation - HANDLER : Traitement des erreurs de validation
 * Si des erreurs de validation sont présentes, renvoie une réponse 400 avec les détails des erreurs
 * Sinon, passe au middleware suivant
 * @param {Object} req - Objet request Express
 * @param {Object} res - Objet response Express
 * @param {Function} next - Fonction next Express
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        // Formater les erreurs pour une meilleure lisibilité
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Erreur de validation des données.',
            error: 'VALIDATION_ERROR',
            errors: formattedErrors
        });
    }

    next();
};

// VALIDATION : Inscription
const validateRegister = [
    // Email
    body('email')
        .notEmpty().withMessage(MESSAGES.EMAIL_REQUIRED)
        .isEmail().withMessage(MESSAGES.EMAIL_INVALID)
        .normalizeEmail()
        .trim(),

    // Password
    body('password')
        .notEmpty().withMessage(MESSAGES.PASSWORD_REQUIRED)
        .isLength({ min: 8 }).withMessage(MESSAGES.PASSWORD_MIN)
        .matches(PATTERNS.PASSWORD).withMessage(MESSAGES.PASSWORD_WEAK),

    // Nom
    body('nom')
        .notEmpty().withMessage(MESSAGES.NOM_REQUIRED)
        .isLength({ max: 50 }).withMessage(MESSAGES.NOM_MAX)
        .trim()
        .escape(),

    // Prénom
    body('prenom')
        .notEmpty().withMessage(MESSAGES.PRENOM_REQUIRED)
        .isLength({ max: 50 }).withMessage(MESSAGES.PRENOM_MAX)
        .trim()
        .escape(),

    // Rôle (optionnel, défaut CLIENT)
    body('role')
        .optional()
        .isIn(['CLIENT', 'BOUTIQUE']).withMessage(MESSAGES.ROLE_INVALID),

    // Téléphone (optionnel)
    body('telephone')
        .optional()
        .matches(PATTERNS.PHONE).withMessage(MESSAGES.PHONE_INVALID)
        .trim(),

    // Adresse (optionnelle)
    body('adresse.rue').optional().trim(),
    body('adresse.ville').optional().trim(),
    body('adresse.codePostal').optional().trim(),
    body('adresse.pays').optional().trim(),

    // Validation conditionnelle pour BOUTIQUE
    body('boutique.nomBoutique')
        .if(body('role').equals('BOUTIQUE'))
        .notEmpty().withMessage(MESSAGES.BOUTIQUE_NOM_REQUIRED)
        .isLength({ max: 100 }).withMessage(MESSAGES.BOUTIQUE_NOM_MAX)
        .trim(),

    body('boutique.description')
        .optional()
        .isLength({ max: 1000 }).withMessage(MESSAGES.BOUTIQUE_DESC_MAX)
        .trim(),

    body('boutique.siret')
        .optional()
        .matches(PATTERNS.SIRET).withMessage(MESSAGES.SIRET_INVALID)
        .trim(),

    body('boutique.categorie')
        .optional()
        .trim(),

    body('boutique.telephone')
        .optional()
        .matches(PATTERNS.PHONE).withMessage(MESSAGES.PHONE_INVALID)
        .trim(),

    body('boutique.email')
        .optional()
        .isEmail().withMessage(MESSAGES.EMAIL_INVALID)
        .normalizeEmail()
        .trim(),

    // Handler des erreurs
    handleValidationErrors
];

// VALIDATION : Connexion
const validateLogin = [
    // Email
    body('email')
        .notEmpty().withMessage(MESSAGES.EMAIL_REQUIRED)
        .isEmail().withMessage(MESSAGES.EMAIL_INVALID)
        .normalizeEmail()
        .trim(),

    // Password
    body('password')
        .notEmpty().withMessage(MESSAGES.PASSWORD_REQUIRED),

    // Handler des erreurs
    handleValidationErrors
];

// VALIDATION : Mise à jour du profil
const validateUpdateProfile = [
    // Tous les champs sont optionnels pour la mise à jour

    // Nom
    body('nom')
        .optional()
        .isLength({ min: 1, max: 50 }).withMessage(MESSAGES.NOM_MAX)
        .trim()
        .escape(),

    // Prénom
    body('prenom')
        .optional()
        .isLength({ min: 1, max: 50 }).withMessage(MESSAGES.PRENOM_MAX)
        .trim()
        .escape(),

    // Téléphone
    body('telephone')
        .optional()
        .matches(PATTERNS.PHONE).withMessage(MESSAGES.PHONE_INVALID)
        .trim(),

    // Adresse
    body('adresse.rue').optional().trim(),
    body('adresse.ville').optional().trim(),
    body('adresse.codePostal').optional().trim(),
    body('adresse.pays').optional().trim(),

    // Handler des erreurs
    handleValidationErrors
];

// VALIDATION : Changement de mot de passe
const validateChangePassword = [
    // Mot de passe actuel
    body('currentPassword')
        .notEmpty().withMessage(MESSAGES.CURRENT_PASSWORD_REQUIRED),

    // Nouveau mot de passe
    body('newPassword')
        .notEmpty().withMessage(MESSAGES.NEW_PASSWORD_REQUIRED)
        .isLength({ min: 8 }).withMessage(MESSAGES.PASSWORD_MIN)
        .matches(PATTERNS.PASSWORD).withMessage(MESSAGES.PASSWORD_WEAK)
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('Le nouveau mot de passe doit être différent de l\'ancien.');
            }
            return true;
        }),

    // Handler des erreurs
    handleValidationErrors
];

// VALIDATION : Mise à jour boutique (pour BOUTIQUE)
const validateUpdateBoutique = [
    body('boutique.nomBoutique')
        .optional()
        .isLength({ min: 1, max: 100 }).withMessage(MESSAGES.BOUTIQUE_NOM_MAX)
        .trim(),

    body('boutique.description')
        .optional()
        .isLength({ max: 1000 }).withMessage(MESSAGES.BOUTIQUE_DESC_MAX)
        .trim(),

    body('boutique.categorie')
        .optional()
        .trim(),

    body('boutique.siret')
        .optional()
        .matches(PATTERNS.SIRET).withMessage(MESSAGES.SIRET_INVALID)
        .trim(),

    body('boutique.telephone')
        .optional()
        .matches(PATTERNS.PHONE).withMessage(MESSAGES.PHONE_INVALID)
        .trim(),

    body('boutique.email')
        .optional()
        .isEmail().withMessage(MESSAGES.EMAIL_INVALID)
        .normalizeEmail()
        .trim(),

    body('boutique.adresse.rue').optional().trim(),
    body('boutique.adresse.ville').optional().trim(),
    body('boutique.adresse.codePostal').optional().trim(),
    body('boutique.adresse.pays').optional().trim(),

    // Handler des erreurs
    handleValidationErrors
];

// VALIDATION : Reset password request
const validateForgotPassword = [
    body('email')
        .notEmpty().withMessage(MESSAGES.EMAIL_REQUIRED)
        .isEmail().withMessage(MESSAGES.EMAIL_INVALID)
        .normalizeEmail()
        .trim(),

    handleValidationErrors
];

// VALIDATION : Reset password avec token
const validateResetPassword = [
    body('password')
        .notEmpty().withMessage(MESSAGES.PASSWORD_REQUIRED)
        .isLength({ min: 8 }).withMessage(MESSAGES.PASSWORD_MIN)
        .matches(PATTERNS.PASSWORD).withMessage(MESSAGES.PASSWORD_WEAK),

    handleValidationErrors
];

module.exports = {
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