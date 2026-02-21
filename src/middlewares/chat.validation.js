/**
 * Chat Validation Middleware
 * 
 * Validations pour les routes de chat
 * 
 * @module middlewares/chat.validation
 */

const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// ============================================
// HELPER : Vérifier les erreurs de validation
// ============================================

/**
 * Vérifie et retourne les erreurs de validation
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

// ============================================
// VALIDATION : Démarrer une conversation
// ============================================

/**
 * Validation pour créer une nouvelle conversation
 */
const validateStartConversation = [
    body('boutiqueId')
        .notEmpty()
        .withMessage('L\'ID de la boutique est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de boutique invalide.');
            }
            return true;
        }),
    body('message')
        .notEmpty()
        .withMessage('Le message initial est requis.')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Le message doit contenir entre 1 et 2000 caractères.'),
    body('commandeId')
        .optional()
        .custom((value) => {
            if (value && !mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de commande invalide.');
            }
            return true;
        }),
    body('sujet')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Le sujet ne peut pas dépasser 200 caractères.'),
    validate
];

// ============================================
// VALIDATION : Envoyer un message
// ============================================

/**
 * Validation pour envoyer un message dans une conversation
 */
const validateSendMessage = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de la conversation est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de conversation invalide.');
            }
            return true;
        }),
    body('content')
        .notEmpty()
        .withMessage('Le contenu du message est requis.')
        .trim()
        .isLength({ min: 1, max: 2000 })
        .withMessage('Le message doit contenir entre 1 et 2000 caractères.'),
    validate
];

// ============================================
// VALIDATION : ID conversation dans params
// ============================================

/**
 * Validation de l'ID de conversation
 */
const validateConversationId = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de la conversation est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de conversation invalide.');
            }
            return true;
        }),
    validate
];

// ============================================
// VALIDATION : Liste avec pagination
// ============================================

/**
 * Validation pour la liste des conversations avec pagination
 */
const validateListConversations = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Le numéro de page doit être un entier positif.')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('La limite doit être entre 1 et 50.')
        .toInt(),
    validate
];

// ============================================
// VALIDATION : Messages avec pagination
// ============================================

/**
 * Validation pour récupérer les messages avec pagination
 */
const validateGetMessages = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de la conversation est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de conversation invalide.');
            }
            return true;
        }),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Le numéro de page doit être un entier positif.')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('La limite doit être entre 1 et 100.')
        .toInt(),
    query('before')
        .optional()
        .isISO8601()
        .withMessage('La date "before" doit être au format ISO8601.'),
    validate
];

// ============================================
// VALIDATION : Polling nouveaux messages
// ============================================

/**
 * Validation pour le polling de nouveaux messages
 */
const validatePollMessages = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de la conversation est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de conversation invalide.');
            }
            return true;
        }),
    query('since')
        .notEmpty()
        .withMessage('La date "since" est requise pour le polling.')
        .isISO8601()
        .withMessage('La date "since" doit être au format ISO8601.'),
    validate
];

// ============================================
// VALIDATION : Recherche
// ============================================

/**
 * Validation pour la recherche dans les conversations
 */
const validateSearch = [
    query('q')
        .notEmpty()
        .withMessage('Le terme de recherche est requis.')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Le terme de recherche doit contenir entre 2 et 100 caractères.'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Le numéro de page doit être un entier positif.')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('La limite doit être entre 1 et 50.')
        .toInt(),
    validate
];

module.exports = {
    validateStartConversation,
    validateSendMessage,
    validateConversationId,
    validateListConversations,
    validateGetMessages,
    validatePollMessages,
    validateSearch
};