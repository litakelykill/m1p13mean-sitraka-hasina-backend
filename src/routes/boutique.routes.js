/**
 * Boutique Routes
 * 
 * Routes pour la gestion du profil boutique
 * Toutes les routes sont protegees par auth + checkRole('BOUTIQUE')
 * 
 * @module routes/boutique.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    getProfilBoutique,
    getStatutValidation,
    updateInformations,
    updateContact,
    updateHoraires,
    updateReseauxSociaux,
    uploadLogo,
    deleteLogo,
    uploadBanniere,
    deleteBanniere
} = require('../controllers/boutique.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateInformations,
    validateContact,
    validateHoraires,
    validateReseauxSociaux
} = require('../middlewares/boutique.validation');

// Multer pour upload fichiers
const { uploadLogo: multerLogo, uploadBanniere: multerBanniere } = require('../config/multer');

// ============================================
// Appliquer auth + checkRole('BOUTIQUE') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('BOUTIQUE'));

// ============================================
// ROUTES CONSULTATION
// ============================================

/**
 * @route   GET /api/boutique/profil
 * @desc    Recuperer le profil complet de la boutique
 * @access  Private (BOUTIQUE)
 */
router.get('/profil', getProfilBoutique);

/**
 * @route   GET /api/boutique/statut
 * @desc    Recuperer le statut de validation
 * @access  Private (BOUTIQUE)
 */
router.get('/statut', getStatutValidation);

// ============================================
// ROUTES MODIFICATION INFORMATIONS
// ============================================

/**
 * @route   PUT /api/boutique/informations
 * @desc    Modifier les informations de base (nom, description, categorie)
 * @access  Private (BOUTIQUE)
 * 
 * @body    {
 *            nomBoutique: string (optional),
 *            description: string (optional),
 *            categorie: string (optional),
 *            siret: string (optional)
 *          }
 */
router.put('/informations', validateInformations, updateInformations);

/**
 * @route   PUT /api/boutique/contact
 * @desc    Modifier les informations de contact
 * @access  Private (BOUTIQUE)
 * 
 * @body    {
 *            email: string (optional),
 *            telephone: string (optional),
 *            siteWeb: string (optional),
 *            adresse: { rue, ville, codePostal, pays } (optional)
 *          }
 */
router.put('/contact', validateContact, updateContact);

/**
 * @route   PUT /api/boutique/horaires
 * @desc    Modifier les horaires d'ouverture
 * @access  Private (BOUTIQUE)
 * 
 * @body    {
 *            horairesTexte: string (optional, format libre),
 *            horaires: {
 *              lundi: { ouverture: "HH:MM", fermeture: "HH:MM", ferme: boolean },
 *              mardi: { ... },
 *              ...
 *            }
 *          }
 */
router.put('/horaires', validateHoraires, updateHoraires);

/**
 * @route   PUT /api/boutique/reseaux-sociaux
 * @desc    Modifier les reseaux sociaux
 * @access  Private (BOUTIQUE)
 * 
 * @body    {
 *            reseauxSociaux: {
 *              facebook: string (url, optional),
 *              instagram: string (url, optional),
 *              twitter: string (url, optional),
 *              linkedin: string (url, optional),
 *              tiktok: string (url, optional),
 *              youtube: string (url, optional)
 *            }
 *          }
 */
router.put('/reseaux-sociaux', validateReseauxSociaux, updateReseauxSociaux);

// ============================================
// ROUTES IMAGES
// ============================================

/**
 * @route   PUT /api/boutique/logo
 * @desc    Upload ou remplacer le logo
 * @access  Private (BOUTIQUE)
 * 
 * @header  Content-Type: multipart/form-data
 * @body    FormData avec champ "logo" (fichier image)
 *          Types acceptes : jpeg, jpg, png, webp
 *          Taille max : 2 MB
 */
router.put('/logo', multerLogo.single('logo'), uploadLogo);

/**
 * @route   DELETE /api/boutique/logo
 * @desc    Supprimer le logo
 * @access  Private (BOUTIQUE)
 */
router.delete('/logo', deleteLogo);

/**
 * @route   PUT /api/boutique/banniere
 * @desc    Upload ou remplacer la banniere
 * @access  Private (BOUTIQUE)
 * 
 * @header  Content-Type: multipart/form-data
 * @body    FormData avec champ "banniere" (fichier image)
 *          Types acceptes : jpeg, jpg, png, webp
 *          Taille max : 5 MB
 */
router.put('/banniere', multerBanniere.single('banniere'), uploadBanniere);

/**
 * @route   DELETE /api/boutique/banniere
 * @desc    Supprimer la banniere
 * @access  Private (BOUTIQUE)
 */
router.delete('/banniere', deleteBanniere);

module.exports = router;