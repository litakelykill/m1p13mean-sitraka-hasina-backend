/**
 * Message Model
 * 
 * Représente un message dans une conversation
 * Le contenu est chiffré avec AES-256-GCM
 * 
 * @module models/Message
 */

const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const messageSchema = new mongoose.Schema({
    // Référence à la conversation
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: [true, 'La conversation est requise'],
        index: true
    },

    // Expéditeur
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'L\'expéditeur est requis']
    },
    senderRole: {
        type: String,
        enum: ['CLIENT', 'BOUTIQUE'],
        required: [true, 'Le rôle de l\'expéditeur est requis']
    },

    // Contenu chiffré
    encryptedContent: {
        type: String,
        required: [true, 'Le contenu est requis']
    },
    iv: {
        type: String,
        required: [true, 'Le vecteur d\'initialisation est requis']
    },
    authTag: {
        type: String,
        required: [true, 'Le tag d\'authentification est requis']
    },

    // Statut de lecture
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    },

    // Suppression douce
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

// ============================================
// INDEX
// ============================================

// Index pour récupérer les messages d'une conversation (triés par date)
messageSchema.index({ conversation: 1, createdAt: -1 });

// Index pour les messages non lus
messageSchema.index({ conversation: 1, isRead: 1 });

// Index composé pour optimiser les requêtes de polling
messageSchema.index({ conversation: 1, createdAt: 1, isDeleted: 1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * Contenu déchiffré du message (virtual)
 * Ne pas stocker en BDD, calculé à la volée
 */
messageSchema.virtual('content').get(function () {
    try {
        return decrypt(this.encryptedContent, this.iv, this.authTag);
    } catch (error) {
        console.error('Erreur déchiffrement message:', error.message);
        return '[Message illisible]';
    }
});

// ============================================
// METHODS
// ============================================

/**
 * Marque le message comme lu
 */
messageSchema.methods.markAsRead = async function () {
    if (!this.isRead) {
        this.isRead = true;
        this.readAt = new Date();
        await this.save();
    }
};

/**
 * Supprime le message (soft delete)
 * @param {ObjectId} userId - ID de l'utilisateur qui supprime
 */
messageSchema.methods.softDelete = async function (userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
};

// ============================================
// STATICS
// ============================================

/**
 * Crée un message avec contenu chiffré
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {ObjectId} senderId - ID de l'expéditeur
 * @param {string} senderRole - CLIENT ou BOUTIQUE
 * @param {string} content - Contenu en clair (sera chiffré)
 * @returns {Object} - Message créé
 */
messageSchema.statics.createEncrypted = async function (conversationId, senderId, senderRole, content) {
    // Chiffrer le contenu
    const { encrypted, iv, authTag } = encrypt(content);

    // Créer le message
    const message = await this.create({
        conversation: conversationId,
        sender: senderId,
        senderRole,
        encryptedContent: encrypted,
        iv,
        authTag
    });

    return message;
};

/**
 * Récupère les messages d'une conversation avec pagination
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {Object} options - { page, limit, before }
 * @returns {Array} - Liste des messages
 */
messageSchema.statics.getByConversation = async function (conversationId, options = {}) {
    const { page = 1, limit = 50, before = null } = options;

    const query = {
        conversation: conversationId,
        isDeleted: false
    };

    // Pour le chargement de messages plus anciens
    if (before) {
        query.createdAt = { $lt: new Date(before) };
    }

    const messages = await this.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sender', 'nom prenom avatar avatarUrl boutique.nomBoutique boutique.logoUrl')
        .lean();

    // Déchiffrer chaque message
    return messages.map(msg => {
        try {
            const content = decrypt(msg.encryptedContent, msg.iv, msg.authTag);
            return {
                _id: msg._id,
                conversation: msg.conversation,
                sender: msg.sender,
                senderRole: msg.senderRole,
                content,
                isRead: msg.isRead,
                readAt: msg.readAt,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt
            };
        } catch (error) {
            return {
                _id: msg._id,
                conversation: msg.conversation,
                sender: msg.sender,
                senderRole: msg.senderRole,
                content: '[Message illisible]',
                isRead: msg.isRead,
                readAt: msg.readAt,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt
            };
        }
    }).reverse(); // Remettre dans l'ordre chronologique
};

/**
 * Récupère les nouveaux messages depuis une date (polling)
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {Date} since - Date depuis laquelle chercher
 * @returns {Array} - Nouveaux messages
 */
messageSchema.statics.getNewMessages = async function (conversationId, since) {
    const messages = await this.find({
        conversation: conversationId,
        createdAt: { $gt: new Date(since) },
        isDeleted: false
    })
        .sort({ createdAt: 1 })
        .populate('sender', 'nom prenom avatar avatarUrl boutique.nomBoutique boutique.logoUrl')
        .lean();

    // Déchiffrer chaque message
    return messages.map(msg => {
        try {
            const content = decrypt(msg.encryptedContent, msg.iv, msg.authTag);
            return {
                _id: msg._id,
                conversation: msg.conversation,
                sender: msg.sender,
                senderRole: msg.senderRole,
                content,
                isRead: msg.isRead,
                readAt: msg.readAt,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt
            };
        } catch (error) {
            return {
                _id: msg._id,
                conversation: msg.conversation,
                sender: msg.sender,
                senderRole: msg.senderRole,
                content: '[Message illisible]',
                isRead: msg.isRead,
                readAt: msg.readAt,
                createdAt: msg.createdAt,
                updatedAt: msg.updatedAt
            };
        }
    });
};

/**
 * Marque tous les messages comme lus pour un utilisateur dans une conversation
 * @param {ObjectId} conversationId - ID de la conversation
 * @param {string} readerRole - Rôle du lecteur (CLIENT ou BOUTIQUE)
 */
messageSchema.statics.markAllAsRead = async function (conversationId, readerRole) {
    // Marquer comme lus les messages de l'autre partie
    const senderRole = readerRole === 'CLIENT' ? 'BOUTIQUE' : 'CLIENT';

    await this.updateMany(
        {
            conversation: conversationId,
            senderRole,
            isRead: false
        },
        {
            $set: {
                isRead: true,
                readAt: new Date()
            }
        }
    );
};

/**
 * Recherche dans les messages d'un utilisateur
 * @param {ObjectId} userId - ID de l'utilisateur
 * @param {string} role - CLIENT ou BOUTIQUE
 * @param {string} searchTerm - Terme de recherche
 * @returns {Array} - Conversations avec messages correspondants
 */
messageSchema.statics.searchInConversations = async function (userId, role, searchTerm) {
    const Conversation = mongoose.model('Conversation');

    // Trouver les conversations de l'utilisateur
    const conversationQuery = role === 'CLIENT'
        ? { client: userId, isActive: true }
        : { boutique: userId, isActive: true };

    const conversations = await Conversation.find(conversationQuery).select('_id');
    const conversationIds = conversations.map(c => c._id);

    // Récupérer tous les messages de ces conversations
    const messages = await this.find({
        conversation: { $in: conversationIds },
        isDeleted: false
    })
        .populate('conversation')
        .sort({ createdAt: -1 })
        .lean();

    // Filtrer par contenu déchiffré
    const searchLower = searchTerm.toLowerCase();
    const matchingMessages = [];

    for (const msg of messages) {
        try {
            const content = decrypt(msg.encryptedContent, msg.iv, msg.authTag);
            if (content.toLowerCase().includes(searchLower)) {
                matchingMessages.push({
                    _id: msg._id,
                    conversation: msg.conversation,
                    content,
                    senderRole: msg.senderRole,
                    createdAt: msg.createdAt
                });
            }
        } catch (error) {
            // Ignorer les messages illisibles
        }
    }

    return matchingMessages;
};

// Activer les virtuals dans JSON
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);