/**
 * Commande Validation Middleware
 * 
 * Validations pour les routes de commandes
 * 
 * @module middlewares/commande.validation
 */

const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { STATUTS } = require('../models/Commande');

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
// VALIDATION : Passer une commande
// ============================================
const validatePasserCommande = [
    body('adresseLivraison')
        .notEmpty()
        .withMessage('L\'adresse de livraison est requise.')
        .isObject()
        .withMessage('L\'adresse de livraison doit etre un objet.'),
    body('adresseLivraison.nom')
        .notEmpty()
        .withMessage('Le nom est requis.')
        .trim(),
    body('adresseLivraison.prenom')
        .optional()
        .trim(),
    body('adresseLivraison.telephone')
        .optional()
        .trim(),
    body('adresseLivraison.rue')
        .notEmpty()
        .withMessage('La rue est requise.')
        .trim(),
    body('adresseLivraison.ville')
        .notEmpty()
        .withMessage('La ville est requise.')
        .trim(),
    body('adresseLivraison.codePostal')
        .optional()
        .trim(),
    body('adresseLivraison.pays')
        .optional()
        .trim(),
    body('adresseLivraison.instructions')
        .optional()
        .trim(),
    body('modePaiement')
        .optional()
        .isIn(['livraison', 'en_ligne'])
        .withMessage('Mode de paiement invalide.'),
    validate
];

// ============================================
// VALIDATION : Annuler une commande
// ============================================
const validateAnnulerCommande = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de commande est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de commande invalide.');
            }
            return true;
        }),
    body('raison')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('La raison ne peut pas depasser 500 caracteres.'),
    validate
];

// ============================================
// VALIDATION : Changer le statut
// ============================================
const validateChangerStatut = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de commande est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de commande invalide.');
            }
            return true;
        }),
    body('statut')
        .notEmpty()
        .withMessage('Le statut est requis.')
        .isIn(STATUTS)
        .withMessage(`Statut invalide. Valeurs autorisees: ${STATUTS.join(', ')}`),
    body('commentaire')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Le commentaire ne peut pas depasser 500 caracteres.'),
    validate
];

// ============================================
// VALIDATION : Ajouter une note
// ============================================
const validateAjouterNote = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de commande est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de commande invalide.');
            }
            return true;
        }),
    body('contenu')
        .notEmpty()
        .withMessage('Le contenu de la note est requis.')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('La note doit contenir entre 1 et 1000 caracteres.'),
    validate
];

// ============================================
// VALIDATION : ID commande dans params
// ============================================
const validateCommandeId = [
    param('id')
        .notEmpty()
        .withMessage('L\'ID de commande est requis.')
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error('ID de commande invalide.');
            }
            return true;
        }),
    validate
];

// ============================================
// VALIDATION : Liste avec pagination
// ============================================
const validateListeCommandes = [
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
    query('statut')
        .optional()
        .isIn(STATUTS)
        .withMessage(`Statut invalide. Valeurs autorisees: ${STATUTS.join(', ')}`),
    validate
];

module.exports = {
    validatePasserCommande,
    validateAnnulerCommande,
    validateChangerStatut,
    validateAjouterNote,
    validateCommandeId,
    validateListeCommandes
};