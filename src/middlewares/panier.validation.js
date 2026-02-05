/**
 * Panier Validation Middleware
 * 
 * Validations pour les routes du panier
 * 
 * @module middlewares/panier.validation
 */

const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

/**
 * @desc Middleware pour verifier les erreurs de validation - HELPER
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Erreur de validation.',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

/**
 * @desc Validation pour ajouter un produit au panier
 */
const validateAddItem = [
    body('produitId')
        .notEmpty()
        .withMessage('L\'ID du produit est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de produit invalide.');
            }
            return true;
        }),
    body('quantite')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La quantite doit etre un entier positif.')
        .toInt(),
    validate
];

/**
 * @desc Validation pour modifier la quantite d'un produit dans le panier
 */
const validateUpdateItem = [
    param('produitId')
        .notEmpty()
        .withMessage('L\'ID du produit est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de produit invalide.');
            }
            return true;
        }),
    body('quantite')
        .notEmpty()
        .withMessage('La quantite est requise.')
        .isInt({ min: 0 })
        .withMessage('La quantite doit etre un entier positif ou zero.')
        .toInt(),
    validate
];

/**
 * @desc Validation pour retirer un produit du panier
 */
const validateRemoveItem = [
    param('produitId')
        .notEmpty()
        .withMessage('L\'ID du produit est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de produit invalide.');
            }
            return true;
        }),
    validate
];

module.exports = {
    validateAddItem,
    validateUpdateItem,
    validateRemoveItem
};