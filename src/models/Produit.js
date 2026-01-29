/**
 * Produit Model
 * 
 * Modele pour les produits des boutiques
 * 
 * @module models/Produit
 */

const mongoose = require('mongoose');

/** 
 * @desc Generer un slug a partir d'un texte
 * @param {String} text 
 * @returns {String} slug
 */
const generateSlug = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ñ]/g, 'n')
        .replace(/[ç]/g, 'c')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

/**
 * @desc Schema Mongoose pour les produits
 */
const produitSchema = new mongoose.Schema({
    // Informations de base
    nom: {
        type: String,
        required: [true, 'Le nom du produit est requis'],
        trim: true,
        maxlength: [200, 'Le nom ne peut pas depasser 200 caracteres']
    },
    slug: {
        type: String,
        lowercase: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [2000, 'La description ne peut pas depasser 2000 caracteres']
    },

    // Prix
    prix: {
        type: Number,
        required: [true, 'Le prix est requis'],
        min: [0, 'Le prix ne peut pas etre negatif']
    },
    prixPromo: {
        type: Number,
        default: null,
        min: [0, 'Le prix promo ne peut pas etre negatif']
    },
    enPromo: {
        type: Boolean,
        default: false
    },

    // Stock
    stock: {
        type: Number,
        required: [true, 'Le stock est requis'],
        min: [0, 'Le stock ne peut pas etre negatif'],
        default: 0
    },
    seuilAlerte: {
        type: Number,
        default: 5,
        min: [0, 'Le seuil d\'alerte ne peut pas etre negatif']
    },

    // Images
    imagePrincipale: {
        type: String,
        default: null
    },
    images: [{
        type: String
    }],

    // Relations
    boutique: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'La boutique est requise']
    },
    categorie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categorie',
        default: null
    },

    // Statut
    isActive: {
        type: Boolean,
        default: true
    },

    // Statistiques
    vues: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * @desc Index pour optimiser les recherches
 */
produitSchema.index({ boutique: 1, isActive: 1 });
produitSchema.index({ categorie: 1 });
produitSchema.index({ boutique: 1, slug: 1 });
produitSchema.index({ nom: 'text', description: 'text' });
produitSchema.index({ prix: 1 });
produitSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

// Stock faible
produitSchema.virtual('stockFaible').get(function () {
    return this.stock <= this.seuilAlerte;
});

// En rupture
produitSchema.virtual('enRupture').get(function () {
    return this.stock === 0;
});

// Prix actuel (promo ou normal)
produitSchema.virtual('prixActuel').get(function () {
    if (this.enPromo && this.prixPromo !== null && this.prixPromo < this.prix) {
        return this.prixPromo;
    }
    return this.prix;
});

// Pourcentage reduction
produitSchema.virtual('pourcentageReduction').get(function () {
    if (this.enPromo && this.prixPromo !== null && this.prixPromo < this.prix) {
        return Math.round(((this.prix - this.prixPromo) / this.prix) * 100);
    }
    return 0;
});

/**
 * @desc Middleware pre 'save' pour generer le slug avant sauvegarde
 */
produitSchema.pre('save', function () {
    if (this.isModified('nom') || !this.slug) {
        const timestamp = Date.now().toString(36);
        this.slug = `${generateSlug(this.nom)}-${timestamp}`;
    }

    // Desactiver promo si prix promo invalide
    if (this.prixPromo === null || this.prixPromo >= this.prix) {
        this.enPromo = false;
    }
});

// ============================================
// METHODES STATIQUES
// ============================================

/**
 * @desc Trouver les produits d'une boutique
 * @param {String} boutiqueId 
 * @param {Object} options
 */
produitSchema.statics.findByBoutique = function (boutiqueId, options = {}) {
    const query = { boutique: boutiqueId };
    if (options.activeOnly) {
        query.isActive = true;
    }
    return this.find(query).sort({ createdAt: -1 });
};

/**
 * @desc Trouver les produits avec stock faible dans une boutique
 * @param {String} boutiqueId 
 */
produitSchema.statics.findStockFaible = function (boutiqueId) {
    return this.find({
        boutique: boutiqueId,
        $expr: { $lte: ['$stock', '$seuilAlerte'] }
    }).sort({ stock: 1 });
};

/**
 * @desc Trouver les produits d'une categorie active
 * @param {String} categorieId 
 */
produitSchema.statics.findByCategorie = function (categorieId) {
    return this.find({ categorie: categorieId, isActive: true }).sort({ createdAt: -1 });
};

// ============================================
// METHODES D'INSTANCE
// ============================================

/**
 * @desc Retourner le produit avec URLs completes pour les images
 * @param {Object} req - Requete Express pour obtenir le host
 */
produitSchema.methods.toJSONWithUrls = function (req) {
    const produit = this.toObject();
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (produit.imagePrincipale) {
        produit.imagePrincipaleUrl = `${baseUrl}/uploads/produits/${produit.imagePrincipale}`;
    } else {
        produit.imagePrincipaleUrl = null;
    }

    if (produit.images && produit.images.length > 0) {
        produit.imagesUrls = produit.images.map(img => `${baseUrl}/uploads/produits/${img}`);
    } else {
        produit.imagesUrls = [];
    }

    return produit;
};

const Produit = mongoose.model('Produit', produitSchema);

module.exports = Produit;