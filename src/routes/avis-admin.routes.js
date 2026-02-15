/**
 * Avis Admin Routes
 * 
 * Routes pour la moderation des avis (ADMIN)
 * 
 * @module routes/avis-admin.routes
 */

const express = require('express');
const router = express.Router();

// Controllers
const {
    modererAvis,
    getAvisSignales
} = require('../controllers/avis.controller');

// Middlewares
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateModeration,
    validateListeAvis
} = require('../middlewares/avis.validation');

// ============================================
// Appliquer auth + checkRole('ADMIN') a toutes les routes
// ============================================
router.use(auth);
router.use(checkRole('ADMIN'));

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/admin/avis/signales
 * @desc    Liste des avis signales
 * @access  Private (ADMIN)
 */
router.get('/signales', validateListeAvis, getAvisSignales);

/**
 * @route   PUT /api/admin/avis/:id/moderer
 * @desc    Moderer un avis (approuver/rejeter)
 * @access  Private (ADMIN)
 * 
 * @body    { statut: 'approuve'|'rejete', raison? }
 */
router.put('/:id/moderer', validateModeration, modererAvis);

module.exports = router;