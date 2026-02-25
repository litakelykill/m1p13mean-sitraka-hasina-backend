/**
 * Produit Routes
 * 
 * Routes pour la gestion des produits (BOUTIQUE uniquement)
 * 
 * LOCAL :
 * - PUT /api/boutique/produits/:id/image - Upload image principale (LOCAL)
 * - DELETE /api/boutique/produits/:id/image - Supprimer image principale (LOCAL)
 * - POST /api/boutique/produits/:id/images - Ajouter image galerie (LOCAL)
 * - DELETE /api/boutique/produits/:id/images/:filename - Supprimer image galerie (LOCAL)
 * 
 * CLOUDINARY :
 * - PUT /api/boutique/produits/:id/image/cloud - Upload image principale (CLOUDINARY)
 * - DELETE /api/boutique/produits/:id/image/cloud - Supprimer image principale (CLOUDINARY)
 * - POST /api/boutique/produits/:id/images/cloud - Ajouter image galerie (CLOUDINARY)
 * - DELETE /api/boutique/produits/:id/images/cloud/:imageUrl - Supprimer image galerie (CLOUDINARY)
 * 
 * @module routes/produit.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    createProduit,
    getMesProduits,
    getProduitById,
    updateProduit,
    deleteProduit,
    toggleProduit,
    updateStock,
    updatePromo,
    uploadImagePrincipale,
    deleteImagePrincipale,
    addImage,
    deleteImage,
    getStats,
    // CLOUDINARY
    uploadImagePrincipaleCloudinary,
    deleteImagePrincipaleCloudinary,
    addImageCloudinary,
    deleteImageCloudinary
} = require('../controllers/produit.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateCreateProduit,
    validateUpdateProduit,
    validateStock,
    validatePromo,
    validateProduitId
} = require('../middlewares/produit.validation');

// Multer pour upload images (LOCAL)
const { uploadProduit } = require('../config/multer');

// ============================================
// CLOUDINARY - Multer config
// ============================================
const { uploadProduit: multerProduitCloudinary } = require('../config/multer-cloudinary');

// ============================================
// Appliquer auth + checkRole('BOUTIQUE') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('BOUTIQUE'));

// ============================================
// ROUTES STATISTIQUES (avant :id pour eviter conflit)
// ============================================

/**
 * @route   GET /api/boutique/produits/stats
 * @desc    Statistiques des produits
 * @access  Private (BOUTIQUE)
 */
router.get('/stats', getStats);

// ============================================
// ROUTES CRUD
// ============================================

/**
 * @route   POST /api/boutique/produits
 * @desc    Creer un produit
 * @access  Private (BOUTIQUE)
 */
router.post('/', validateCreateProduit, createProduit);

/**
 * @route   GET /api/boutique/produits
 * @desc    Liste des produits de la boutique
 * @access  Private (BOUTIQUE)
 * 
 * @query   page, limit, active, categorie, search, stockFaible, enPromo
 */
router.get('/', getMesProduits);

/**
 * @route   GET /api/boutique/produits/:id
 * @desc    Details d'un produit
 * @access  Private (BOUTIQUE)
 */
router.get('/:id', validateProduitId, getProduitById);

/**
 * @route   PUT /api/boutique/produits/:id
 * @desc    Modifier un produit
 * @access  Private (BOUTIQUE)
 */
router.put('/:id', validateProduitId, validateUpdateProduit, updateProduit);

/**
 * @route   DELETE /api/boutique/produits/:id
 * @desc    Supprimer un produit
 * @access  Private (BOUTIQUE)
 */
router.delete('/:id', validateProduitId, deleteProduit);

// ============================================
// ROUTES ACTIONS
// ============================================

/**
 * @route   PUT /api/boutique/produits/:id/toggle
 * @desc    Activer/Desactiver un produit
 * @access  Private (BOUTIQUE)
 */
router.put('/:id/toggle', validateProduitId, toggleProduit);

/**
 * @route   PUT /api/boutique/produits/:id/stock
 * @desc    Modifier le stock
 * @access  Private (BOUTIQUE)
 */
router.put('/:id/stock', validateProduitId, validateStock, updateStock);

/**
 * @route   PUT /api/boutique/produits/:id/promo
 * @desc    Gerer la promotion
 * @access  Private (BOUTIQUE)
 */
router.put('/:id/promo', validateProduitId, validatePromo, updatePromo);

// ============================================
// ROUTES IMAGES - LOCAL
// ============================================

/**
 * @route   PUT /api/boutique/produits/:id/image
 * @desc    Upload/remplacer image principale (LOCAL)
 * @access  Private (BOUTIQUE)
 */
router.put('/:id/image', validateProduitId, uploadProduit.single('image'), uploadImagePrincipale);

/**
 * @route   DELETE /api/boutique/produits/:id/image
 * @desc    Supprimer image principale (LOCAL)
 * @access  Private (BOUTIQUE)
 */
router.delete('/:id/image', validateProduitId, deleteImagePrincipale);

/**
 * @route   POST /api/boutique/produits/:id/images
 * @desc    Ajouter image a la galerie (LOCAL)
 * @access  Private (BOUTIQUE)
 */
router.post('/:id/images', validateProduitId, uploadProduit.single('image'), addImage);

/**
 * @route   DELETE /api/boutique/produits/:id/images/:filename
 * @desc    Supprimer image de la galerie (LOCAL)
 * @access  Private (BOUTIQUE)
 */
router.delete('/:id/images/:filename', validateProduitId, deleteImage);

// ============================================
// CLOUDINARY - ROUTES IMAGES
// ============================================

/**
 * @route   PUT /api/boutique/produits/:id/image/cloud
 * @desc    Upload/remplacer image principale (CLOUDINARY)
 * @access  Private (BOUTIQUE)
 * 
 * @header  Content-Type: multipart/form-data
 * @body    FormData avec champ "image" (fichier image)
 */
router.put('/:id/image/cloud', validateProduitId, multerProduitCloudinary.single('image'), uploadImagePrincipaleCloudinary);

/**
 * @route   DELETE /api/boutique/produits/:id/image/cloud
 * @desc    Supprimer image principale (CLOUDINARY)
 * @access  Private (BOUTIQUE)
 */
router.delete('/:id/image/cloud', validateProduitId, deleteImagePrincipaleCloudinary);

/**
 * @route   POST /api/boutique/produits/:id/images/cloud
 * @desc    Ajouter image a la galerie (CLOUDINARY)
 * @access  Private (BOUTIQUE)
 * 
 * @header  Content-Type: multipart/form-data
 * @body    FormData avec champ "image" (fichier image)
 */
router.post('/:id/images/cloud', validateProduitId, multerProduitCloudinary.single('image'), addImageCloudinary);

/**
 * @route   DELETE /api/boutique/produits/:id/images/cloud/:imageUrl
 * @desc    Supprimer image de la galerie (CLOUDINARY)
 * @access  Private (BOUTIQUE)
 * 
 * Note: imageUrl doit etre encode en base64 pour eviter les problemes d'URL
 * Exemple: btoa('https://res.cloudinary.com/...')
 */
router.delete('/:id/images/cloud/:imageUrl', validateProduitId, deleteImageCloudinary);

module.exports = router;