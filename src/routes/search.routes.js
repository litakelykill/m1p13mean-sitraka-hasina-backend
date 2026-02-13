/**
 * Search Routes
 * 
 * Routes pour la recherche avancée
 * 
 * @module routes/search.routes
 */

const express = require('express');
const router = express.Router();

// Middlewares
const { auth, optionalAuth } = require('../middlewares/auth.middleware');

// Controller
const {
    search,
    getSuggestions,
    getTrending,
    getHistory,
    getRecentSearches,
    clearHistory,
    deleteSearchItem
} = require('../controllers/search.controller');

// ============================================
// ROUTES PUBLIQUES (avec auth optionnelle)
// ============================================

/**
 * @route   GET /api/search
 * @desc    Recherche unifiée produits et boutiques
 * @access  Public (auth optionnelle pour historique)
 * 
 * @query   q - Terme de recherche (requis, min 2 caractères)
 * @query   type - all, produits, boutiques (default: all)
 * @query   categorie - ID catégorie (pour produits)
 * @query   prixMin - Prix minimum
 * @query   prixMax - Prix maximum
 * @query   enPromo - true pour produits en promo
 * @query   sort - pertinence, prix_asc, prix_desc, recent
 * @query   page - Numéro de page (default: 1)
 * @query   limit - Résultats par page (default: 12)
 */
router.get('/', optionalAuth, search);

/**
 * @route   GET /api/search/suggestions
 * @desc    Suggestions de recherche (autocomplete)
 * @access  Public
 * 
 * @query   q - Préfixe de recherche (min 2 caractères)
 * @query   limit - Nombre de suggestions (default: 10, max: 20)
 */
router.get('/suggestions', getSuggestions);

/**
 * @route   GET /api/search/trending
 * @desc    Recherches populaires/trending
 * @access  Public
 * 
 * @query   limit - Nombre de résultats (default: 10, max: 20)
 * @query   days - Période en jours (default: 7, max: 30)
 */
router.get('/trending', getTrending);

// ============================================
// ROUTES PRIVÉES (authentification requise)
// ============================================

/**
 * @route   GET /api/search/history
 * @desc    Historique de recherche complet
 * @access  Private
 * 
 * @query   page - Numéro de page (default: 1)
 * @query   limit - Résultats par page (default: 20)
 */
router.get('/history', auth, getHistory);

/**
 * @route   GET /api/search/recent
 * @desc    Recherches récentes uniques (pour affichage rapide)
 * @access  Private
 * 
 * @query   limit - Nombre de résultats (default: 10, max: 20)
 */
router.get('/recent', auth, getRecentSearches);

/**
 * @route   DELETE /api/search/history
 * @desc    Supprimer tout l'historique de recherche
 * @access  Private
 */
router.delete('/history', auth, clearHistory);

/**
 * @route   DELETE /api/search/history/:id
 * @desc    Supprimer une recherche spécifique
 * @access  Private
 */
router.delete('/history/:id', auth, deleteSearchItem);

module.exports = router;