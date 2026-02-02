/**
 * Catalogue Routes
 * 
 * Routes pour le catalogue produits (PUBLIC)
 * Accessible sans authentification
 * 
 * @module routes/catalogue.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
  getProduits,
  getProduitById,
  getProduitBySlug,
  getCategories,
  getBoutiques,
  getBoutiqueById,
  getBoutiquesCategories,
  getProduitsByBoutique
} = require('../controllers/catalogue.controller');

// ============================================
// ROUTES PUBLIQUES (pas d'authentification)
// ============================================

/**
 * @route   GET /api/catalogue/produits
 * @desc    Liste des produits avec filtres et pagination
 * @access  Public
 * 
 * @query   page (default 1)
 *          limit (default 12, max 50)
 *          categorie (ObjectId)
 *          boutique (ObjectId)
 *          prixMin (Number)
 *          prixMax (Number)
 *          enPromo (Boolean)
 *          search (String)
 *          sort (prix_asc, prix_desc, recent, ancien)
 */
router.get('/produits', getProduits);

/**
 * @route   GET /api/catalogue/produits/slug/:slug
 * @desc    Details d'un produit par slug
 * @access  Public
 * 
 * Note: Cette route doit etre AVANT /:id pour eviter conflit
 */
router.get('/produits/slug/:slug', getProduitBySlug);

/**
 * @route   GET /api/catalogue/produits/:id
 * @desc    Details d'un produit par ID
 * @access  Public
 */
router.get('/produits/:id', getProduitById);

/**
 * @route   GET /api/catalogue/categories
 * @desc    Liste des categories actives avec comptage produits
 * @access  Public
 */
router.get('/categories', getCategories);

/**
 * @route   GET /api/catalogue/boutiques
 * @desc    Liste des boutiques validees avec filtres et pagination
 * @access  Public
 * 
 * @query   page (default 1)
 *          limit (default 12, max 50)
 *          categorie (String, categorie de boutique)
 *          search (String, recherche nom)
 *          sort (nom_asc, nom_desc, recent, ancien, produits_desc)
 */
router.get('/boutiques', getBoutiques);

/**
 * @route   GET /api/catalogue/boutiques/categories
 * @desc    Liste des categories de boutiques distinctes
 * @access  Public
 * 
 * Note: Cette route doit etre AVANT /:id pour eviter conflit
 */
router.get('/boutiques/categories', getBoutiquesCategories);

/**
 * @route   GET /api/catalogue/boutiques/:id
 * @desc    Details complets d'une boutique
 * @access  Public
 */
router.get('/boutiques/:id', getBoutiqueById);

/**
 * @route   GET /api/catalogue/boutiques/:id/produits
 * @desc    Produits d'une boutique specifique
 * @access  Public
 * 
 * @query   page, limit, categorie, prixMin, prixMax, enPromo, search, sort
 */
router.get('/boutiques/:id/produits', getProduitsByBoutique);

module.exports = router;