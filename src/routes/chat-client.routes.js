/**
 * Chat Client Routes
 * 
 * Routes de chat pour les clients
 * Préfixe: /api/chat
 * 
 * @module routes/chat-client.routes
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { auth } = require('../middlewares/auth.middleware');
const { checkRole } = require('../middlewares/role.middleware');
const {
    validateStartConversation,
    validateSendMessage,
    validateConversationId,
    validateListConversations,
    validateGetMessages,
    validatePollMessages,
    validateSearch
} = require('../middlewares/chat.validation');

// ============================================
// Toutes les routes nécessitent authentification CLIENT
// ============================================
router.use(auth);
router.use(checkRole('CLIENT'));

// ============================================
// ROUTES
// ============================================

/**
 * @route   POST /api/chat/conversations
 * @desc    Démarrer une conversation avec une boutique
 * @access  CLIENT
 */
router.post(
    '/conversations',
    validateStartConversation,
    chatController.startConversation
);

/**
 * @route   GET /api/chat/conversations
 * @desc    Liste des conversations du client
 * @access  CLIENT
 */
router.get(
    '/conversations',
    validateListConversations,
    chatController.getConversations
);

/**
 * @route   GET /api/chat/conversations/unread-count
 * @desc    Nombre de conversations avec messages non lus
 * @access  CLIENT
 */
router.get(
    '/conversations/unread-count',
    chatController.getUnreadCount
);

/**
 * @route   GET /api/chat/conversations/search
 * @desc    Rechercher dans les conversations
 * @access  CLIENT
 */
router.get(
    '/conversations/search',
    validateSearch,
    chatController.searchConversations
);

/**
 * @route   GET /api/chat/conversations/:id
 * @desc    Détails d'une conversation avec messages
 * @access  CLIENT (participant uniquement)
 */
router.get(
    '/conversations/:id',
    validateGetMessages,
    chatController.getConversation
);

/**
 * @route   POST /api/chat/conversations/:id/messages
 * @desc    Envoyer un message dans une conversation
 * @access  CLIENT (participant uniquement)
 */
router.post(
    '/conversations/:id/messages',
    validateSendMessage,
    chatController.sendMessage
);

/**
 * @route   GET /api/chat/conversations/:id/poll
 * @desc    Polling des nouveaux messages
 * @access  CLIENT (participant uniquement)
 */
router.get(
    '/conversations/:id/poll',
    validatePollMessages,
    chatController.pollMessages
);

/**
 * @route   PUT /api/chat/conversations/:id/read
 * @desc    Marquer la conversation comme lue
 * @access  CLIENT (participant uniquement)
 */
router.put(
    '/conversations/:id/read',
    validateConversationId,
    chatController.markAsRead
);

module.exports = router;