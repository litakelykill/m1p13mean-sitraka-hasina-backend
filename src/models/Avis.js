/**
 * Avis Model
 * 
 * Modele pour les avis des clients sur les boutiques
 * 
 * @module models/Avis
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ============================================
// SCHEMA AVIS
// ============================================
const avisSchema = new Schema({
    // Client qui donne l'avis
    client: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Le client est requis']
    },

    // Boutique concernee
    boutique: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'La boutique est requise']
    },

    // Commande associee (optionnel mais recommande)
    commande: {
        type: Schema.Types.ObjectId,
        ref: 'Commande',
        default: null
    },

    // Note de 1 a 5
    note: {
        type: Number,
        required: [true, 'La note est requise'],
        min: [1, 'La note minimum est 1'],
        max: [5, 'La note maximum est 5']
    },

    // Commentaire
    commentaire: {
        type: String,
        required: [true, 'Le commentaire est requis'],
        trim: true,
        minlength: [10, 'Le commentaire doit contenir au moins 10 caracteres'],
        maxlength: [1000, 'Le commentaire ne peut pas depasser 1000 caracteres']
    },

    // Reponse de la boutique
    reponse: {
        contenu: {
            type: String,
            trim: true,
            maxlength: [500, 'La reponse ne peut pas depasser 500 caracteres']
        },
        date: {
            type: Date
        }
    },

    // Statut de l'avis
    statut: {
        type: String,
        enum: ['en_attente', 'approuve', 'rejete', 'signale'],
        default: 'approuve' // Auto-approuve par defaut, peut etre modere par admin
    },

    // Raison si rejete ou signale
    raisonModeration: {
        type: String,
        default: null
    },

    // Avis verifie (client a bien commande dans cette boutique)
    estVerifie: {
        type: Boolean,
        default: false
    },

    // Compteurs
    utilesCount: {
        type: Number,
        default: 0
    },

    // Clients qui ont trouve l'avis utile
    marqueUtilePar: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]

}, {
    timestamps: true
});

/**
 * Indexes pour optimiser les requetes frequentes :
 * - Par boutique et date de creation pour afficher les avis recents d'une boutique
 * - Par client et boutique pour verifier si un client a deja donne un avis
 */
avisSchema.index({ boutique: 1, createdAt: -1 });
avisSchema.index({ boutique: 1, statut: 1 });
avisSchema.index({ note: 1 });

// Un client ne peut donner qu'un seul avis par boutique
// Cet index unique cree automatiquement un index compose
avisSchema.index({ client: 1, boutique: 1 }, { unique: true });

// ============================================
// METHODES STATIQUES
// ============================================

/**
 * @desc Calculer la note moyenne d'une boutique
 * @param {String} boutiqueId - ID de la boutique
 * @return {Object} Resultat avec la note moyenne, le total d'avis et la repartition par note
 */
avisSchema.statics.calculerNoteMoyenne = async function (boutiqueId) {
    const result = await this.aggregate([
        { $match: { boutique: boutiqueId, statut: 'approuve' } },
        {
            $group: {
                _id: '$boutique',
                noteMoyenne: { $avg: '$note' },
                totalAvis: { $sum: 1 },
                repartition: {
                    $push: '$note'
                }
            }
        }
    ]);

    if (result.length === 0) {
        return { noteMoyenne: 0, totalAvis: 0, repartition: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }

    // Calculer la repartition par note
    const repartition = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result[0].repartition.forEach(note => {
        repartition[note]++;
    });

    return {
        noteMoyenne: Math.round(result[0].noteMoyenne * 10) / 10,
        totalAvis: result[0].totalAvis,
        repartition
    };
};

/**
 * @desc Verifier si un client a deja donne un avis sur une boutique
 * @param {String} clientId - ID du client
 * @param {String} boutiqueId - ID de la boutique
 * @return {Boolean} true si le client a deja donne un avis, false sinon
 */
avisSchema.statics.clientADejaAvis = async function (clientId, boutiqueId) {
    const avis = await this.findOne({ client: clientId, boutique: boutiqueId });
    return !!avis;
};

/**
 * @desc Verifier si un client a commande dans une boutique
 * @param {String} clientId - ID du client
 * @param {String} boutiqueId - ID de la boutique
 * @return {Boolean} true si le client a commande dans la boutique, false sinon
 */
avisSchema.statics.clientACommande = async function (clientId, boutiqueId) {
    const Commande = mongoose.model('Commande');
    const commande = await Commande.findOne({
        client: clientId,
        'parBoutique.boutique': boutiqueId,
        'parBoutique.statut': 'livree'
    });
    return !!commande;
};

/**
 * @desc Obtenir les avis d'une boutique avec pagination
 * @param {String} boutiqueId - ID de la boutique
 * @param {Object} options - Options de pagination et de tri
 * @param {Number} options.page - Page actuelle (default: 1)
 * @return {Object} Resultat avec les avis, total, page, limit et totalPages
 */
avisSchema.statics.getAvisBoutique = async function (boutiqueId, options = {}) {
    const { page = 1, limit = 10, sort = 'recent' } = options;
    const skip = (page - 1) * limit;

    let sortOption = { createdAt: -1 };
    if (sort === 'note_desc') sortOption = { note: -1, createdAt: -1 };
    if (sort === 'note_asc') sortOption = { note: 1, createdAt: -1 };
    if (sort === 'utiles') sortOption = { utilesCount: -1, createdAt: -1 };

    const [avis, total] = await Promise.all([
        this.find({ boutique: boutiqueId, statut: 'approuve' })
            .populate('client', 'nom prenom avatar')
            .sort(sortOption)
            .skip(skip)
            .limit(limit),
        this.countDocuments({ boutique: boutiqueId, statut: 'approuve' })
    ]);

    return { avis, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// ============================================
// METHODES D'INSTANCE
// ============================================

/**
 * @desc Marquer comme utile par un client
 * @param {String} clientId - ID du client qui marque l'avis comme utile
 * @return {Boolean} true si l'avis a ete marque comme utile, false si le marquage a ete retire
 */
avisSchema.methods.marquerUtile = function (clientId) {
    const clientIdStr = clientId.toString();
    const dejaMarque = this.marqueUtilePar.some(id => id.toString() === clientIdStr);

    if (dejaMarque) {
        // Retirer le marquage
        this.marqueUtilePar = this.marqueUtilePar.filter(id => id.toString() !== clientIdStr);
        this.utilesCount = Math.max(0, this.utilesCount - 1);
        return false;
    } else {
        // Ajouter le marquage
        this.marqueUtilePar.push(clientId);
        this.utilesCount++;
        return true;
    }
};

/**
 * @desc Ajouter une reponse de la boutique
 * @param {String} contenu - Contenu de la reponse
 * @return {Avis} L'avis modifie avec la reponse ajoutee
 */
avisSchema.methods.ajouterReponse = function (contenu) {
    this.reponse = {
        contenu: contenu.trim(),
        date: new Date()
    };
    return this;
};

/**
 * @desc Signaler l'avis
 * @param {String} raison - Raison du signalement
 * @return {Avis} L'avis modifié avec le statut "signale" et la raison de moderation
 */
avisSchema.methods.signaler = function (raison) {
    this.statut = 'signale';
    this.raisonModeration = raison;
    return this;
};

module.exports = mongoose.model('Avis', avisSchema);