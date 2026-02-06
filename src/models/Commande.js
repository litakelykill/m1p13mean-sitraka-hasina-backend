/**
 * Commande Model
 * 
 * Modele pour les commandes clients
 * Gere les commandes multi-boutiques avec sous-commandes
 * 
 * @module models/Commande
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @desc Schema pour un item de commande (snapshot du produit)
 */
const itemCommandeSchema = new Schema({
    produit: {
        type: Schema.Types.ObjectId,
        ref: 'Produit',
        required: true
    },
    boutique: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Snapshot des informations produit au moment de la commande
    nom: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true
    },
    prix: {
        type: Number,
        required: true,
        min: 0
    },
    prixPromo: {
        type: Number,
        default: null
    },
    quantite: {
        type: Number,
        required: true,
        min: 1
    },
    sousTotal: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

/**
 * @desc Schema pour l'historique des statuts
 */
const historiqueStatutSchema = new Schema({
    statut: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    commentaire: {
        type: String,
        default: ''
    },
    auteur: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: false });

/**
 * @desc Schema pour les notes internes (visibles boutique uniquement)
 */
const noteSchema = new Schema({
    contenu: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    auteur: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { _id: false });

/**
 * @desc Schema pour les sous-commandes par boutique
 */
const sousCommandeSchema = new Schema({
    boutique: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [itemCommandeSchema],
    sousTotal: {
        type: Number,
        required: true,
        min: 0
    },
    statut: {
        type: String,
        enum: ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee', 'rupture'],
        default: 'en_attente'
    },
    historiqueStatuts: [historiqueStatutSchema],
    notes: [noteSchema]
}, { _id: true });

/**
 * @desc Schema principal de la commande
 */
const commandeSchema = new Schema({
    // Numero unique de commande
    numero: {
        type: String,
        unique: true,
        required: true
    },

    // Client
    client: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Adresse de livraison (snapshot)
    adresseLivraison: {
        nom: {
            type: String,
            required: [true, 'Le nom est requis']
        },
        prenom: {
            type: String,
            required: [true, 'Le prenom est requis']
        },
        telephone: {
            type: String,
            required: [true, 'Le telephone est requis']
        },
        rue: {
            type: String,
            required: [true, 'L\'adresse est requise']
        },
        ville: {
            type: String,
            required: [true, 'La ville est requise']
        },
        codePostal: {
            type: String,
            required: [true, 'Le code postal est requis']
        },
        pays: {
            type: String,
            default: 'Madagascar'
        },
        instructions: {
            type: String,
            default: ''
        }
    },

    // Items commandes (tous les produits)
    items: [itemCommandeSchema],

    // Totaux
    sousTotal: {
        type: Number,
        required: true,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    economies: {
        type: Number,
        default: 0,
        min: 0
    },

    // Paiement
    modePaiement: {
        type: String,
        enum: ['livraison', 'en_ligne'],
        default: 'livraison'
    },
    paiementStatut: {
        type: String,
        enum: ['en_attente', 'paye', 'echoue', 'rembourse'],
        default: 'en_attente'
    },

    // Statut global de la commande
    statut: {
        type: String,
        enum: ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee', 'rupture'],
        default: 'en_attente'
    },

    // Historique des statuts
    historiqueStatuts: [historiqueStatutSchema],

    // Notes internes globales
    notes: [noteSchema],

    // Sous-commandes par boutique
    parBoutique: [sousCommandeSchema]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * Indexes pour optimiser les requetes
 */
commandeSchema.index({ client: 1, createdAt: -1 });
commandeSchema.index({ statut: 1 });
commandeSchema.index({ 'parBoutique.boutique': 1, 'parBoutique.statut': 1 });
commandeSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * @desc Nombre total d'items
 */
commandeSchema.virtual('itemsCount').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantite, 0);
});

/**
 * @desc Nombre de boutiques
 */
commandeSchema.virtual('boutiquesCount').get(function () {
    return this.parBoutique.length;
});

// ============================================
// METHODES STATIQUES
// ============================================

/**
 * @desc Generer un numero de commande unique
 * Format: CMD-YYYYMMDD-XXXXX
 * @returns {Promise<String>} Numero de commande
 */
commandeSchema.statics.genererNumero = async function () {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Trouver la derniere commande du jour
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const lastCommande = await this.findOne({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: -1 });

    let sequence = 1;
    if (lastCommande && lastCommande.numero) {
        const parts = lastCommande.numero.split('-');
        if (parts.length === 3) {
            const lastSequence = parseInt(parts[2], 10);
            if (!isNaN(lastSequence)) {
                sequence = lastSequence + 1;
            }
        }
    }

    return `CMD-${dateStr}-${sequence.toString().padStart(5, '0')}`;
};

/**
 * @desc Verifier si une transition de statut est autorisee
 * @param {String} statutActuel 
 * @param {String} nouveauStatut 
 * @returns {Boolean}
 */
commandeSchema.statics.transitionAutorisee = function (statutActuel, nouveauStatut) {
    const transitions = {
        'en_attente': ['confirmee', 'annulee', 'rupture'],
        'confirmee': ['en_preparation', 'annulee'],
        'en_preparation': ['expediee', 'annulee'],
        'expediee': ['livree'],
        'livree': [],
        'annulee': [],
        'rupture': []
    };

    return transitions[statutActuel]?.includes(nouveauStatut) || false;
};

// ============================================
// METHODES D'INSTANCE
// ============================================

/**
 * @desc Ajouter un statut a l'historique
 * @param {String} statut 
 * @param {String} commentaire 
 * @param {ObjectId} auteur 
 */
commandeSchema.methods.ajouterStatut = function (statut, commentaire = '', auteur = null) {
    this.historiqueStatuts.push({
        statut,
        date: new Date(),
        commentaire,
        auteur
    });
    this.statut = statut;
};

/**
 * @desc Ajouter une note
 * @param {String} contenu 
 * @param {ObjectId} auteur 
 */
commandeSchema.methods.ajouterNote = function (contenu, auteur) {
    this.notes.push({
        contenu,
        date: new Date(),
        auteur
    });
};

/**
 * @desc Calculer le statut global base sur les sous-commandes
 * @returns {String} Statut global
 */
commandeSchema.methods.calculerStatutGlobal = function () {
    if (this.parBoutique.length === 0) return this.statut;

    const statuts = this.parBoutique.map(sc => sc.statut);

    // Si toutes les sous-commandes ont le meme statut
    if (statuts.every(s => s === statuts[0])) {
        return statuts[0];
    }

    // Si au moins une est annulee et les autres sont terminees
    if (statuts.every(s => ['livree', 'annulee', 'rupture'].includes(s))) {
        if (statuts.includes('livree')) return 'livree';
        if (statuts.every(s => ['annulee', 'rupture'].includes(s))) return 'annulee';
    }

    // Sinon, retourner le statut le moins avance
    const ordreStatuts = ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree'];
    for (const s of ordreStatuts) {
        if (statuts.includes(s)) return s;
    }

    return this.statut;
};

const Commande = mongoose.model('Commande', commandeSchema);

module.exports = Commande;