/**
 * Commande Client Routes
 * 
 * Routes pour les commandes cote client
 * 
 * @module routes/commande-client.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    passerCommande,
    mesCommandes,
    detailsCommande,
    suiviCommande,
    annulerCommande
} = require('../controllers/commande-client.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validatePasserCommande,
    validateCommandeId,
    validateListeCommandesClient
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
 * @body {Object} adresseLivraison - Adresse de livraison
 * @body {String} adresseLivraison.nom - Nom du destinataire
 * @body {String} adresseLivraison.prenom - Prenom du destinataire
 * @body {String} adresseLivraison.telephone - Telephone
 * @body {String} adresseLivraison.rue - Adresse
 * @body {String} adresseLivraison.ville - Ville
 * @body {String} adresseLivraison.codePostal - Code postal
 * @body {String} [adresseLivraison.pays] - Pays (defaut: Madagascar)
 * @body {String} [adresseLivraison.instructions] - Instructions de livraison
 * @body {String} [modePaiement] - Mode de paiement (livraison | en_ligne)
 * 
 * @returns {Object} Commande creee
 */
router.post('/', validatePasserCommande, passerCommande);

/**
 * @route   GET /api/commandes
 * @desc    Liste des commandes du client
 * @access  Private (CLIENT)
 * 
 * @query {Number} [page=1] - Numero de page
 * @query {Number} [limit=10] - Nombre de resultats par page
 * @query {String} [statut] - Filtrer par statut
 * 
 * @returns {Object} Liste des commandes avec pagination
 */
router.get('/', validateListeCommandesClient, mesCommandes);

/**
 * @route   GET /api/commandes/:id
 * @desc    Details d'une commande
 * @access  Private (CLIENT)
 * 
 * @param {String} id - ID de la commande
 * 
 * @returns {Object} Details complets de la commande
 */
router.get('/:id', validateCommandeId, detailsCommande);

/**
 * @route   GET /api/commandes/:id/suivi
 * @desc    Suivi de livraison (historique des statuts)
 * @access  Private (CLIENT)
 * 
 * @param {String} id - ID de la commande
 * 
 * @returns {Object} Historique des statuts global et par boutique
 */
router.get('/:id/suivi', validateCommandeId, suiviCommande);

/**
 * @route   PUT /api/commandes/:id/annuler
 * @desc    Annuler une commande (si statut = en_attente)
 * @access  Private (CLIENT)
 * 
 * @param {String} id - ID de la commande
 * 
 * @returns {Object} Commande annulee
 */
router.put('/:id/annuler', validateCommandeId, annulerCommande);

module.exports = router;