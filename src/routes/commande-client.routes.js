/**
 * Commande Client Routes
 * 
 * Routes pour la gestion des commandes cote client
 * 
 * @module routes/commande-client.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    passerCommande,
    getMesCommandes,
    getCommande,
    getSuiviCommande,
    annulerCommande
} = require('../controllers/commande-client.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validatePasserCommande,
    validateAnnulerCommande,
    validateCommandeId,
    validateListeCommandes
} = require('../middlewares/commande.validation');

// ============================================
// Appliquer auth + checkRole('CLIENT') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('CLIENT'));

// ============================================
// ROUTES
// ============================================

/**
 * @route   POST /api/commandes
 * @desc    Passer une commande depuis le panier
 * @access  Private (CLIENT)
 * 
 * @body    { adresseLivraison: {...}, modePaiement?: String }
 */
router.post('/', validatePasserCommande, passerCommande);

/**
 * @route   GET /api/commandes
 * @desc    Liste des commandes du client
 * @access  Private (CLIENT)
 * 
 * @query   page, limit, statut
 */
router.get('/', validateListeCommandes, getMesCommandes);

/**
 * @route   GET /api/commandes/:id
 * @desc    Details d'une commande
 * @access  Private (CLIENT)
 */
router.get('/:id', validateCommandeId, getCommande);

/**
 * @route   GET /api/commandes/:id/suivi
 * @desc    Suivi de livraison (historique statuts)
 * @access  Private (CLIENT)
 */
router.get('/:id/suivi', validateCommandeId, getSuiviCommande);

/**
 * @route   PUT /api/commandes/:id/annuler
 * @desc    Annuler une commande (si en_attente)
 * @access  Private (CLIENT)
 * 
 * @body    { raison?: String }
 */
router.put('/:id/annuler', validateAnnulerCommande, annulerCommande);

module.exports = router;