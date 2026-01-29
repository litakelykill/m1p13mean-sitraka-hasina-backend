/**
 * Categorie Routes
 * 
 * Routes pour la gestion des categories (ADMIN uniquement)
 * 
 * @module routes/categorie.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    createCategorie,
    getCategories,
    getCategorieById,
    updateCategorie,
    deleteCategorie,
    toggleCategorie,
    updateOrdre,
    getListeSimple
} = require('../controllers/categorie.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateCreateCategorie,
    validateUpdateCategorie,
    validateCategorieId,
    validateOrdre
} = require('../middlewares/categorie.validation');

// ============================================
// Appliquer auth + checkRole('ADMIN') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('ADMIN'));

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/admin/categories/liste
 * @desc    Liste simplifiee pour select/dropdown
 * @access  Private (ADMIN)
 */
router.get('/liste', getListeSimple);

/**
 * @route   POST /api/admin/categories
 * @desc    Creer une categorie
 * @access  Private (ADMIN)
 * 
 * @body    {
 *            nom: string (requis),
 *            description: string (optionnel),
 *            ordre: number (optionnel, default 0)
 *          }
 */
router.post('/', validateCreateCategorie, createCategorie);

/**
 * @route   GET /api/admin/categories
 * @desc    Liste des categories avec pagination
 * @access  Private (ADMIN)
 * 
 * @query   page (default 1)
 *          limit (default 20, max 100)
 *          active (true/false)
 *          search (recherche par nom)
 */
router.get('/', getCategories);

/**
 * @route   GET /api/admin/categories/:id
 * @desc    Details d'une categorie
 * @access  Private (ADMIN)
 */
router.get('/:id', validateCategorieId, getCategorieById);

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Modifier une categorie
 * @access  Private (ADMIN)
 * 
 * @body    {
 *            nom: string (optionnel),
 *            description: string (optionnel),
 *            ordre: number (optionnel)
 *          }
 */
router.put('/:id', validateCategorieId, validateUpdateCategorie, updateCategorie);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Supprimer une categorie
 * @access  Private (ADMIN)
 */
router.delete('/:id', validateCategorieId, deleteCategorie);

/**
 * @route   PUT /api/admin/categories/:id/toggle
 * @desc    Activer/Desactiver une categorie
 * @access  Private (ADMIN)
 */
router.put('/:id/toggle', validateCategorieId, toggleCategorie);

/**
 * @route   PUT /api/admin/categories/:id/ordre
 * @desc    Modifier l'ordre d'affichage
 * @access  Private (ADMIN)
 * 
 * @body    { ordre: number }
 */
router.put('/:id/ordre', validateCategorieId, validateOrdre, updateOrdre);

module.exports = router;