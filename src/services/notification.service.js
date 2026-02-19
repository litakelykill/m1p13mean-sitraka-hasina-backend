/**
 * Notification Service
 * 
 * Service centralisé pour la création et gestion des notifications
 * Utilisé par les autres controllers pour déclencher des notifications
 * 
 * Icônes: Noms compatibles avec Lucide Icons (lucide-react, lucide-angular)
 * https://lucide.dev/icons/
 * 
 * @module services/notification.service
 */

const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../models/Notification');

// ============================================
// TEMPLATES DE NOTIFICATIONS
// ============================================
const TEMPLATES = {
    // ==========================================
    // COMMANDES
    // ==========================================
    [NOTIFICATION_TYPES.NOUVELLE_COMMANDE]: (data) => ({
        titre: 'Nouvelle commande reçue',
        message: `Commande #${data.numeroCommande} - ${data.totalItems} article(s) pour ${data.montant.toLocaleString()} Ar`,
        icone: 'shopping-cart',
        lien: `/boutique/commandes/${data.commandeId}`,
        priorite: 'haute'
    }),

    [NOTIFICATION_TYPES.COMMANDE_CONFIRMEE]: (data) => ({
        titre: 'Commande confirmée',
        message: `Votre commande #${data.numeroCommande} a été confirmée par ${data.nomBoutique}`,
        icone: 'check-circle',
        lien: `/client/commandes/${data.commandeId}`,
        priorite: 'normale'
    }),

    [NOTIFICATION_TYPES.COMMANDE_EN_PREPARATION]: (data) => ({
        titre: 'Commande en préparation',
        message: `Votre commande #${data.numeroCommande} est en cours de préparation chez ${data.nomBoutique}`,
        icone: 'package',
        lien: `/client/commandes/${data.commandeId}`,
        priorite: 'normale'
    }),

    [NOTIFICATION_TYPES.COMMANDE_EXPEDIEE]: (data) => ({
        titre: 'Commande expédiée',
        message: `Votre commande #${data.numeroCommande} a été expédiée par ${data.nomBoutique}`,
        icone: 'truck',
        lien: `/client/commandes/${data.commandeId}`,
        priorite: 'haute'
    }),

    [NOTIFICATION_TYPES.COMMANDE_LIVREE]: (data) => ({
        titre: 'Commande livrée',
        message: `Votre commande #${data.numeroCommande} a été livrée. N'oubliez pas de laisser un avis !`,
        icone: 'gift',
        lien: `/client/commandes/${data.commandeId}`,
        priorite: 'normale'
    }),

    [NOTIFICATION_TYPES.COMMANDE_ANNULEE]: (data) => ({
        titre: 'Commande annulée',
        message: `La commande #${data.numeroCommande} a été annulée${data.raison ? ` : ${data.raison}` : ''}`,
        icone: 'x-circle',
        lien: data.lien || `/client/commandes/${data.commandeId}`,
        priorite: 'haute'
    }),

    // ==========================================
    // AVIS
    // ==========================================
    [NOTIFICATION_TYPES.NOUVEL_AVIS]: (data) => ({
        titre: 'Nouvel avis reçu',
        message: `${data.clientNom} a laissé un avis ${data.note}★ sur votre boutique`,
        icone: 'star',
        lien: `/boutique/avis`,
        priorite: 'normale'
    }),

    [NOTIFICATION_TYPES.REPONSE_AVIS]: (data) => ({
        titre: 'Réponse à votre avis',
        message: `${data.nomBoutique} a répondu à votre avis`,
        icone: 'message-circle',
        lien: `/client/commandes/${data.commandeId}`,
        priorite: 'normale'
    }),

    [NOTIFICATION_TYPES.AVIS_MODERE]: (data) => ({
        titre: 'Avis modéré',
        message: `Votre avis a été modéré par l'administrateur${data.raison ? ` : ${data.raison}` : ''}`,
        icone: 'shield',
        lien: null,
        priorite: 'normale'
    }),

    // ==========================================
    // BOUTIQUE
    // ==========================================
    [NOTIFICATION_TYPES.BOUTIQUE_VALIDEE]: (data) => ({
        titre: 'Boutique validée !',
        message: `Félicitations ! Votre boutique "${data.nomBoutique}" a été validée. Vous pouvez maintenant ajouter vos produits.`,
        icone: 'store',
        lien: '/boutique/dashboard',
        priorite: 'haute'
    }),

    [NOTIFICATION_TYPES.BOUTIQUE_REJETEE]: (data) => ({
        titre: 'Demande de boutique refusée',
        message: `Votre demande pour "${data.nomBoutique}" a été refusée${data.raison ? ` : ${data.raison}` : ''}`,
        icone: 'frown',
        lien: '/boutique/profil',
        priorite: 'haute'
    }),

    [NOTIFICATION_TYPES.BOUTIQUE_SUSPENDUE]: (data) => ({
        titre: 'Boutique suspendue',
        message: `Votre boutique a été suspendue${data.raison ? ` : ${data.raison}` : ''}. Contactez l'administrateur.`,
        icone: 'alert-triangle',
        lien: null,
        priorite: 'urgente'
    }),

    // ==========================================
    // STOCK
    // ==========================================
    [NOTIFICATION_TYPES.STOCK_BAS]: (data) => ({
        titre: 'Stock bas',
        message: `Le produit "${data.nomProduit}" n'a plus que ${data.stock} unité(s) en stock`,
        icone: 'trending-down',
        lien: `/boutique/produits/${data.produitId}/edit`,
        priorite: 'haute'
    }),

    [NOTIFICATION_TYPES.RUPTURE_STOCK]: (data) => ({
        titre: 'Rupture de stock',
        message: `Le produit "${data.nomProduit}" est en rupture de stock`,
        icone: 'alert-octagon',
        lien: `/boutique/produits/${data.produitId}/edit`,
        priorite: 'urgente'
    }),

    // ==========================================
    // CHAT (NOUVEAU)
    // ==========================================
    [NOTIFICATION_TYPES.NOUVEAU_MESSAGE]: (data) => ({
        titre: data.titre || 'Nouveau message',
        message: data.message || 'Vous avez reçu un nouveau message',
        icone: 'message-square',
        lien: data.lien || null,
        priorite: 'normale'
    }),

    // ==========================================
    // SYSTÈME
    // ==========================================
    [NOTIFICATION_TYPES.BIENVENUE]: (data) => ({
        titre: 'Bienvenue !',
        message: `Bienvenue sur Centre Commercial ${data.prenom} ! Découvrez nos boutiques et produits.`,
        icone: 'smile',
        lien: '/',
        priorite: 'normale'
    }),

    [NOTIFICATION_TYPES.PROMOTION]: (data) => ({
        titre: data.titre || 'Promotion spéciale',
        message: data.message,
        icone: 'tag',
        lien: data.lien || '/produits',
        priorite: 'normale',
        expireLe: data.expireLe || null
    }),

    [NOTIFICATION_TYPES.ANNONCE]: (data) => ({
        titre: data.titre || 'Annonce',
        message: data.message,
        icone: 'megaphone',
        lien: data.lien || null,
        priorite: data.priorite || 'normale'
    })
};

class NotificationService {

    /**
     * Créer une notification à partir d'un template
     * @param {string} type - Type de notification (NOTIFICATION_TYPES)
     * @param {ObjectId} destinataireId - ID du destinataire
     * @param {Object} data - Données pour le template
     * @param {Object} options - Options supplémentaires (entiteType, entiteId, expireLe)
     * @returns {Object|null} - Notification créée ou null en cas d'erreur
     */
    static async notify(type, destinataireId, data = {}, options = {}) {
        try {
            const template = TEMPLATES[type];

            if (!template) {
                console.error(`Template de notification inconnu: ${type}`);
                return null;
            }

            const templateData = template(data);

            const notification = await Notification.creer({
                destinataire: destinataireId,
                type,
                titre: templateData.titre,
                message: templateData.message,
                icone: templateData.icone,
                lien: templateData.lien,
                priorite: templateData.priorite || 'normale',
                expireLe: templateData.expireLe || options.expireLe || null,
                metadata: {
                    entiteType: options.entiteType || null,
                    entiteId: options.entiteId || null,
                    extra: data
                }
            });

            return notification;
        } catch (error) {
            console.error('Erreur création notification:', error);
            return null;
        }
    }

    /**
     * Notifier plusieurs destinataires avec le même message
     * @param {string} type - Type de notification
     * @param {Array} destinatairesIds - Liste des IDs destinataires
     * @param {Object} data - Données pour le template
     * @param {Object} options - Options supplémentaires
     * @returns {Array} - Liste des notifications créées
     */
    static async notifyMultiple(type, destinatairesIds, data = {}, options = {}) {
        try {
            const template = TEMPLATES[type];

            if (!template) {
                console.error(`Template de notification inconnu: ${type}`);
                return [];
            }

            const templateData = template(data);

            const notifications = destinatairesIds.map(destinataireId => ({
                destinataire: destinataireId,
                type,
                titre: templateData.titre,
                message: templateData.message,
                icone: templateData.icone,
                lien: templateData.lien,
                priorite: templateData.priorite || 'normale',
                expireLe: templateData.expireLe || options.expireLe || null,
                metadata: {
                    entiteType: options.entiteType || null,
                    entiteId: options.entiteId || null,
                    extra: data
                }
            }));

            return await Notification.creerMultiple(notifications);
        } catch (error) {
            console.error('Erreur création notifications multiples:', error);
            return [];
        }
    }

    // ==========================================
    // RACCOURCIS POUR COMMANDES
    // ==========================================

    /**
     * Notifier une nouvelle commande (pour la boutique)
     */
    static async notifierNouvelleCommande(boutiqueUserId, commande, sousCommande) {
        return this.notify(
            NOTIFICATION_TYPES.NOUVELLE_COMMANDE,
            boutiqueUserId,
            {
                commandeId: commande._id,
                numeroCommande: commande.numero,
                totalItems: sousCommande.items.reduce((acc, item) => acc + item.quantite, 0),
                montant: sousCommande.sousTotal
            },
            { entiteType: 'commande', entiteId: commande._id }
        );
    }

    /**
     * Notifier un changement de statut de commande (pour le client)
     */
    static async notifierStatutCommande(clientId, commande, nouveauStatut, nomBoutique, raison = null) {
        const typeMap = {
            'confirmee': NOTIFICATION_TYPES.COMMANDE_CONFIRMEE,
            'en_preparation': NOTIFICATION_TYPES.COMMANDE_EN_PREPARATION,
            'expediee': NOTIFICATION_TYPES.COMMANDE_EXPEDIEE,
            'livree': NOTIFICATION_TYPES.COMMANDE_LIVREE,
            'annulee': NOTIFICATION_TYPES.COMMANDE_ANNULEE
        };

        const type = typeMap[nouveauStatut];
        if (!type) return null;

        return this.notify(
            type,
            clientId,
            {
                commandeId: commande._id,
                numeroCommande: commande.numero,
                nomBoutique,
                raison
            },
            { entiteType: 'commande', entiteId: commande._id }
        );
    }

    // ==========================================
    // RACCOURCIS POUR AVIS
    // ==========================================

    /**
     * Notifier un nouvel avis (pour la boutique)
     */
    static async notifierNouvelAvis(boutiqueUserId, avis, clientNom) {
        return this.notify(
            NOTIFICATION_TYPES.NOUVEL_AVIS,
            boutiqueUserId,
            {
                avisId: avis._id,
                clientNom,
                note: avis.note,
                commentaire: avis.commentaire?.substring(0, 50)
            },
            { entiteType: 'avis', entiteId: avis._id }
        );
    }

    /**
     * Notifier une réponse à un avis (pour le client)
     */
    static async notifierReponseAvis(clientId, avis, nomBoutique) {
        return this.notify(
            NOTIFICATION_TYPES.REPONSE_AVIS,
            clientId,
            {
                avisId: avis._id,
                nomBoutique,
                commandeId: avis.commande
            },
            { entiteType: 'avis', entiteId: avis._id }
        );
    }

    // ==========================================
    // RACCOURCIS POUR BOUTIQUE
    // ==========================================

    /**
     * Notifier validation de boutique
     */
    static async notifierBoutiqueValidee(boutiqueUserId, nomBoutique) {
        return this.notify(
            NOTIFICATION_TYPES.BOUTIQUE_VALIDEE,
            boutiqueUserId,
            { nomBoutique },
            { entiteType: 'boutique', entiteId: boutiqueUserId }
        );
    }

    /**
     * Notifier rejet de boutique
     */
    static async notifierBoutiqueRejetee(boutiqueUserId, nomBoutique, raison = null) {
        return this.notify(
            NOTIFICATION_TYPES.BOUTIQUE_REJETEE,
            boutiqueUserId,
            { nomBoutique, raison },
            { entiteType: 'boutique', entiteId: boutiqueUserId }
        );
    }

    // ==========================================
    // RACCOURCIS POUR STOCK
    // ==========================================

    /**
     * Notifier stock bas
     */
    static async notifierStockBas(boutiqueUserId, produit) {
        return this.notify(
            NOTIFICATION_TYPES.STOCK_BAS,
            boutiqueUserId,
            {
                produitId: produit._id,
                nomProduit: produit.nom,
                stock: produit.stock
            },
            { entiteType: 'produit', entiteId: produit._id }
        );
    }

    /**
     * Notifier rupture de stock
     */
    static async notifierRuptureStock(boutiqueUserId, produit) {
        return this.notify(
            NOTIFICATION_TYPES.RUPTURE_STOCK,
            boutiqueUserId,
            {
                produitId: produit._id,
                nomProduit: produit.nom
            },
            { entiteType: 'produit', entiteId: produit._id }
        );
    }

    // ==========================================
    // RACCOURCIS POUR CHAT (NOUVEAU)
    // ==========================================

    /**
     * Notifier un nouveau message dans une conversation
     * @param {ObjectId} destinataireId - ID du destinataire
     * @param {Object} conversation - Conversation concernée
     * @param {string} messagePreview - Aperçu du message
     * @param {string} lien - Lien vers la conversation
     */
    static async notifierNouveauMessage(destinataireId, conversation, messagePreview, lien) {
        return this.notify(
            NOTIFICATION_TYPES.NOUVEAU_MESSAGE,
            destinataireId,
            {
                titre: 'Nouveau message',
                message: messagePreview,
                lien,
                conversationId: conversation._id
            },
            { entiteType: 'conversation', entiteId: conversation._id }
        );
    }

    // ==========================================
    // RACCOURCIS SYSTÈME
    // ==========================================

    /**
     * Notifier bienvenue (nouvel utilisateur)
     */
    static async notifierBienvenue(userId, prenom) {
        return this.notify(
            NOTIFICATION_TYPES.BIENVENUE,
            userId,
            { prenom }
        );
    }

    /**
     * Envoyer une annonce à tous les utilisateurs d'un type
     */
    static async envoyerAnnonce(destinatairesIds, titre, message, lien = null) {
        return this.notifyMultiple(
            NOTIFICATION_TYPES.ANNONCE,
            destinatairesIds,
            { titre, message, lien }
        );
    }
}

module.exports = NotificationService;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;