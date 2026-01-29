/**
 * Produit Validation Middleware
 * 
 * Middlewares de validation pour les routes produits
 * 
 * @module middlewares/produit.validation
 */

const { body, param, validationResult } = require('express-validator');

/**
 * @desc    Gerer les erreurs de validation - HANDLER
 * @param   {Object} req
 * @param   {Object} res
 * @param   {Function} next
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

// VALIDATION : Creer un produit
const validateCreateProduit = [
    body('nom')
        .notEmpty().withMessage('Le nom du produit est requis.')
        .isLength({ min: 2, max: 200 }).withMessage('Le nom doit contenir entre 2 et 200 caracteres.')
        .trim(),

    body('description')
        .optional()
        .isLength({ max: 2000 }).withMessage('La description ne peut pas depasser 2000 caracteres.')
        .trim(),

    body('prix')
        .notEmpty().withMessage('Le prix est requis.')
        .isFloat({ min: 0 }).withMessage('Le prix doit etre un nombre positif.'),

    body('stock')
        .optional()
        .isInt({ min: 0 }).withMessage('Le stock doit etre un nombre entier positif.'),

    body('seuilAlerte')
        .optional()
        .isInt({ min: 0 }).withMessage('Le seuil d\'alerte doit etre un nombre entier positif.'),

    body('categorie')
        .optional()
        .isMongoId().withMessage('ID de categorie invalide.'),

    handleValidationErrors
];

// VALIDATION : Modifier un produit
const validateUpdateProduit = [
    body('nom')
        .optional()
        .isLength({ min: 2, max: 200 }).withMessage('Le nom doit contenir entre 2 et 200 caracteres.')
        .trim(),

    body('description')
        .optional()
        .isLength({ max: 2000 }).withMessage('La description ne peut pas depasser 2000 caracteres.')
        .trim(),

    body('prix')
        .optional()
        .isFloat({ min: 0 }).withMessage('Le prix doit etre un nombre positif.'),

    body('categorie')
        .optional({ nullable: true })
        .custom((value) => {
            if (value === null || value === '') return true;
            return /^[0-9a-fA-F]{24}$/.test(value);
        }).withMessage('ID de categorie invalide.'),

    handleValidationErrors
];

// VALIDATION : Stock
const validateStock = [
    body('stock')
        .optional()
        .isInt({ min: 0 }).withMessage('Le stock doit etre un nombre entier positif.'),

    body('seuilAlerte')
        .optional()
        .isInt({ min: 0 }).withMessage('Le seuil d\'alerte doit etre un nombre entier positif.'),

    handleValidationErrors
];

// VALIDATION : Promotion
const validatePromo = [
    body('prixPromo')
        .optional({ nullable: true })
        .isFloat({ min: 0 }).withMessage('Le prix promo doit etre un nombre positif.'),

    body('enPromo')
        .optional()
        .isBoolean().withMessage('enPromo doit etre un booleen.'),

    handleValidationErrors
];

// VALIDATION : ID Produit
const validateProduitId = [
    param('id')
        .notEmpty().withMessage('L\'ID du produit est requis.')
        .isMongoId().withMessage('ID de produit invalide.'),

    handleValidationErrors
];

module.exports = {
    validateCreateProduit,
    validateUpdateProduit,
    validateStock,
    validatePromo,
    validateProduitId,
    handleValidationErrors
};