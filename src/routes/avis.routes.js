/**
 * Avis Routes
 * 
 * Routes pour la gestion des avis (CLIENT et PUBLIC)
 * 
 * @module routes/avis.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    donnerAvis,
    modifierAvis,
    supprimerAvis,
    getMesAvis,
    marquerUtile,
    getAvisBoutique
} = require('../controllers/avis.controller');

// Middlewares
const { auth, optionalAuth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateDonnerAvis,
    validateModifierAvis,
    validateAvisId,
    validateBoutiqueId,
    validateListeAvis
} = require('../middlewares/avis.validation');

// ============================================
// ROUTES PUBLIQUES (avec auth optionnelle)
// ============================================

/**
 * @route   GET /api/avis/boutique/:boutiqueId
 * @desc    Liste des avis d'une boutique
 * @access  Public (auth optionnelle pour "marqueUtileParMoi")
 * 
 * @query   page, limit, sort (recent, note_desc, note_asc, utiles)
 */
router.get('/boutique/:boutiqueId', optionalAuth, validateBoutiqueId, validateListeAvis, getAvisBoutique);

// ============================================
// ROUTES CLIENT (auth requise)
// ============================================

/**
 * @route   POST /api/avis
 * @desc    Donner un avis sur une boutique
 * @access  Private (CLIENT)
 * 
 * @body    { boutiqueId, note, commentaire, commandeId? }
 */
router.post('/', auth, checkRole('CLIENT'), validateDonnerAvis, donnerAvis);

/**
 * @route   GET /api/avis/mes-avis
 * @desc    Liste des avis donnes par le client
 * @access  Private (CLIENT)
 */
router.get('/mes-avis', auth, checkRole('CLIENT'), validateListeAvis, getMesAvis);

/**
 * @route   PUT /api/avis/:id
 * @desc    Modifier son avis
 * @access  Private (CLIENT)
 * 
 * @body    { note?, commentaire? }
 */
router.put('/:id', auth, checkRole('CLIENT'), validateModifierAvis, modifierAvis);

/**
 * @route   DELETE /api/avis/:id
 * @desc    Supprimer son avis
 * @access  Private (CLIENT)
 */
router.delete('/:id', auth, checkRole('CLIENT'), validateAvisId, supprimerAvis);

/**
 * @route   POST /api/avis/:id/utile
 * @desc    Marquer/Demarquer un avis comme utile
 * @access  Private (CLIENT)
 */
router.post('/:id/utile', auth, checkRole('CLIENT'), validateAvisId, marquerUtile);

module.exports = router;