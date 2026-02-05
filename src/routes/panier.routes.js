/**
 * Panier Routes
 * 
 * Routes pour la gestion du panier client
 * 
 * @module routes/panier.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    getPanier,
    getCount,
    addItem,
    updateItem,
    removeItem,
    clearPanier,
    verifyPanier
} = require('../controllers/panier.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateAddItem,
    validateUpdateItem,
    validateRemoveItem
} = require('../middlewares/panier.validation');

// ============================================
// Appliquer auth + checkRole('CLIENT') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('CLIENT'));

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/panier
 * @desc    Voir le panier complet
 * @access  Private (CLIENT)
 */
router.get('/', getPanier);

/**
 * @route   GET /api/panier/count
 * @desc    Nombre d'articles (pour badge header)
 * @access  Private (CLIENT)
 */
router.get('/count', getCount);

/**
 * @route   GET /api/panier/verify
 * @desc    Verifier la validite du panier (stock, prix)
 * @access  Private (CLIENT)
 */
router.get('/verify', verifyPanier);

/**
 * @route   POST /api/panier/items
 * @desc    Ajouter un produit au panier
 * @access  Private (CLIENT)
 * 
 * @body    { produitId: ObjectId, quantite?: Number }
 */
router.post('/items', validateAddItem, addItem);

/**
 * @route   PUT /api/panier/items/:produitId
 * @desc    Modifier la quantite d'un produit
 * @access  Private (CLIENT)
 * 
 * @body    { quantite: Number }
 */
router.put('/items/:produitId', validateUpdateItem, updateItem);

/**
 * @route   DELETE /api/panier/items/:produitId
 * @desc    Retirer un produit du panier
 * @access  Private (CLIENT)
 */
router.delete('/items/:produitId', validateRemoveItem, removeItem);

/**
 * @route   DELETE /api/panier
 * @desc    Vider le panier completement
 * @access  Private (CLIENT)
 */
router.delete('/', clearPanier);

module.exports = router;