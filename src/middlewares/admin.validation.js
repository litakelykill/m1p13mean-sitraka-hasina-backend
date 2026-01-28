/**
 * Admin Validation Middleware
 * 
 * Middlewares de validation pour les routes admin
 * 
 * @module middlewares/admin.validation
 */

const { body, query, param, validationResult } = require('express-validator');

// ============================================
// HANDLER : Traitement des erreurs de validation
// ============================================
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

// ============================================
// VALIDATION : Rejet de boutique
// ============================================
const validateRejet = [
    body('raison')
        .notEmpty().withMessage('La raison du rejet est requise.')
        .isLength({ min: 10 }).withMessage('La raison doit contenir au moins 10 caracteres.')
        .isLength({ max: 500 }).withMessage('La raison ne peut pas depasser 500 caracteres.')
        .trim(),

    handleValidationErrors
];

// ============================================
// VALIDATION : Pagination
// ============================================
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Le numero de page doit etre un entier positif.')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('La limite doit etre entre 1 et 100.')
        .toInt(),

    handleValidationErrors
];

// ============================================
// VALIDATION : ID de boutique
// ============================================
const validateBoutiqueId = [
    param('id')
        .notEmpty().withMessage('L\'ID de la boutique est requis.')
        .isMongoId().withMessage('L\'ID de la boutique est invalide.'),

    handleValidationErrors
];

module.exports = {
    validateRejet,
    validatePagination,
    validateBoutiqueId,
    handleValidationErrors
};