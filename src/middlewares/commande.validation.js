/**
 * Commande Validation Middleware
 * 
 * Validations pour les routes de commande
 * 
 * @module middlewares/commande.validation
 */

const { body, param, query } = require('express-validator');
const { handleValidationErrors, PATTERNS } = require('./validation.middleware');

/**
 * @desc Messages d'erreur pour la validation des commandes
 */
const MESSAGES = {
    // Adresse
    NOM_REQUIRED: 'Le nom est requis.',
    NOM_LENGTH: 'Le nom doit contenir entre 2 et 50 caracteres.',
    PRENOM_REQUIRED: 'Le prenom est requis.',
    PRENOM_LENGTH: 'Le prenom doit contenir entre 2 et 50 caracteres.',
    TELEPHONE_REQUIRED: 'Le telephone est requis.',
    TELEPHONE_INVALID: 'Format de telephone invalide.',
    RUE_REQUIRED: 'L\'adresse est requise.',
    RUE_LENGTH: 'L\'adresse doit contenir entre 5 et 200 caracteres.',
    VILLE_REQUIRED: 'La ville est requise.',
    VILLE_LENGTH: 'La ville doit contenir entre 2 et 100 caracteres.',
    CODE_POSTAL_REQUIRED: 'Le code postal est requis.',
    CODE_POSTAL_LENGTH: 'Le code postal doit contenir entre 3 et 10 caracteres.',
    PAYS_LENGTH: 'Le pays doit contenir entre 2 et 100 caracteres.',
    INSTRUCTIONS_LENGTH: 'Les instructions ne doivent pas depasser 500 caracteres.',

    // Paiement
    MODE_PAIEMENT_INVALID: 'Mode de paiement invalide.',

    // Commande
    COMMANDE_ID_INVALID: 'ID de commande invalide.',
    STATUT_REQUIRED: 'Le statut est requis.',
    STATUT_INVALID: 'Statut invalide.',
    COMMENTAIRE_LENGTH: 'Le commentaire ne doit pas depasser 500 caracteres.',
    NOTE_REQUIRED: 'Le contenu de la note est requis.',
    NOTE_LENGTH: 'La note doit contenir entre 1 et 1000 caracteres.',

    // Pagination
    PAGE_INVALID: 'La page doit etre un nombre positif.',
    LIMIT_INVALID: 'La limite doit etre entre 1 et 50.',
    DATE_INVALID: 'Format de date invalide.'
};

/**
 * @desc Validation pour passer une commande
 * POST /api/commandes
 */
const validatePasserCommande = [
    // Adresse de livraison
    body('adresseLivraison')
        .notEmpty()
        .withMessage('L\'adresse de livraison est requise.'),

    body('adresseLivraison.nom')
        .notEmpty().withMessage(MESSAGES.NOM_REQUIRED)
        .isLength({ min: 2, max: 50 }).withMessage(MESSAGES.NOM_LENGTH)
        .trim(),

    body('adresseLivraison.prenom')
        .notEmpty().withMessage(MESSAGES.PRENOM_REQUIRED)
        .isLength({ min: 2, max: 50 }).withMessage(MESSAGES.PRENOM_LENGTH)
        .trim(),

    body('adresseLivraison.telephone')
        .notEmpty().withMessage(MESSAGES.TELEPHONE_REQUIRED)
        .matches(PATTERNS.PHONE).withMessage(MESSAGES.TELEPHONE_INVALID)
        .trim(),

    body('adresseLivraison.rue')
        .notEmpty().withMessage(MESSAGES.RUE_REQUIRED)
        .isLength({ min: 5, max: 200 }).withMessage(MESSAGES.RUE_LENGTH)
        .trim(),

    body('adresseLivraison.ville')
        .notEmpty().withMessage(MESSAGES.VILLE_REQUIRED)
        .isLength({ min: 2, max: 100 }).withMessage(MESSAGES.VILLE_LENGTH)
        .trim(),

    body('adresseLivraison.codePostal')
        .notEmpty().withMessage(MESSAGES.CODE_POSTAL_REQUIRED)
        .isLength({ min: 3, max: 10 }).withMessage(MESSAGES.CODE_POSTAL_LENGTH)
        .trim(),

    body('adresseLivraison.pays')
        .optional()
        .isLength({ min: 2, max: 100 }).withMessage(MESSAGES.PAYS_LENGTH)
        .trim(),

    body('adresseLivraison.instructions')
        .optional()
        .isLength({ max: 500 }).withMessage(MESSAGES.INSTRUCTIONS_LENGTH)
        .trim(),

    // Mode de paiement
    body('modePaiement')
        .optional()
        .isIn(['livraison', 'en_ligne']).withMessage(MESSAGES.MODE_PAIEMENT_INVALID),

    handleValidationErrors
];

/**
 * @desc Validation pour l'ID de commande
 */
const validateCommandeId = [
    param('id')
        .isMongoId().withMessage(MESSAGES.COMMANDE_ID_INVALID),

    handleValidationErrors
];

/**
 * @desc Validation pour changer le statut d'une commande (boutique)
 * PUT /api/boutique/commandes/:id/statut
 */
const validateChangerStatut = [
    param('id')
        .isMongoId().withMessage(MESSAGES.COMMANDE_ID_INVALID),

    body('statut')
        .notEmpty().withMessage(MESSAGES.STATUT_REQUIRED)
        .isIn(['confirmee', 'en_preparation', 'expediee', 'livree', 'annulee', 'rupture'])
        .withMessage(MESSAGES.STATUT_INVALID),

    body('commentaire')
        .optional()
        .isLength({ max: 500 }).withMessage(MESSAGES.COMMENTAIRE_LENGTH)
        .trim(),

    handleValidationErrors
];

/**
 * @desc Validation pour ajouter une note interne
 * POST /api/boutique/commandes/:id/notes
 */
const validateAjouterNote = [
    param('id')
        .isMongoId().withMessage(MESSAGES.COMMANDE_ID_INVALID),

    body('contenu')
        .notEmpty().withMessage(MESSAGES.NOTE_REQUIRED)
        .isLength({ min: 1, max: 1000 }).withMessage(MESSAGES.NOTE_LENGTH)
        .trim(),

    handleValidationErrors
];

/**
 * @desc Validation pour la liste des commandes (client)
 * GET /api/commandes
 */
const validateListeCommandesClient = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage(MESSAGES.PAGE_INVALID),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 }).withMessage(MESSAGES.LIMIT_INVALID),

    query('statut')
        .optional()
        .isIn(['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee', 'rupture'])
        .withMessage(MESSAGES.STATUT_INVALID),

    handleValidationErrors
];

/**
 * @desc Validation pour la liste des commandes (boutique)
 * GET /api/boutique/commandes
 */
const validateListeCommandesBoutique = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage(MESSAGES.PAGE_INVALID),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 50 }).withMessage(MESSAGES.LIMIT_INVALID),

    query('statut')
        .optional()
        .isIn(['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee', 'rupture', 'toutes'])
        .withMessage(MESSAGES.STATUT_INVALID),

    query('dateDebut')
        .optional()
        .isISO8601().withMessage(MESSAGES.DATE_INVALID),

    query('dateFin')
        .optional()
        .isISO8601().withMessage(MESSAGES.DATE_INVALID),

    handleValidationErrors
];

module.exports = {
    validatePasserCommande,
    validateCommandeId,
    validateChangerStatut,
    validateAjouterNote,
    validateListeCommandesClient,
    validateListeCommandesBoutique,
    MESSAGES
};