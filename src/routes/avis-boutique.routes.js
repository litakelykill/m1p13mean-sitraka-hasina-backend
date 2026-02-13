/**
 * Avis Boutique Routes
 * 
 * Routes pour la gestion des avis cote boutique
 * 
 * @module routes/avis-boutique.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    getAvisRecus,
    repondreAvis,
    modifierReponse
} = require('../controllers/avis.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateAvisId,
    validateReponse,
    validateListeAvis
} = require('../middlewares/avis.validation');

// ============================================
// Appliquer auth + checkRole('BOUTIQUE') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('BOUTIQUE'));

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/boutique/avis
 * @desc    Liste des avis recus par la boutique
 * @access  Private (BOUTIQUE)
 * 
 * @query   page, limit, sort (recent, note_desc, note_asc, sans_reponse), statut
 */
router.get('/', validateListeAvis, getAvisRecus);

/**
 * @route   POST /api/boutique/avis/:id/reponse
 * @desc    Repondre a un avis
 * @access  Private (BOUTIQUE)
 * 
 * @body    { contenu }
 */
router.post('/:id/reponse', validateReponse, repondreAvis);

/**
 * @route   PUT /api/boutique/avis/:id/reponse
 * @desc    Modifier sa reponse a un avis
 * @access  Private (BOUTIQUE)
 * 
 * @body    { contenu }
 */
router.put('/:id/reponse', validateReponse, modifierReponse);

module.exports = router;