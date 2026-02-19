/**
 * Chat Boutique Routes
 * 
 * Routes de chat pour les boutiques
 * Préfixe: /api/boutique/chat
 * 
 * @module routes/chat-boutique.routes
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { auth } = require('../middlewares/auth.middleware');
const { checkRole, checkBoutiqueValidated } = require('../middlewares/role.middleware');
const {
    validateSendMessage,
    validateConversationId,
    validateListConversations,
    validateGetMessages,
    validatePollMessages,
    validateSearch
} = require('../middlewares/chat.validation');

// ============================================
// Toutes les routes nécessitent authentification BOUTIQUE validée
// ============================================
router.use(auth);
router.use(checkRole('BOUTIQUE'));
router.use(checkBoutiqueValidated);

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/boutique/chat/conversations
 * @desc    Liste des conversations reçues par la boutique
 * @access  BOUTIQUE
 */
router.get(
    '/conversations',
    validateListConversations,
    chatController.getConversations
);

/**
 * @route   GET /api/boutique/chat/conversations/unread-count
 * @desc    Nombre de conversations avec messages non lus
 * @access  BOUTIQUE
 */
router.get(
    '/conversations/unread-count',
    chatController.getUnreadCount
);

/**
 * @route   GET /api/boutique/chat/conversations/search
 * @desc    Rechercher dans les conversations
 * @access  BOUTIQUE
 */
router.get(
    '/conversations/search',
    validateSearch,
    chatController.searchConversations
);

/**
 * @route   GET /api/boutique/chat/conversations/:id
 * @desc    Détails d'une conversation avec messages
 * @access  BOUTIQUE (participant uniquement)
 */
router.get(
    '/conversations/:id',
    validateGetMessages,
    chatController.getConversation
);

/**
 * @route   POST /api/boutique/chat/conversations/:id/messages
 * @desc    Répondre dans une conversation
 * @access  BOUTIQUE (participant uniquement)
 */
router.post(
    '/conversations/:id/messages',
    validateSendMessage,
    chatController.sendMessage
);

/**
 * @route   GET /api/boutique/chat/conversations/:id/poll
 * @desc    Polling des nouveaux messages
 * @access  BOUTIQUE (participant uniquement)
 */
router.get(
    '/conversations/:id/poll',
    validatePollMessages,
    chatController.pollMessages
);

/**
 * @route   PUT /api/boutique/chat/conversations/:id/read
 * @desc    Marquer la conversation comme lue
 * @access  BOUTIQUE (participant uniquement)
 */
router.put(
    '/conversations/:id/read',
    validateConversationId,
    chatController.markAsRead
);

module.exports = router;