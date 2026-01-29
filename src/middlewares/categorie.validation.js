/**
 * Categorie Validation Middleware
 * 
 * Middlewares de validation pour les routes categories
 * 
 * @module middlewares/categorie.validation
 */

const { body, param, validationResult } = require('express-validator');

/**
 * @desc Middleware pour traiter les erreurs de validation - HANDLER
 * @param {Object} req - Requete Express
 * @param {Object} res - Reponse Express
 * @param {Function} next - Fonction next d'Express
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            message: 'Erreur de validation des donnees.',
            error: 'VALIDATION_ERROR',
            errors: formattedErrors
        });
    }

    next();
};

// VALIDATION : Creer une categorie
const validateCreateCategorie = [
    body('nom')
        .notEmpty().withMessage('Le nom de la categorie est requis.')
        .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caracteres.')
        .trim(),

    body('description')
        .optional()
        .isLength({ max: 500 }).withMessage('La description ne peut pas depasser 500 caracteres.')
        .trim(),

    body('ordre')
        .optional()
        .isInt({ min: 0 }).withMessage('L\'ordre doit etre un nombre positif.'),

    handleValidationErrors
];

// VALIDATION : Modifier une categorie
const validateUpdateCategorie = [
    body('nom')
        .optional()
        .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caracteres.')
        .trim(),

    body('description')
        .optional()
        .isLength({ max: 500 }).withMessage('La description ne peut pas depasser 500 caracteres.')
        .trim(),

    body('ordre')
        .optional()
        .isInt({ min: 0 }).withMessage('L\'ordre doit etre un nombre positif.'),

    handleValidationErrors
];

// Validation pour les parametres d'ID de categorie
const validateCategorieId = [
    param('id')
        .notEmpty().withMessage('L\'ID de la categorie est requis.')
        .isMongoId().withMessage('ID de categorie invalide.'),

    handleValidationErrors
];

// VALIDATION : Ordre
const validateOrdre = [
    body('ordre')
        .notEmpty().withMessage('L\'ordre est requis.')
        .isInt({ min: 0 }).withMessage('L\'ordre doit etre un nombre positif.'),

    handleValidationErrors
];

module.exports = {
    validateCreateCategorie,
    validateUpdateCategorie,
    validateCategorieId,
    validateOrdre,
    handleValidationErrors
};