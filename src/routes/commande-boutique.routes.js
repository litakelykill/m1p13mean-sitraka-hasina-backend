/**
 * Commande Boutique Routes
 * 
 * Routes pour les commandes cote boutique
 * 
 * @module routes/commande-boutique.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    listeCommandes,
    commandesNouvelles,
    statsCommandes,
    detailsCommande,
    changerStatut,
    ajouterNote
} = require('../controllers/commande-boutique.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole, checkBoutiqueValidated } = require('../middlewares/role.middleware');
const {
    validateCommandeId,
    validateChangerStatut,
    validateAjouterNote,
    validateListeCommandesBoutique
} = require('../middlewares/commande.validation');

// ============================================
// Appliquer auth + checkRole('BOUTIQUE') + checkBoutiqueValidated a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('BOUTIQUE'));
router.use(checkBoutiqueValidated);

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/boutique/commandes
 * @desc    Liste des commandes recues par la boutique
 * @access  Private (BOUTIQUE validee)
 * 
 * @query {Number} [page=1] - Numero de page
 * @query {Number} [limit=10] - Nombre de resultats par page
 * @query {String} [statut=toutes] - Filtrer par statut
 * @query {String} [dateDebut] - Date de debut (ISO8601)
 * @query {String} [dateFin] - Date de fin (ISO8601)
 * 
 * @returns {Object} Liste des commandes avec pagination
 */
router.get('/', validateListeCommandesBoutique, listeCommandes);

/**
 * @route   GET /api/boutique/commandes/nouvelles
 * @desc    Commandes en attente (nouvelles)
 * @access  Private (BOUTIQUE validee)
 * 
 * @query {Number} [page=1] - Numero de page
 * @query {Number} [limit=10] - Nombre de resultats par page
 * 
 * @returns {Object} Liste des commandes en attente
 */
router.get('/nouvelles', commandesNouvelles);

/**
 * @route   GET /api/boutique/commandes/stats
 * @desc    Statistiques des commandes (jour, semaine, mois)
 * @access  Private (BOUTIQUE validee)
 * 
 * @returns {Object} Statistiques globales et par periode
 */
router.get('/stats', statsCommandes);

/**
 * @route   GET /api/boutique/commandes/:id
 * @desc    Details d'une commande
 * @access  Private (BOUTIQUE validee)
 * 
 * @param {String} id - ID de la commande
 * 
 * @returns {Object} Details de la commande (items de cette boutique uniquement)
 */
router.get('/:id', validateCommandeId, detailsCommande);

/**
 * @route   PUT /api/boutique/commandes/:id/statut
 * @desc    Changer le statut d'une commande
 * @access  Private (BOUTIQUE validee)
 * 
 * @param {String} id - ID de la commande
 * @body {String} statut - Nouveau statut
 * @body {String} [commentaire] - Commentaire optionnel
 * 
 * Transitions autorisees:
 * - en_attente -> confirmee, annulee, rupture
 * - confirmee -> en_preparation, annulee
 * - en_preparation -> expediee, annulee
 * - expediee -> livree
 * 
 * @returns {Object} Commande mise a jour
 */
router.put('/:id/statut', validateChangerStatut, changerStatut);

/**
 * @route   POST /api/boutique/commandes/:id/notes
 * @desc    Ajouter une note interne
 * @access  Private (BOUTIQUE validee)
 * 
 * @param {String} id - ID de la commande
 * @body {String} contenu - Contenu de la note
 * 
 * @returns {Object} Note ajoutee
 */
router.post('/:id/notes', validateAjouterNote, ajouterNote);

module.exports = router;