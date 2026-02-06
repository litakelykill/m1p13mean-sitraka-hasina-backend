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

// ============================================
// CONSTANTES
// ============================================
const STATUTS = ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee', 'rupture'];
const MODES_PAIEMENT = ['livraison', 'en_ligne'];
const PAIEMENT_STATUTS = ['en_attente', 'paye', 'echoue', 'rembourse'];

// Transitions autorisees
const TRANSITIONS_AUTORISEES = {
    en_attente: ['confirmee', 'annulee', 'rupture'],
    confirmee: ['en_preparation', 'annulee'],
    en_preparation: ['expediee', 'annulee'],
    expediee: ['livree'],
    livree: [],
    annulee: [],
    rupture: []
};

/**
 * @desc Schema Adresse de Livraison
 */
const adresseLivraisonSchema = new Schema({
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
        required: [true, 'La rue est requise']
    },
    ville: {
        type: String,
        required: [true, 'La ville est requise']
    },
    codePostal: {
        type: String,
        default: ''
    },
    pays: {
        type: String,
        default: 'Madagascar'
    },
    instructions: {
        type: String,
        default: ''
    }
}, { _id: false });

/**
 * @desc Schema Item Commande
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
    // Snapshot des infos produit
    nom: {
        type: String,
        required: true
    },
    slug: {
        type: String
    },
    imagePrincipale: {
        type: String
    },
    prix: {
        type: Number,
        required: true
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
        required: true
    }
}, { _id: false });

/**
 * @desc Schema Historique Statut
 */
const historiqueStatutSchema = new Schema({
    statut: {
        type: String,
        enum: STATUTS,
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
 * @desc Schema Note
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
 * @desc Schema Sous-commande par boutique
 */
const sousCommandeSchema = new Schema({
    boutique: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nomBoutique: {
        type: String
    },
    items: [itemCommandeSchema],
    sousTotal: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    statut: {
        type: String,
        enum: STATUTS,
        default: 'en_attente'
    },
    historiqueStatuts: [historiqueStatutSchema],
    notes: [noteSchema]
}, { _id: true });

/**
 * @desc Schema Commande
 */
const commandeSchema = new Schema({
    numero: {
        type: String,
        unique: true,
        required: true
    },
    client: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Le client est requis']
    },
    adresseLivraison: {
        type: adresseLivraisonSchema,
        required: [true, 'L\'adresse de livraison est requise']
    },
    items: [itemCommandeSchema],
    sousTotal: {
        type: Number,
        required: true,
        default: 0
    },
    total: {
        type: Number,
        required: true,
        default: 0
    },
    economies: {
        type: Number,
        default: 0
    },
    modePaiement: {
        type: String,
        enum: MODES_PAIEMENT,
        default: 'livraison'
    },
    paiementStatut: {
        type: String,
        enum: PAIEMENT_STATUTS,
        default: 'en_attente'
    },
    statut: {
        type: String,
        enum: STATUTS,
        default: 'en_attente'
    },
    historiqueStatuts: [historiqueStatutSchema],
    notes: [noteSchema],
    parBoutique: [sousCommandeSchema]
}, {
    timestamps: true
});

/**
 * @desc Index pour optimiser les recherches par client et date de creation
 */
commandeSchema.index({ client: 1, createdAt: -1 });
commandeSchema.index({ statut: 1 });
commandeSchema.index({ 'parBoutique.boutique': 1, createdAt: -1 });
commandeSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================
commandeSchema.virtual('itemsCount').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantite, 0);
});

// ============================================
// METHODES STATIQUES
// ============================================

/**
 * @desc Generer un numero de commande unique
 * Format: CMD-YYYYMMDD-XXXXX
 * @returns {String} Numero de commande unique
 */
commandeSchema.statics.genererNumero = async function () {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `CMD-${dateStr}-`;

    // Trouver la derniere commande du jour
    const lastCommande = await this.findOne({
        numero: { $regex: `^${prefix}` }
    }).sort({ numero: -1 });

    let sequence = 1;
    if (lastCommande) {
        const lastSequence = parseInt(lastCommande.numero.split('-')[2]);
        sequence = lastSequence + 1;
    }

    return `${prefix}${String(sequence).padStart(5, '0')}`;
};

/**
 * @desc Verifier si une transition de statut est autorisee
 * @param {String} statutActuel - Statut actuel
 * @param {String} nouveauStatut - Nouveau statut
 * @returns {Boolean} True si la transition est autorisee, sinon false
 */
commandeSchema.statics.isTransitionAutorisee = function (statutActuel, nouveauStatut) {
    const transitionsPermises = TRANSITIONS_AUTORISEES[statutActuel] || [];
    return transitionsPermises.includes(nouveauStatut);
};

/**
 * @desc Obtenir les commandes d'un client
 * @param {ObjectId} clientId - ID du client
 * @param {Object} options - Options de pagination et filtre
 * @param {Number} options.page - Numero de page
 * @param {Number} options.limit - Nombre de resultats par page
 * @param {String} options.statut - Filtrer par statut
 * @returns {Query} Requete Mongoose pour obtenir les commandes
 */
commandeSchema.statics.findByClient = function (clientId, options = {}) {
    const { page = 1, limit = 10, statut } = options;
    const skip = (page - 1) * limit;

    const filter = { client: clientId };
    if (statut) filter.statut = statut;

    return this.find(filter)
        .select('numero statut total items createdAt parBoutique')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * @desc Obtenir les commandes d'une boutique
 * @param {ObjectId} boutiqueId - ID de la boutique
 * @param {Object} options - Options de pagination et filtre
 * @param {Number} options.page - Numero de page
 * @param {Number} options.limit - Nombre de resultats par page
 * @param {String} options.statut - Filtrer par statut de sous-commande
 * @returns {Query} Requete Mongoose pour obtenir les commandes
 */
commandeSchema.statics.findByBoutique = function (boutiqueId, options = {}) {
    const { page = 1, limit = 10, statut } = options;
    const skip = (page - 1) * limit;

    const filter = { 'parBoutique.boutique': boutiqueId };
    if (statut) filter['parBoutique.statut'] = statut;

    return this.find(filter)
        .select('numero statut total items createdAt parBoutique client adresseLivraison')
        .populate('client', 'nom prenom email telephone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// ============================================
// METHODES D'INSTANCE
// ============================================

/**
 * @desc Ajouter un statut a l'historique
 * @param {String} statut - Nouveau statut
 * @param {ObjectId} auteurId - ID de l'auteur du changement
 * @param {String} commentaire - Commentaire optionnel
 * @returns {Commande} Instance de la commande mise a jour
 */
commandeSchema.methods.ajouterHistoriqueStatut = function (statut, auteurId, commentaire = '') {
    this.historiqueStatuts.push({
        statut,
        date: new Date(),
        commentaire,
        auteur: auteurId
    });
    this.statut = statut;
    return this;
};

/**
 * @desc Ajouter un statut a une sous-commande boutique
 * @param {ObjectId} boutiqueId - ID de la boutique
 * @param {String} statut - Nouveau statut
 * @param {ObjectId} auteurId - ID de l'auteur du changement
 * @param {String} commentaire - Commentaire optionnel
 * @returns {Commande} Instance de la commande mise a jour
 */
commandeSchema.methods.ajouterHistoriqueStatutBoutique = function (boutiqueId, statut, auteurId, commentaire = '') {
    const sousCommande = this.parBoutique.find(
        sc => sc.boutique.toString() === boutiqueId.toString()
    );

    if (sousCommande) {
        sousCommande.historiqueStatuts.push({
            statut,
            date: new Date(),
            commentaire,
            auteur: auteurId
        });
        sousCommande.statut = statut;

        // Mettre a jour le statut global si necessaire
        this.mettreAJourStatutGlobal();
    }

    return this;
};

/**
 * @desc Mettre a jour le statut global en fonction des sous-commandes
 * @returns {Commande} Instance de la commande mise a jour
 */
commandeSchema.methods.mettreAJourStatutGlobal = function () {
    const statuts = this.parBoutique.map(sc => sc.statut);

    // Si toutes les sous-commandes ont le meme statut
    if (statuts.every(s => s === statuts[0])) {
        this.statut = statuts[0];
    }
    // Si au moins une est en rupture
    else if (statuts.includes('rupture')) {
        this.statut = 'rupture';
    }
    // Si au moins une est annulee
    else if (statuts.includes('annulee')) {
        this.statut = 'annulee';
    }
    // Sinon, prendre le statut le moins avance
    else {
        const ordre = STATUTS;
        let minIndex = ordre.length;
        for (const s of statuts) {
            const index = ordre.indexOf(s);
            if (index < minIndex && index >= 0) minIndex = index;
        }
        this.statut = ordre[minIndex];
    }

    return this;
};

/**
 * @desc Ajouter une note
 * @param {String} contenu - Contenu de la note
 * @param {ObjectId} auteurId - ID de l'auteur de la note
 * @returns {Commande} Instance de la commande mise a jour
 */
commandeSchema.methods.ajouterNote = function (contenu, auteurId) {
    this.notes.push({
        contenu,
        date: new Date(),
        auteur: auteurId
    });
    return this;
};

/**
 * @desc Ajouter une note a une sous-commande boutique
 * @param {ObjectId} boutiqueId - ID de la boutique
 * @param {String} contenu - Contenu de la note
 * @param {ObjectId} auteurId - ID de l'auteur de la note
 * @returns {Commande} Instance de la commande mise a jour
 */
commandeSchema.methods.ajouterNoteBoutique = function (boutiqueId, contenu, auteurId) {
    const sousCommande = this.parBoutique.find(
        sc => sc.boutique.toString() === boutiqueId.toString()
    );

    if (sousCommande) {
        sousCommande.notes.push({
            contenu,
            date: new Date(),
            auteur: auteurId
        });
    }

    return this;
};

/**
 * @desc Obtenir la sous-commande d'une boutique
 * @param {ObjectId} boutiqueId - ID de la boutique
 * @returns {Object} Sous-commande associee a la boutique
 */
commandeSchema.methods.getSousCommandeBoutique = function (boutiqueId) {
    return this.parBoutique.find(
        sc => sc.boutique.toString() === boutiqueId.toString()
    );
};

const Commande = mongoose.model('Commande', commandeSchema);

module.exports = Commande;
module.exports.STATUTS = STATUTS;
module.exports.TRANSITIONS_AUTORISEES = TRANSITIONS_AUTORISEES;
module.exports.MODES_PAIEMENT = MODES_PAIEMENT;