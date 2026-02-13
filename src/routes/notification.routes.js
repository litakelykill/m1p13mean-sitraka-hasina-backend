/**
 * Notification Routes
 * 
 * Routes pour la gestion des notifications
 * 
 * @module routes/notification.routes
 */

const express = require('express');
const router = express.Router();

// Middleware d'authentification
const { auth } = require('../middlewares/auth.middleware');

// Controller
const {
  getNotifications,
  getUnreadCount,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  getNotificationTypes
} = require('../controllers/notification.controller');

// ============================================
// ROUTES
// ============================================

// Toutes les routes nécessitent une authentification
router.use(auth);

/**
 * @route   GET /api/notifications
 * @desc    Liste des notifications de l'utilisateur
 * @access  Private
 * @query   page (default: 1)
 * @query   limit (default: 20)
 * @query   unreadOnly (default: false)
 * @query   type (optionnel)
 */
router.get('/', getNotifications);

/**
 * @route   GET /api/notifications/count
 * @desc    Nombre de notifications non lues
 * @access  Private
 */
router.get('/count', getUnreadCount);

/**
 * @route   GET /api/notifications/types
 * @desc    Liste des types de notifications
 * @access  Private
 */
router.get('/types', getNotificationTypes);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Marquer toutes les notifications comme lues
 * @access  Private
 */
router.put('/read-all', markAllAsRead);

/**
 * @route   DELETE /api/notifications/read
 * @desc    Supprimer toutes les notifications lues
 * @access  Private
 */
router.delete('/read', deleteReadNotifications);

/**
 * @route   GET /api/notifications/:id
 * @desc    Détail d'une notification
 * @access  Private
 */
router.get('/:id', getNotification);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Marquer une notification comme lue
 * @access  Private
 */
router.put('/:id/read', markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Supprimer une notification
 * @access  Private
 */
router.delete('/:id', deleteNotification);

module.exports = router;