/**
 * Conversation Model
 * 
 * Représente une conversation entre un client et une boutique
 * Peut être liée à une commande (optionnel)
 * 
 * @module models/Conversation
 */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    // Participants
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Le client est requis']
    },
    boutique: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'La boutique est requise']
    },

    // Contexte (optionnel)
    commande: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Commande',
        default: null
    },
    sujet: {
        type: String,
        trim: true,
        maxlength: [200, 'Le sujet ne peut pas dépasser 200 caractères'],
        default: null
    },

    // Dernier message (aperçu)
    lastMessage: {
        content: { type: String, default: null }, // Texte tronqué non chiffré pour aperçu
        senderRole: { type: String, enum: ['CLIENT', 'BOUTIQUE'], default: null },
        createdAt: { type: Date, default: null }
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },

    // Compteurs de messages non lus
    clientUnreadCount: {
        type: Number,
        default: 0,
        min: 0
    },
    boutiqueUnreadCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // Statut
    isActive: {
        type: Boolean,
        default: true
    },
    closedAt: {
        type: Date,
        default: null
    },
    closedBy: {
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

// Index pour rechercher les conversations d'un client
conversationSchema.index({ client: 1, lastMessageAt: -1 });

// Index pour rechercher les conversations d'une boutique
conversationSchema.index({ boutique: 1, lastMessageAt: -1 });

// Index unique pour éviter les doublons client-boutique (sans commande)
conversationSchema.index(
    { client: 1, boutique: 1, commande: 1 },
    { unique: true, partialFilterExpression: { commande: { $eq: null } } }
);

// Index pour les conversations actives
conversationSchema.index({ isActive: 1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * Nombre total de messages non lus
 */
conversationSchema.virtual('totalUnreadCount').get(function () {
    return this.clientUnreadCount + this.boutiqueUnreadCount;
});

// ============================================
// METHODS
// ============================================

/**
 * Incrémente le compteur de messages non lus pour un rôle
 * @param {string} recipientRole - CLIENT ou BOUTIQUE
 */
conversationSchema.methods.incrementUnread = async function (recipientRole) {
    if (recipientRole === 'CLIENT') {
        this.clientUnreadCount += 1;
    } else if (recipientRole === 'BOUTIQUE') {
        this.boutiqueUnreadCount += 1;
    }
    await this.save();
};

/**
 * Remet à zéro le compteur de messages non lus pour un rôle
 * @param {string} role - CLIENT ou BOUTIQUE
 */
conversationSchema.methods.markAsRead = async function (role) {
    if (role === 'CLIENT') {
        this.clientUnreadCount = 0;
    } else if (role === 'BOUTIQUE') {
        this.boutiqueUnreadCount = 0;
    }
    await this.save();
};

/**
 * Met à jour l'aperçu du dernier message
 * @param {string} content - Contenu du message (sera tronqué)
 * @param {string} senderRole - CLIENT ou BOUTIQUE
 */
conversationSchema.methods.updateLastMessage = async function (content, senderRole) {
    // Tronquer le contenu pour l'aperçu (50 caractères max)
    const truncated = content.length > 50
        ? content.substring(0, 50) + '...'
        : content;

    this.lastMessage = {
        content: truncated,
        senderRole,
        createdAt: new Date()
    };
    this.lastMessageAt = new Date();
    await this.save();
};

// ============================================
// STATICS
// ============================================

/**
 * Trouve ou crée une conversation entre client et boutique
 * @param {ObjectId} clientId - ID du client
 * @param {ObjectId} boutiqueId - ID de la boutique
 * @param {ObjectId} commandeId - ID de la commande (optionnel)
 * @param {string} sujet - Sujet de la conversation (optionnel)
 * @returns {Object} - { conversation, isNew }
 */
conversationSchema.statics.findOrCreate = async function (clientId, boutiqueId, commandeId = null, sujet = null) {
    // Chercher conversation existante
    let conversation = await this.findOne({
        client: clientId,
        boutique: boutiqueId,
        commande: commandeId,
        isActive: true
    });

    if (conversation) {
        return { conversation, isNew: false };
    }

    // Créer nouvelle conversation
    conversation = await this.create({
        client: clientId,
        boutique: boutiqueId,
        commande: commandeId,
        sujet
    });

    return { conversation, isNew: true };
};

/**
 * Compte les conversations non lues pour un utilisateur
 * @param {ObjectId} userId - ID de l'utilisateur
 * @param {string} role - CLIENT ou BOUTIQUE
 * @returns {number} - Nombre de conversations avec messages non lus
 */
conversationSchema.statics.countUnreadConversations = async function (userId, role) {
    const query = { isActive: true };

    if (role === 'CLIENT') {
        query.client = userId;
        query.clientUnreadCount = { $gt: 0 };
    } else if (role === 'BOUTIQUE') {
        query.boutique = userId;
        query.boutiqueUnreadCount = { $gt: 0 };
    }

    return await this.countDocuments(query);
};

// Activer les virtuals dans JSON
conversationSchema.set('toJSON', { virtuals: true });
conversationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Conversation', conversationSchema);