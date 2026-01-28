/**
 * Boutique Validation Middleware
 * 
 * Middlewares de validation pour les routes boutique
 * 
 * @module middlewares/boutique.validation
 */

const { body, validationResult } = require('express-validator');

/**
 * @desc Middleware pour gérer les erreurs de validation - HANDLER : Traitement des erreurs de validation
 * Si des erreurs de validation sont présentes, renvoie une réponse 400 avec les détails des erreurs
 * Sinon, passe au middleware suivant _ HANDLER
 * @param {Object} req - Objet request Express
 * @param {Object} res - Objet response Express
 * @param {Function} next - Fonction next Express
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

// VALIDATION : Informations de base
const validateInformations = [
  body('nomBoutique')
    .optional()
    .isLength({ min: 1, max: 100 }).withMessage('Le nom doit contenir entre 1 et 100 caracteres.')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 2000 }).withMessage('La description ne peut pas depasser 2000 caracteres.')
    .trim(),

  body('categorie')
    .optional()
    .isLength({ max: 100 }).withMessage('La categorie ne peut pas depasser 100 caracteres.')
    .trim(),

  body('siret')
    .optional()
    .matches(/^[0-9]{14}$/).withMessage('Le SIRET doit contenir exactement 14 chiffres.')
    .trim(),

  handleValidationErrors
];

// VALIDATION : Contact
const validateContact = [
  body('email')
    .optional()
    .isEmail().withMessage('Email invalide.')
    .normalizeEmail()
    .trim(),

  body('telephone')
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/).withMessage('Numero de telephone invalide.')
    .trim(),

  body('siteWeb')
    .optional()
    .isURL({ require_protocol: false }).withMessage('URL du site web invalide.')
    .trim(),

  body('adresse.rue')
    .optional()
    .isLength({ max: 200 }).withMessage('L\'adresse ne peut pas depasser 200 caracteres.')
    .trim(),

  body('adresse.ville')
    .optional()
    .isLength({ max: 100 }).withMessage('La ville ne peut pas depasser 100 caracteres.')
    .trim(),

  body('adresse.codePostal')
    .optional()
    .isLength({ max: 10 }).withMessage('Le code postal ne peut pas depasser 10 caracteres.')
    .trim(),

  body('adresse.pays')
    .optional()
    .isLength({ max: 50 }).withMessage('Le pays ne peut pas depasser 50 caracteres.')
    .trim(),

  handleValidationErrors
];

// VALIDATION : Horaires
const validateHoraires = [
  body('horairesTexte')
    .optional({ values: 'falsy' })
    .isLength({ max: 500 }).withMessage('Les horaires ne peuvent pas depasser 500 caracteres.')
    .trim(),

  body('horaires')
    .optional({ values: 'falsy' })
    .isObject().withMessage('Les horaires doivent etre un objet.'),

  body('horaires.*.ouverture')
    .optional({ values: 'falsy' })
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format d\'heure invalide (HH:MM).'),

  body('horaires.*.fermeture')
    .optional({ values: 'falsy' })
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Format d\'heure invalide (HH:MM).'),

  body('horaires.*.ferme')
    .optional({ values: 'falsy' })
    .isBoolean().withMessage('Le champ ferme doit etre un booleen.'),

  handleValidationErrors
];

// VALIDATION : Reseaux sociaux
const validateReseauxSociaux = [
  body('reseauxSociaux')
    .notEmpty().withMessage('Les donnees des reseaux sociaux sont requises.')
    .isObject().withMessage('Les reseaux sociaux doivent etre un objet.'),

  body('reseauxSociaux.facebook')
    .optional({ nullable: true })
    .isURL().withMessage('URL Facebook invalide.'),

  body('reseauxSociaux.instagram')
    .optional({ nullable: true })
    .isURL().withMessage('URL Instagram invalide.'),

  body('reseauxSociaux.twitter')
    .optional({ nullable: true })
    .isURL().withMessage('URL Twitter invalide.'),

  body('reseauxSociaux.linkedin')
    .optional({ nullable: true })
    .isURL().withMessage('URL LinkedIn invalide.'),

  body('reseauxSociaux.tiktok')
    .optional({ nullable: true })
    .isURL().withMessage('URL TikTok invalide.'),

  body('reseauxSociaux.youtube')
    .optional({ nullable: true })
    .isURL().withMessage('URL YouTube invalide.'),

  handleValidationErrors
];

module.exports = {
  validateInformations,
  validateContact,
  validateHoraires,
  validateReseauxSociaux,
  handleValidationErrors
};