/**
 * Commande Boutique Routes
 * 
 * Routes pour la gestion des commandes cote boutique
 * 
 * @module routes/commande-boutique.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    getCommandes,
    getNouvellesCommandes,
    getStats,
    getCommandeDetails,
    changerStatut,
    ajouterNote
} = require('../controllers/commande-boutique.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateChangerStatut,
    validateAjouterNote,
    validateCommandeId,
    validateListeCommandes
} = require('../middlewares/commande.validation');

// ============================================
// Appliquer auth + checkRole('BOUTIQUE') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('BOUTIQUE'));

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/boutique/commandes
 * @desc    Liste des commandes recues par la boutique
 * @access  Private (BOUTIQUE)
 * 
 * @query   page, limit, statut
 */
router.get('/', validateListeCommandes, getCommandes);

/**
 * @route   GET /api/boutique/commandes/nouvelles
 * @desc    Commandes en attente (nouvelles)
 * @access  Private (BOUTIQUE)
 */
router.get('/nouvelles', getNouvellesCommandes);

/**
 * @route   GET /api/boutique/commandes/stats
 * @desc    Statistiques commandes (jour, semaine, mois)
 * @access  Private (BOUTIQUE)
 */
router.get('/stats', getStats);

/**
 * @route   GET /api/boutique/commandes/:id
 * @desc    Details d'une commande
 * @access  Private (BOUTIQUE)
 */
router.get('/:id', validateCommandeId, getCommandeDetails);

/**
 * @route   PUT /api/boutique/commandes/:id/statut
 * @desc    Changer le statut d'une commande
 * @access  Private (BOUTIQUE)
 * 
 * @body    { statut: String, commentaire?: String }
 */
router.put('/:id/statut', validateChangerStatut, changerStatut);

/**
 * @route   POST /api/boutique/commandes/:id/notes
 * @desc    Ajouter une note interne
 * @access  Private (BOUTIQUE)
 * 
 * @body    { contenu: String }
 */
router.post('/:id/notes', validateAjouterNote, ajouterNote);

module.exports = router;