/**
 * Boutique Routes
 * 
 * Routes pour la gestion du profil boutique
 * Toutes les routes sont protegees par auth + checkRole('BOUTIQUE')
 * 
 * LOCAL :
 * - PUT /api/boutique/logo - Upload logo (LOCAL)
 * - DELETE /api/boutique/logo - Supprimer logo (LOCAL)
 * - PUT /api/boutique/banniere - Upload banniere (LOCAL)
 * - DELETE /api/boutique/banniere - Supprimer banniere (LOCAL)
 * 
 * CLOUDINARY :
 * - PUT /api/boutique/logo/cloud - Upload logo (CLOUDINARY)
 * - DELETE /api/boutique/logo/cloud - Supprimer logo (CLOUDINARY)
 * - PUT /api/boutique/banniere/cloud - Upload banniere (CLOUDINARY)
 * - DELETE /api/boutique/banniere/cloud - Supprimer banniere (CLOUDINARY)
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
    deleteBanniere,
    // CLOUDINARY
    uploadLogoCloudinary,
    deleteLogoCloudinary,
    uploadBanniereCloudinary,
    deleteBanniereCloudinary
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

// Multer pour upload fichiers (LOCAL)
const { uploadLogo: multerLogo, uploadBanniere: multerBanniere } = require('../config/multer');

// ============================================
// CLOUDINARY - Multer config
// ============================================
const { 
    uploadLogo: multerLogoCloudinary, 
    uploadBanniere: multerBanniereCloudinary 
} = require('../config/multer-cloudinary');

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
 */
router.put('/informations', validateInformations, updateInformations);

/**
 * @route   PUT /api/boutique/contact
 * @desc    Modifier les informations de contact
 * @access  Private (BOUTIQUE)
 */
router.put('/contact', validateContact, updateContact);

/**
 * @route   PUT /api/boutique/horaires
 * @desc    Modifier les horaires d'ouverture
 * @access  Private (BOUTIQUE)
 */
router.put('/horaires', validateHoraires, updateHoraires);

/**
 * @route   PUT /api/boutique/reseaux-sociaux
 * @desc    Modifier les reseaux sociaux
 * @access  Private (BOUTIQUE)
 */
router.put('/reseaux-sociaux', validateReseauxSociaux, updateReseauxSociaux);

// ============================================
// ROUTES IMAGES - LOCAL
// ============================================

/**
 * @route   PUT /api/boutique/logo
 * @desc    Upload ou remplacer le logo (LOCAL)
 * @access  Private (BOUTIQUE)
 */
router.put('/logo', multerLogo.single('logo'), uploadLogo);

/**
 * @route   DELETE /api/boutique/logo
 * @desc    Supprimer le logo (LOCAL)
 * @access  Private (BOUTIQUE)
 */
router.delete('/logo', deleteLogo);

/**
 * @route   PUT /api/boutique/banniere
 * @desc    Upload ou remplacer la banniere (LOCAL)
 * @access  Private (BOUTIQUE)
 */
router.put('/banniere', multerBanniere.single('banniere'), uploadBanniere);

/**
 * @route   DELETE /api/boutique/banniere
 * @desc    Supprimer la banniere (LOCAL)
 * @access  Private (BOUTIQUE)
 */
router.delete('/banniere', deleteBanniere);

// ============================================
// CLOUDINARY - ROUTES IMAGES
// ============================================

/**
 * @route   PUT /api/boutique/logo/cloud
 * @desc    Upload ou remplacer le logo (CLOUDINARY)
 * @access  Private (BOUTIQUE)
 * 
 * @header  Content-Type: multipart/form-data
 * @body    FormData avec champ "logo" (fichier image)
 *          Types acceptes : jpeg, jpg, png, webp
 *          Taille max : 2 MB
 */
router.put('/logo/cloud', multerLogoCloudinary.single('logo'), uploadLogoCloudinary);

/**
 * @route   DELETE /api/boutique/logo/cloud
 * @desc    Supprimer le logo (CLOUDINARY)
 * @access  Private (BOUTIQUE)
 */
router.delete('/logo/cloud', deleteLogoCloudinary);

/**
 * @route   PUT /api/boutique/banniere/cloud
 * @desc    Upload ou remplacer la banniere (CLOUDINARY)
 * @access  Private (BOUTIQUE)
 * 
 * @header  Content-Type: multipart/form-data
 * @body    FormData avec champ "banniere" (fichier image)
 *          Types acceptes : jpeg, jpg, png, webp
 *          Taille max : 5 MB
 */
router.put('/banniere/cloud', multerBanniereCloudinary.single('banniere'), uploadBanniereCloudinary);

/**
 * @route   DELETE /api/boutique/banniere/cloud
 * @desc    Supprimer la banniere (CLOUDINARY)
 * @access  Private (BOUTIQUE)
 */
router.delete('/banniere/cloud', deleteBanniereCloudinary);

module.exports = router;