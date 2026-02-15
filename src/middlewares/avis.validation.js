/**
 * Avis Validation Middleware
 * 
 * Validations pour les routes d'avis
 * 
 * @module middlewares/avis.validation
 */

const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// ============================================
// HELPER : Verifier les erreurs de validation
// ============================================
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

// ============================================
// VALIDATION : Donner un avis
// ============================================
const validateDonnerAvis = [
    body('boutiqueId')
        .notEmpty()
        .withMessage('L\'ID de la boutique est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de boutique invalide.');
            }
            return true;
        }),
    body('note')
        .notEmpty()
        .withMessage('La note est requise.')
        .isInt({ min: 1, max: 5 })
        .withMessage('La note doit etre entre 1 et 5.'),
    body('commentaire')
        .notEmpty()
        .withMessage('Le commentaire est requis.')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Le commentaire doit contenir entre 10 et 1000 caracteres.'),
    body('commandeId')
        .optional()
        .custom((value) => {
            if (value && !mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de commande invalide.');
            }
            return true;
        }),
    validate
];

// ============================================
// VALIDATION : Modifier un avis
// ============================================
const validateModifierAvis = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de l\'avis est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID d\'avis invalide.');
            }
            return true;
        }),
    body('note')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('La note doit etre entre 1 et 5.'),
    body('commentaire')
        .optional()
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Le commentaire doit contenir entre 10 et 1000 caracteres.'),
    validate
];

// ============================================
// VALIDATION : ID avis dans params
// ============================================
const validateAvisId = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de l\'avis est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID d\'avis invalide.');
            }
            return true;
        }),
    validate
];

// ============================================
// VALIDATION : ID boutique dans params
// ============================================
const validateBoutiqueId = [
    param('boutiqueId')
        .notEmpty()
        .withMessage('L\'ID de la boutique est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de boutique invalide.');
            }
            return true;
        }),
    validate
];

// ============================================
// VALIDATION : Reponse boutique
// ============================================
const validateReponse = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de l\'avis est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID d\'avis invalide.');
            }
            return true;
        }),
    body('contenu')
        .notEmpty()
        .withMessage('Le contenu de la reponse est requis.')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('La reponse doit contenir entre 5 et 500 caracteres.'),
    validate
];

// ============================================
// VALIDATION : Moderation admin
// ============================================
const validateModeration = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de l\'avis est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID d\'avis invalide.');
            }
            return true;
        }),
    body('statut')
        .notEmpty()
        .withMessage('Le statut est requis.')
        .isIn(['approuve', 'rejete'])
        .withMessage('Statut invalide. Valeurs: approuve, rejete'),
    body('raison')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('La raison ne peut pas depasser 500 caracteres.'),
    validate
];

// ============================================
// VALIDATION : Liste avec pagination et tri
// ============================================
const validateListeAvis = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Le numero de page doit etre un entier positif.')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('La limite doit etre entre 1 et 50.')
        .toInt(),
    query('sort')
        .optional()
        .isIn(['recent', 'note_desc', 'note_asc', 'utiles', 'sans_reponse'])
        .withMessage('Tri invalide. Valeurs: recent, note_desc, note_asc, utiles, sans_reponse'),
    validate
];

module.exports = {
    validateDonnerAvis,
    validateModifierAvis,
    validateAvisId,
    validateBoutiqueId,
    validateReponse,
    validateModeration,
    validateListeAvis
};