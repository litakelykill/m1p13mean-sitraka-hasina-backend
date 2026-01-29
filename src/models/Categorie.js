/**
 * Categorie Model
 * 
 * Modele pour les categories de produits
 * Gestion simple sans sous-categories
 * 
 * @module models/Categorie
 */

const mongoose = require('mongoose');

// ============================================
// HELPER : Generer un slug
// ============================================
const generateSlug = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Espaces -> tirets
        .replace(/[àáâãäå]/g, 'a')   // Accents
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ñ]/g, 'n')
        .replace(/[ç]/g, 'c')
        .replace(/[^\w\-]+/g, '')    // Caracteres speciaux
        .replace(/\-\-+/g, '-')      // Tirets multiples
        .replace(/^-+/, '')          // Tiret au debut
        .replace(/-+$/, '');         // Tiret a la fin
};

/**
 * @desc Schema Mongoose pour les categories
 */
const categorieSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: [true, 'Le nom de la categorie est requis'],
        unique: true,
        trim: true,
        maxlength: [100, 'Le nom ne peut pas depasser 100 caracteres']
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'La description ne peut pas depasser 500 caracteres']
    },
    ordre: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * @desc Index pour optimiser les recherches
 */
categorieSchema.index({ ordre: 1, nom: 1 });
categorieSchema.index({ isActive: 1 });

/**
 * @desc Virtual field pour compter le nombre de produits dans cette categorie
 */
categorieSchema.virtual('produitsCount', {
    ref: 'Produit',
    localField: '_id',
    foreignField: 'categorie',
    count: true
});

/**
 * @desc Middleware pre 'save' pour generer le slug avant sauvegarde
 */
categorieSchema.pre('save', function () {
    if (this.isModified('nom') || !this.slug) {
        this.slug = generateSlug(this.nom);
    }
});

/**
 * @desc Middleware pre 'findOneAndUpdate' pour regenerer le slug si le nom change
 */
categorieSchema.pre('findOneAndUpdate', function () {
    const update = this.getUpdate();
    if (update.nom || (update.$set && update.$set.nom)) {
        const newNom = update.nom || update.$set.nom;
        const newSlug = generateSlug(newNom);
        if (update.$set) {
            update.$set.slug = newSlug;
        } else {
            update.slug = newSlug;
        }
    }
});

// Trouver une categorie par son slug
categorieSchema.statics.findBySlug = function (slug) {
    return this.findOne({ slug: slug.toLowerCase() });
};

// Trouver les categories actives, triees par ordre et nom
categorieSchema.statics.findActivesSorted = function () {
    return this.find({ isActive: true }).sort({ ordre: 1, nom: 1 });
};

const Categorie = mongoose.model('Categorie', categorieSchema);

module.exports = Categorie;