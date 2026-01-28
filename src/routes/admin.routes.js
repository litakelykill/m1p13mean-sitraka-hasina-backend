/**
 * Admin Routes
 * 
 * Routes pour le dashboard admin et la gestion des boutiques
 * Toutes les routes sont protegees par auth + checkRole('ADMIN')
 * 
 * @module routes/admin.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    getDashboardStats,
    getBoutiquesEnAttente,
    getBoutiquesValidees,
    getBoutiquesSuspendues,
    getBoutiquesRejetees,
    getBoutiqueDetails,
    validerBoutique,
    suspendreBoutique,
    reactiverBoutique,
    rejeterBoutique,
    deleteBoutique
} = require('../controllers/admin.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateRejet,
    validatePagination,
    validateBoutiqueId
} = require('../middlewares/admin.validation');

// ============================================
// Appliquer auth + checkRole('ADMIN') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('ADMIN'));

// ============================================
// ROUTES DASHBOARD
// ============================================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Recuperer les statistiques globales
 * @access  Private (ADMIN)
 * 
 * @returns {
 *   success: boolean,
 *   message: string,
 *   data: {
 *     stats: {
 *       boutiques: { total, enAttente, validees, suspendues, rejetees },
 *       utilisateurs: { clients, admins, total }
 *     }
 *   }
 * }
 */
router.get('/dashboard', getDashboardStats);

// ============================================
// ROUTES LISTES BOUTIQUES
// ============================================

/**
 * @route   GET /api/admin/boutiques/en-attente
 * @desc    Liste des boutiques en attente de validation
 * @access  Private (ADMIN)
 * 
 * @query   page (optional) - Numero de page (default: 1)
 * @query   limit (optional) - Nombre par page (default: 10, max: 100)
 */
router.get('/boutiques/en-attente', validatePagination, getBoutiquesEnAttente);

/**
 * @route   GET /api/admin/boutiques/validees
 * @desc    Liste des boutiques validees
 * @access  Private (ADMIN)
 */
router.get('/boutiques/validees', validatePagination, getBoutiquesValidees);

/**
 * @route   GET /api/admin/boutiques/suspendues
 * @desc    Liste des boutiques suspendues
 * @access  Private (ADMIN)
 */
router.get('/boutiques/suspendues', validatePagination, getBoutiquesSuspendues);

/**
 * @route   GET /api/admin/boutiques/rejetees
 * @desc    Liste des boutiques rejetees
 * @access  Private (ADMIN)
 */
router.get('/boutiques/rejetees', validatePagination, getBoutiquesRejetees);

// ============================================
// ROUTES DETAILS ET ACTIONS BOUTIQUE
// ============================================

/**
 * @route   GET /api/admin/boutiques/:id
 * @desc    Recuperer les details d'une boutique
 * @access  Private (ADMIN)
 */
router.get('/boutiques/:id', validateBoutiqueId, getBoutiqueDetails);

/**
 * @route   PUT /api/admin/boutiques/:id/valider
 * @desc    Valider une boutique
 * @access  Private (ADMIN)
 * 
 * @action  - boutique.isValidated = true
 *          - boutique.validatedBy = admin ID
 *          - boutique.validatedAt = now
 */
router.put('/boutiques/:id/valider', validateBoutiqueId, validerBoutique);

/**
 * @route   PUT /api/admin/boutiques/:id/suspendre
 * @desc    Suspendre une boutique
 * @access  Private (ADMIN)
 * 
 * @action  - isActive = false
 */
router.put('/boutiques/:id/suspendre', validateBoutiqueId, suspendreBoutique);

/**
 * @route   PUT /api/admin/boutiques/:id/reactiver
 * @desc    Reactiver une boutique suspendue
 * @access  Private (ADMIN)
 * 
 * @action  - isActive = true
 */
router.put('/boutiques/:id/reactiver', validateBoutiqueId, reactiverBoutique);

/**
 * @route   PUT /api/admin/boutiques/:id/rejeter
 * @desc    Rejeter une demande de boutique
 * @access  Private (ADMIN)
 * 
 * @body    { raison: string (required, min 10 chars) }
 * 
 * @action  - boutique.rejectedReason = raison
 */
router.put('/boutiques/:id/rejeter', validateBoutiqueId, validateRejet, rejeterBoutique);

/**
 * @route   DELETE /api/admin/boutiques/:id
 * @desc    Supprimer une boutique
 * @access  Private (ADMIN)
 * 
 * @action  - Supprime l'utilisateur BOUTIQUE de la base
 *          - Supprime l'avatar si existe
 */
router.delete('/boutiques/:id', validateBoutiqueId, deleteBoutique);

module.exports = router;