/**
 * SearchHistory Model
 * 
 * Modèle pour l'historique de recherche des utilisateurs
 * 
 * @module models/SearchHistory
 */

const mongoose = require('mongoose');

// ============================================
// SCHEMA SEARCH HISTORY
// ============================================
const searchHistorySchema = new mongoose.Schema({
  // Utilisateur (null pour recherches anonymes)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  
  // Terme de recherche
  query: {
    type: String,
    required: [true, 'Le terme de recherche est requis'],
    trim: true,
    maxlength: [200, 'Le terme ne peut pas dépasser 200 caractères']
  },
  
  // Terme normalisé (lowercase, sans accents) pour regroupement
  queryNormalized: {
    type: String,
    index: true
  },
  
  // Type de recherche effectuée
  type: {
    type: String,
    enum: ['all', 'produits', 'boutiques'],
    default: 'all'
  },
  
  // Filtres appliqués
  filtres: {
    categorie: { type: mongoose.Schema.Types.ObjectId, default: null },
    prixMin: { type: Number, default: null },
    prixMax: { type: Number, default: null },
    enPromo: { type: Boolean, default: null }
  },
  
  // Résultats obtenus
  resultats: {
    totalProduits: { type: Number, default: 0 },
    totalBoutiques: { type: Number, default: 0 }
  },
  
  // Produit/Boutique cliqué après recherche (pour tracking)
  clickedItem: {
    type: { type: String, enum: ['produit', 'boutique', null], default: null },
    itemId: { type: mongoose.Schema.Types.ObjectId, default: null }
  },
  
  // Métadonnées
  ipAddress: {
    type: String,
    default: null
  },
  
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// ============================================
// INDEX
// ============================================
// Index pour recherche rapide par utilisateur
searchHistorySchema.index({ user: 1, createdAt: -1 });

// Index pour suggestions populaires
searchHistorySchema.index({ queryNormalized: 1, createdAt: -1 });

// TTL: Supprimer les recherches anonymes après 30 jours
searchHistorySchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 jours
    partialFilterExpression: { user: null }
  }
);

// ============================================
// PRE-SAVE: Normaliser le query
// ============================================
searchHistorySchema.pre('save', function() {
  if (this.query) {
    // Normaliser: lowercase, supprimer accents, trim
    this.queryNormalized = this.query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
});

// ============================================
// MÉTHODES STATIQUES
// ============================================

/**
 * Enregistrer une recherche
 */
searchHistorySchema.statics.enregistrer = async function(data) {
  return await this.create(data);
};

/**
 * Historique d'un utilisateur
 */
searchHistorySchema.statics.pourUtilisateur = async function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  
  const [recherches, total] = await Promise.all([
    this.find({ user: userId })
      .select('query type filtres resultats createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    this.countDocuments({ user: userId })
  ]);
  
  return {
    recherches,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * Recherches récentes uniques d'un utilisateur
 */
searchHistorySchema.statics.rechercheRecentesUniques = async function(userId, limit = 10) {
  const recherches = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $sort: { createdAt: -1 } },
    { 
      $group: {
        _id: '$queryNormalized',
        query: { $first: '$query' },
        type: { $first: '$type' },
        lastSearched: { $first: '$createdAt' }
      }
    },
    { $sort: { lastSearched: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        query: 1,
        type: 1,
        lastSearched: 1
      }
    }
  ]);
  
  return recherches;
};

/**
 * Suggestions populaires (basées sur toutes les recherches)
 */
searchHistorySchema.statics.suggestionsPopulaires = async function(prefix, limit = 10) {
  const prefixNormalized = prefix
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  const suggestions = await this.aggregate([
    {
      $match: {
        queryNormalized: { $regex: `^${prefixNormalized}`, $options: 'i' },
        'resultats.totalProduits': { $gt: 0 } // Seulement si résultats trouvés
      }
    },
    {
      $group: {
        _id: '$queryNormalized',
        query: { $first: '$query' },
        count: { $sum: 1 },
        avgResultats: { $avg: { $add: ['$resultats.totalProduits', '$resultats.totalBoutiques'] } }
      }
    },
    { $sort: { count: -1, avgResultats: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        query: 1,
        count: 1
      }
    }
  ]);
  
  return suggestions;
};

/**
 * Termes les plus recherchés (trending)
 */
searchHistorySchema.statics.trending = async function(limit = 10, days = 7) {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  
  const trending = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: dateLimit },
        'resultats.totalProduits': { $gt: 0 }
      }
    },
    {
      $group: {
        _id: '$queryNormalized',
        query: { $first: '$query' },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        query: 1,
        count: 1
      }
    }
  ]);
  
  return trending;
};

/**
 * Supprimer l'historique d'un utilisateur
 */
searchHistorySchema.statics.supprimerPourUtilisateur = async function(userId) {
  const result = await this.deleteMany({ user: userId });
  return result.deletedCount;
};

/**
 * Supprimer une recherche spécifique
 */
searchHistorySchema.statics.supprimerRecherche = async function(searchId, userId) {
  const result = await this.findOneAndDelete({ _id: searchId, user: userId });
  return result;
};

module.exports = mongoose.model('SearchHistory', searchHistorySchema);