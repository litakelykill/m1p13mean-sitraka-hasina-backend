/**
 * Chat Controller
 * 
 * Gestion des conversations et messages entre clients et boutiques
 * Messages chiffrés avec AES-256-GCM
 * 
 * @module controllers/chat.controller
 */

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Commande = require('../models/Commande');
const NotificationService = require('../services/notification.service');
const { NOTIFICATION_TYPES } = require('../models/Notification');

// ============================================
// CLIENT : Démarrer une conversation
// ============================================

/**
 * Crée une nouvelle conversation ou récupère une existante avec une boutique
 * @route POST /api/chat/conversations
 * @access CLIENT
 */
const startConversation = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { boutiqueId, message, commandeId, sujet } = req.body;

        // Vérifier que la boutique existe et est validée
        const boutique = await User.findOne({
            _id: boutiqueId,
            role: 'BOUTIQUE',
            isActive: true,
            'boutique.isValidated': true
        });

        if (!boutique) {
            return res.status(404).json({
                success: false,
                message: 'Boutique non trouvée ou non validée.'
            });
        }

        // Vérifier la commande si fournie
        if (commandeId) {
            const commande = await Commande.findOne({
                _id: commandeId,
                client: clientId,
                'parBoutique.boutique': boutiqueId
            });

            if (!commande) {
                return res.status(404).json({
                    success: false,
                    message: 'Commande non trouvée ou non associée à cette boutique.'
                });
            }
        }

        // Trouver ou créer la conversation
        const { conversation, isNew } = await Conversation.findOrCreate(
            clientId,
            boutiqueId,
            commandeId || null,
            sujet
        );

        // Créer le premier message
        const newMessage = await Message.createEncrypted(
            conversation._id,
            clientId,
            'CLIENT',
            message
        );

        // Mettre à jour la conversation
        await conversation.updateLastMessage(message, 'CLIENT');
        await conversation.incrementUnread('BOUTIQUE');

        // Envoyer notification à la boutique
        await NotificationService.notify(
            NOTIFICATION_TYPES.NOUVEAU_MESSAGE,
            boutiqueId,
            {
                titre: 'Nouveau message',
                message: `Vous avez reçu un nouveau message${sujet ? ` concernant: ${sujet}` : ''}.`,
                lien: `/boutique/chat/${conversation._id}`,
                conversationId: conversation._id,
                clientId
            },
            { entiteType: 'conversation', entiteId: conversation._id }
        );

        // Récupérer la conversation avec les infos complètes
        const populatedConversation = await Conversation.findById(conversation._id)
            .populate('client', 'nom prenom avatar avatarUrl')
            .populate('boutique', 'nom prenom boutique.nomBoutique boutique.logoUrl')
            .populate('commande', 'numeroCommande');

        res.status(isNew ? 201 : 200).json({
            success: true,
            message: isNew ? 'Conversation créée avec succès.' : 'Message envoyé.',
            data: {
                conversation: populatedConversation,
                message: {
                    _id: newMessage._id,
                    content: message,
                    senderRole: 'CLIENT',
                    createdAt: newMessage.createdAt
                }
            }
        });

    } catch (error) {
        console.error('Erreur startConversation:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création de la conversation.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// COMMUN : Liste des conversations
// ============================================

/**
 * Récupère la liste des conversations d'un utilisateur
 * @route GET /api/chat/conversations (CLIENT) ou /api/boutique/chat/conversations (BOUTIQUE)
 * @access CLIENT, BOUTIQUE
 */
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { page = 1, limit = 20 } = req.query;

        // Construire la requête selon le rôle
        const query = { isActive: true };
        if (userRole === 'CLIENT') {
            query.client = userId;
        } else if (userRole === 'BOUTIQUE') {
            query.boutique = userId;
        }

        // Récupérer les conversations
        const conversations = await Conversation.find(query)
            .sort({ lastMessageAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('client', 'nom prenom avatar avatarUrl')
            .populate('boutique', 'nom prenom boutique.nomBoutique boutique.logoUrl')
            .populate('commande', 'numeroCommande');

        const total = await Conversation.countDocuments(query);

        // Ajouter le compteur de non lus pour chaque conversation
        const conversationsWithUnread = conversations.map(conv => {
            const unreadCount = userRole === 'CLIENT' 
                ? conv.clientUnreadCount 
                : conv.boutiqueUnreadCount;
            
            return {
                ...conv.toJSON(),
                unreadCount
            };
        });

        res.status(200).json({
            success: true,
            message: 'Liste des conversations récupérée.',
            data: {
                conversations: conversationsWithUnread,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getConversations:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des conversations.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// COMMUN : Compteur de conversations non lues
// ============================================

/**
 * Compte les conversations avec messages non lus
 * @route GET /api/chat/conversations/unread-count
 * @access CLIENT, BOUTIQUE
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        const count = await Conversation.countUnreadConversations(userId, userRole);

        res.status(200).json({
            success: true,
            data: { unreadCount: count }
        });

    } catch (error) {
        console.error('Erreur getUnreadCount:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du comptage.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// COMMUN : Détails d'une conversation
// ============================================

/**
 * Récupère les détails d'une conversation avec ses messages
 * @route GET /api/chat/conversations/:id
 * @access CLIENT, BOUTIQUE (participant uniquement)
 */
const getConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;
        const { page = 1, limit = 50, before } = req.query;

        // Récupérer la conversation
        const conversation = await Conversation.findById(id)
            .populate('client', 'nom prenom avatar avatarUrl email')
            .populate('boutique', 'nom prenom boutique.nomBoutique boutique.logoUrl boutique.email')
            .populate('commande', 'numeroCommande statut total createdAt');

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation non trouvée.'
            });
        }

        // Vérifier que l'utilisateur est participant
        const isParticipant = 
            (userRole === 'CLIENT' && conversation.client._id.equals(userId)) ||
            (userRole === 'BOUTIQUE' && conversation.boutique._id.equals(userId));

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à cette conversation.'
            });
        }

        // Récupérer les messages
        const messages = await Message.getByConversation(id, { page, limit, before });

        // Marquer les messages comme lus
        await Message.markAllAsRead(id, userRole);
        await conversation.markAsRead(userRole);

        res.status(200).json({
            success: true,
            message: 'Conversation récupérée.',
            data: {
                conversation,
                messages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: messages.length === parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getConversation:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de la conversation.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// COMMUN : Envoyer un message
// ============================================

/**
 * Envoie un message dans une conversation existante
 * @route POST /api/chat/conversations/:id/messages
 * @access CLIENT, BOUTIQUE (participant uniquement)
 */
const sendMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;
        const { content } = req.body;

        // Récupérer la conversation
        const conversation = await Conversation.findById(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation non trouvée.'
            });
        }

        if (!conversation.isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cette conversation est fermée.'
            });
        }

        // Vérifier que l'utilisateur est participant
        const isClient = userRole === 'CLIENT' && conversation.client.equals(userId);
        const isBoutique = userRole === 'BOUTIQUE' && conversation.boutique.equals(userId);

        if (!isClient && !isBoutique) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à cette conversation.'
            });
        }

        // Créer le message chiffré
        const message = await Message.createEncrypted(
            conversation._id,
            userId,
            userRole,
            content
        );

        // Mettre à jour la conversation
        await conversation.updateLastMessage(content, userRole);

        // Incrémenter le compteur de non lus pour l'autre partie
        const recipientRole = userRole === 'CLIENT' ? 'BOUTIQUE' : 'CLIENT';
        await conversation.incrementUnread(recipientRole);

        // Envoyer notification
        const recipientId = userRole === 'CLIENT' 
            ? conversation.boutique 
            : conversation.client;

        await NotificationService.notify(
            NOTIFICATION_TYPES.NOUVEAU_MESSAGE,
            recipientId,
            {
                titre: 'Nouveau message',
                message: content.length > 50 ? content.substring(0, 50) + '...' : content,
                lien: userRole === 'CLIENT' 
                    ? `/boutique/chat/${conversation._id}`
                    : `/client/chat/${conversation._id}`,
                conversationId: conversation._id,
                senderId: userId
            },
            { entiteType: 'conversation', entiteId: conversation._id }
        );

        res.status(201).json({
            success: true,
            message: 'Message envoyé.',
            data: {
                message: {
                    _id: message._id,
                    conversation: message.conversation,
                    sender: userId,
                    senderRole: userRole,
                    content,
                    isRead: false,
                    createdAt: message.createdAt
                }
            }
        });

    } catch (error) {
        console.error('Erreur sendMessage:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi du message.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// COMMUN : Polling nouveaux messages
// ============================================

/**
 * Récupère les nouveaux messages depuis une date (pour polling)
 * @route GET /api/chat/conversations/:id/poll?since=ISO_DATE
 * @access CLIENT, BOUTIQUE (participant uniquement)
 */
const pollMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;
        const { since } = req.query;

        // Récupérer la conversation
        const conversation = await Conversation.findById(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation non trouvée.'
            });
        }

        // Vérifier que l'utilisateur est participant
        const isParticipant = 
            (userRole === 'CLIENT' && conversation.client.equals(userId)) ||
            (userRole === 'BOUTIQUE' && conversation.boutique.equals(userId));

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé.'
            });
        }

        // Récupérer les nouveaux messages
        const messages = await Message.getNewMessages(id, since);

        // Marquer comme lus si des messages de l'autre partie
        if (messages.length > 0) {
            const hasNewFromOther = messages.some(m => m.senderRole !== userRole);
            if (hasNewFromOther) {
                await Message.markAllAsRead(id, userRole);
                await conversation.markAsRead(userRole);
            }
        }

        res.status(200).json({
            success: true,
            data: {
                messages,
                serverTime: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erreur pollMessages:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du polling.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// COMMUN : Marquer comme lu
// ============================================

/**
 * Marque tous les messages d'une conversation comme lus
 * @route PUT /api/chat/conversations/:id/read
 * @access CLIENT, BOUTIQUE (participant uniquement)
 */
const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { id } = req.params;

        // Récupérer la conversation
        const conversation = await Conversation.findById(id);

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation non trouvée.'
            });
        }

        // Vérifier que l'utilisateur est participant
        const isParticipant = 
            (userRole === 'CLIENT' && conversation.client.equals(userId)) ||
            (userRole === 'BOUTIQUE' && conversation.boutique.equals(userId));

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé.'
            });
        }

        // Marquer comme lu
        await Message.markAllAsRead(id, userRole);
        await conversation.markAsRead(userRole);

        res.status(200).json({
            success: true,
            message: 'Messages marqués comme lus.'
        });

    } catch (error) {
        console.error('Erreur markAsRead:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du marquage.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// COMMUN : Recherche dans les conversations
// ============================================

/**
 * Recherche dans les messages des conversations de l'utilisateur
 * @route GET /api/chat/conversations/search?q=xxx
 * @access CLIENT, BOUTIQUE
 */
const searchConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { q, page = 1, limit = 20 } = req.query;

        // Rechercher dans les messages
        const results = await Message.searchInConversations(userId, userRole, q);

        // Paginer les résultats
        const startIndex = (page - 1) * limit;
        const paginatedResults = results.slice(startIndex, startIndex + parseInt(limit));

        // Regrouper par conversation
        const groupedResults = {};
        for (const result of paginatedResults) {
            const convId = result.conversation._id.toString();
            if (!groupedResults[convId]) {
                groupedResults[convId] = {
                    conversation: result.conversation,
                    matches: []
                };
            }
            groupedResults[convId].matches.push({
                messageId: result._id,
                content: result.content,
                senderRole: result.senderRole,
                createdAt: result.createdAt
            });
        }

        res.status(200).json({
            success: true,
            message: `${results.length} résultat(s) trouvé(s).`,
            data: {
                results: Object.values(groupedResults),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: results.length,
                    totalPages: Math.ceil(results.length / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur searchConversations:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    // Client
    startConversation,
    
    // Commun
    getConversations,
    getUnreadCount,
    getConversation,
    sendMessage,
    pollMessages,
    markAsRead,
    searchConversations
};