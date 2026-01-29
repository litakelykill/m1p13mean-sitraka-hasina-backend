/**
 * Produit Routes
 * 
 * Routes pour la gestion des produits (BOUTIQUE uniquement)
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
    addImage,
    deleteImage,
    getStats
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

// Multer pour upload images
const { uploadProduit } = require('../config/multer');

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
// ROUTES IMAGES
// ============================================

/**
 * @route   PUT /api/boutique/produits/:id/image
 * @desc    Upload/remplacer image principale
 * @access  Private (BOUTIQUE)
 */
router.put('/:id/image', validateProduitId, uploadProduit.single('image'), uploadImagePrincipale);

/**
 * @route   POST /api/boutique/produits/:id/images
 * @desc    Ajouter image a la galerie
 * @access  Private (BOUTIQUE)
 */
router.post('/:id/images', validateProduitId, uploadProduit.single('image'), addImage);

/**
 * @route   DELETE /api/boutique/produits/:id/images/:filename
 * @desc    Supprimer image de la galerie
 * @access  Private (BOUTIQUE)
 */
router.delete('/:id/images/:filename', validateProduitId, deleteImage);

module.exports = router;