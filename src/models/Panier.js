/**
 * Panier Model
 * 
 * Modele pour le panier d'achat des clients
 * 
 * @module models/Panier
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @desc Schema pour un item dans le panier
 */
const itemPanierSchema = new Schema({
    produit: {
        type: Schema.Types.ObjectId,
        ref: 'Produit',
        required: [true, 'Le produit est requis']
    },
    quantite: {
        type: Number,
        required: [true, 'La quantite est requise'],
        min: [1, 'La quantite minimum est 1']
    },
    prixUnitaire: {
        type: Number,
        required: true,
        min: 0
    },
    prixPromo: {
        type: Number,
        default: null
    },
    ajouteLe: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

/**
 * @desc Schema du panier
 */
const panierSchema = new Schema({
    client: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Le client est requis'],
        unique: true
    },
    items: {
        type: [itemPanierSchema],
        default: []
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * @desc Index pour trier les paniers par date de mise a jour (utile pour les operations de nettoyage)
 */
panierSchema.index({ updatedAt: 1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * @desc Nombre d'items differents dans le panier
 */
panierSchema.virtual('itemsCount').get(function () {
    return this.items.length;
});

/**
 * @desc Nombre total d'articles (somme des quantites)
 */
panierSchema.virtual('totalArticles').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantite, 0);
});

// ============================================
// METHODES D'INSTANCE
// ============================================

/**
 * @desc Ajouter ou mettre a jour un item dans le panier
 * @param {ObjectId} produitId - ID du produit a ajouter
 * @param {Number} quantite - Quantite a ajouter
 * @param {Number} prixUnitaire - Prix unitaire du produit
 * @param {Number|null} prixPromo - Prix promotionnel du produit (optionnel)
 * @return {Panier} Le panier mis a jour
 */
panierSchema.methods.addItem = function (produitId, quantite, prixUnitaire, prixPromo = null) {
    const existingIndex = this.items.findIndex(
        item => item.produit.toString() === produitId.toString()
    );

    if (existingIndex > -1) {
        // Mettre a jour la quantite
        this.items[existingIndex].quantite += quantite;
        this.items[existingIndex].prixUnitaire = prixUnitaire;
        this.items[existingIndex].prixPromo = prixPromo;
    } else {
        // Ajouter nouvel item
        this.items.push({
            produit: produitId,
            quantite,
            prixUnitaire,
            prixPromo,
            ajouteLe: new Date()
        });
    }

    return this;
};

/**
 * @desc Mettre a jour la quantite d'un item
 * @param {ObjectId} produitId - ID du produit a mettre a jour
 * @param {Number} quantite - Nouvelle quantite
 * @return {Panier|null} Le panier mis a jour ou null si l'item n'existe pas
 */
panierSchema.methods.updateItemQuantite = function (produitId, quantite) {
    const existingIndex = this.items.findIndex(
        item => item.produit.toString() === produitId.toString()
    );

    if (existingIndex === -1) {
        return null;
    }

    if (quantite <= 0) {
        // Retirer l'item
        this.items.splice(existingIndex, 1);
    } else {
        this.items[existingIndex].quantite = quantite;
    }

    return this;
};

/**
 * @desc Retirer un item du panier
 * @param {ObjectId} produitId - ID du produit a retirer
 * @return {Panier|null} Le panier mis a jour ou null si l'item n'existe pas
 */
panierSchema.methods.removeItem = function (produitId) {
    const existingIndex = this.items.findIndex(
        item => item.produit.toString() === produitId.toString()
    );

    if (existingIndex === -1) {
        return null;
    }

    this.items.splice(existingIndex, 1);
    return this;
};

/**
 * @desc Vider le panier
 * @return {Panier} Le panier vide
 */
panierSchema.methods.clear = function () {
    this.items = [];
    return this;
};

/**
 * @desc Verifier si un produit est dans le panier
 * @param {ObjectId} produitId - ID du produit
 * @returns {Boolean} Vrai si le produit est dans le panier, faux sinon
 */
panierSchema.methods.hasItem = function (produitId) {
    return this.items.some(
        item => item.produit.toString() === produitId.toString()
    );
};

/**
 * @desc Obtenir un item par produitId
 * @param {ObjectId} produitId - ID du produit
 * @returns {Object|null} Item du panier ou null si non trouve
 */
panierSchema.methods.getItem = function (produitId) {
    return this.items.find(
        item => item.produit.toString() === produitId.toString()
    );
};

// ============================================
// METHODES STATIQUES
// ============================================

/**
 * @desc Trouver ou creer le panier d'un client
 * @param {ObjectId} clientId - ID du client
 * @returns {Promise<Panier>} Panier du client
 */
panierSchema.statics.findOrCreateByClient = async function (clientId) {
    let panier = await this.findOne({ client: clientId });

    if (!panier) {
        panier = await this.create({ client: clientId, items: [] });
    }

    return panier;
};

/**
 * @desc Obtenir le panier avec les produits peuples
 * @param {ObjectId} clientId - ID du client
 * @returns {Promise<Panier>} Panier peuple avec details des produits
 */
panierSchema.statics.findByClientPopulated = async function (clientId) {
    return this.findOne({ client: clientId })
        .populate({
            path: 'items.produit',
            select: 'nom slug prix prixPromo enPromo stock imagePrincipale images isActive boutique categorie',
            populate: [
                {
                    path: 'boutique',
                    select: 'boutique.nomBoutique boutique.logo boutique.isValidated isActive'
                },
                {
                    path: 'categorie',
                    select: 'nom slug'
                }
            ]
        });
};

const Panier = mongoose.model('Panier', panierSchema);

module.exports = Panier;