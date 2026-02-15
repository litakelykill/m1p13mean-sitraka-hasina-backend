/**
 * Notification Model
 * 
 * Modèle pour la gestion des notifications utilisateurs
 * 
 * Types de notifications :
 * - COMMANDE : Nouvelle commande, changement de statut, annulation
 * - AVIS : Nouvel avis, réponse à un avis
 * - BOUTIQUE : Validation/Rejet boutique, nouveau produit
 * - STOCK : Alerte stock bas, rupture de stock
 * - SYSTEME : Notifications système, promotions
 * 
 * @module models/Notification
 */

const mongoose = require('mongoose');

// ============================================
// TYPES DE NOTIFICATIONS
// ============================================
const NOTIFICATION_TYPES = {
    // Commandes
    NOUVELLE_COMMANDE: 'NOUVELLE_COMMANDE',           // Pour boutique
    COMMANDE_CONFIRMEE: 'COMMANDE_CONFIRMEE',         // Pour client
    COMMANDE_EN_PREPARATION: 'COMMANDE_EN_PREPARATION', // Pour client
    COMMANDE_EXPEDIEE: 'COMMANDE_EXPEDIEE',           // Pour client
    COMMANDE_LIVREE: 'COMMANDE_LIVREE',               // Pour client
    COMMANDE_ANNULEE: 'COMMANDE_ANNULEE',             // Pour client et boutique

    // Avis
    NOUVEL_AVIS: 'NOUVEL_AVIS',                       // Pour boutique
    REPONSE_AVIS: 'REPONSE_AVIS',                     // Pour client
    AVIS_MODERE: 'AVIS_MODERE',                       // Pour client (avis supprimé)

    // Boutique
    BOUTIQUE_VALIDEE: 'BOUTIQUE_VALIDEE',             // Pour boutique
    BOUTIQUE_REJETEE: 'BOUTIQUE_REJETEE',             // Pour boutique
    BOUTIQUE_SUSPENDUE: 'BOUTIQUE_SUSPENDUE',         // Pour boutique

    // Stock
    STOCK_BAS: 'STOCK_BAS',                           // Pour boutique
    RUPTURE_STOCK: 'RUPTURE_STOCK',                   // Pour boutique

    // Système
    BIENVENUE: 'BIENVENUE',                           // Pour nouvel utilisateur
    PROMOTION: 'PROMOTION',                           // Pour clients
    ANNONCE: 'ANNONCE'                                // Pour tous
};

// ============================================
// SCHEMA NOTIFICATION
// ============================================
const notificationSchema = new mongoose.Schema({
    // Destinataire
    destinataire: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Le destinataire est requis'],
        index: true
    },

    // Type de notification
    type: {
        type: String,
        enum: Object.values(NOTIFICATION_TYPES),
        required: [true, 'Le type de notification est requis'],
        index: true
    },

    // Titre court
    titre: {
        type: String,
        required: [true, 'Le titre est requis'],
        maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
    },

    // Message détaillé
    message: {
        type: String,
        required: [true, 'Le message est requis'],
        maxlength: [500, 'Le message ne peut pas dépasser 500 caractères']
    },

    // Icône (emoji ou classe d'icône)
    icone: {
        type: String,
        default: '🔔'
    },

    // Lien vers la ressource concernée
    lien: {
        type: String,
        default: null
    },

    // Données additionnelles (ID commande, ID produit, etc.)
    metadata: {
        entiteType: {
            type: String,
            enum: ['commande', 'produit', 'avis', 'boutique', 'user', null],
            default: null
        },
        entiteId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        extra: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },

    // Statut de lecture
    lu: {
        type: Boolean,
        default: false,
        index: true
    },

    // Date de lecture
    luLe: {
        type: Date,
        default: null
    },

    // Priorité (pour tri)
    priorite: {
        type: String,
        enum: ['basse', 'normale', 'haute', 'urgente'],
        default: 'normale'
    },

    // Expiration (notifications temporaires)
    expireLe: {
        type: Date,
        default: null
        // Index TTL défini plus bas avec expireAfterSeconds
    },

    // Notification supprimée (soft delete)
    supprime: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// ============================================
// INDEX COMPOSÉS
// ============================================
// Pour récupérer les notifications non lues d'un utilisateur
notificationSchema.index({ destinataire: 1, lu: 1, supprime: 1, createdAt: -1 });

// Pour nettoyer les notifications expirées
notificationSchema.index({ expireLe: 1 }, { expireAfterSeconds: 0 });

// ============================================
// MÉTHODES STATIQUES
// ============================================

/**
 * Créer une notification
 */
notificationSchema.statics.creer = async function (data) {
    return await this.create(data);
};

/**
 * Créer plusieurs notifications (pour envoi groupé)
 */
notificationSchema.statics.creerMultiple = async function (notifications) {
    return await this.insertMany(notifications);
};

/**
 * Récupérer les notifications d'un utilisateur
 */
notificationSchema.statics.pourUtilisateur = async function (userId, options = {}) {
    const {
        page = 1,
        limit = 20,
        nonLuesSeulement = false,
        type = null
    } = options;

    const query = {
        destinataire: userId,
        supprime: false
    };

    if (nonLuesSeulement) {
        query.lu = false;
    }

    if (type) {
        query.type = type;
    }

    // Exclure les notifications expirées
    query.$or = [
        { expireLe: null },
        { expireLe: { $gt: new Date() } }
    ];

    const [notifications, total] = await Promise.all([
        this.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        notifications,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Compter les notifications non lues
 */
notificationSchema.statics.compterNonLues = async function (userId) {
    return await this.countDocuments({
        destinataire: userId,
        lu: false,
        supprime: false,
        $or: [
            { expireLe: null },
            { expireLe: { $gt: new Date() } }
        ]
    });
};

/**
 * Marquer une notification comme lue
 */
notificationSchema.statics.marquerCommeLue = async function (notificationId, userId) {
    return await this.findOneAndUpdate(
        { _id: notificationId, destinataire: userId },
        { lu: true, luLe: new Date() },
        { new: true }
    );
};

/**
 * Marquer toutes les notifications comme lues
 */
notificationSchema.statics.marquerToutesCommeLues = async function (userId) {
    const result = await this.updateMany(
        { destinataire: userId, lu: false, supprime: false },
        { lu: true, luLe: new Date() }
    );
    return result.modifiedCount;
};

/**
 * Supprimer une notification (soft delete)
 */
notificationSchema.statics.supprimerNotification = async function (notificationId, userId) {
    return await this.findOneAndUpdate(
        { _id: notificationId, destinataire: userId },
        { supprime: true },
        { new: true }
    );
};

/**
 * Supprimer toutes les notifications lues
 */
notificationSchema.statics.supprimerLues = async function (userId) {
    const result = await this.updateMany(
        { destinataire: userId, lu: true, supprime: false },
        { supprime: true }
    );
    return result.modifiedCount;
};

// ============================================
// MÉTHODES D'INSTANCE
// ============================================

/**
 * Marquer comme lue
 */
notificationSchema.methods.marquerLue = async function () {
    this.lu = true;
    this.luLe = new Date();
    return await this.save();
};

/**
 * Transformer pour API
 */
notificationSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;