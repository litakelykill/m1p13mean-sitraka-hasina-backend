/**
 * Dashboard Boutique Routes
 * 
 * Routes pour le tableau de bord des boutiques
 * 
 * @module routes/dashboard-boutique.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    getStats,
    getAlertesStock,
    getProduitsParCategorie,
    getResume,
    getDernieresCommandes
} = require('../controllers/dashboard-boutique.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');

// ============================================
// Appliquer auth + checkRole('BOUTIQUE') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('BOUTIQUE'));

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/boutique/dashboard
 * @desc    Statistiques globales de la boutique
 * @access  Private (BOUTIQUE)
 * 
 * @returns {Object} Stats produits, stock, commandes
 */
router.get('/', getStats);

/**
 * @route   GET /api/boutique/dashboard/resume
 * @desc    Resume rapide pour widgets
 * @access  Private (BOUTIQUE)
 * 
 * @returns {Object} Compteurs: produits, actifs, alertes, promos, commandes
 */
router.get('/resume', getResume);

/**
 * @route   GET /api/boutique/dashboard/alertes-stock
 * @desc    Produits en alerte stock (stock faible + rupture)
 * @access  Private (BOUTIQUE)
 * 
 * @returns {Object} Liste produits stock faible et en rupture
 */
router.get('/alertes-stock', getAlertesStock);

/**
 * @route   GET /api/boutique/dashboard/produits-par-categorie
 * @desc    Repartition des produits par categorie
 * @access  Private (BOUTIQUE)
 * 
 * @returns {Object} Comptage produits par categorie avec valeur stock
 */
router.get('/produits-par-categorie', getProduitsParCategorie);

/**
 * @route   GET /api/boutique/dashboard/dernieres-commandes
 * @desc    Dernieres commandes recues
 * @access  Private (BOUTIQUE)
 * 
 * @query {Number} [limit=5] - Nombre de commandes a retourner
 * 
 * @returns {Object} Liste des dernieres commandes
 */
router.get('/dernieres-commandes', getDernieresCommandes);

module.exports = router;