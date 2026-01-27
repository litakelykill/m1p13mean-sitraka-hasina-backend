/**
 * User Model
 * 
 * Modèle Mongoose pour la gestion des utilisateurs avec 3 rôles :
 * - ADMIN : Administrateur du centre commercial
 * - BOUTIQUE : Gérant de boutique (nécessite validation admin)
 * - CLIENT : Client du centre commercial
 * 
 * @module models/User
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * @desc Sous-schéma Mongoose pour les données spécifiques aux boutiques
 */
const boutiqueSchema = new mongoose.Schema({
    nomBoutique: {
        type: String,
        required: [true, 'Le nom de la boutique est requis'],
        trim: true,
        maxlength: [100, 'Le nom de la boutique ne peut pas dépasser 100 caractères']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
    },
    logo: {
        type: String,
        default: null
    },
    banniere: {
        type: String,
        default: null
    },
    categorie: {
        type: String,
        trim: true
    },
    siret: {
        type: String,
        trim: true,
        maxlength: [14, 'Le numéro SIRET doit contenir 14 caractères']
    },
    telephone: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    horaires: {
        type: String,
        trim: true
    },
    adresse: {
        rue: { type: String, trim: true },
        ville: { type: String, trim: true },
        codePostal: { type: String, trim: true },
        pays: { type: String, trim: true, default: 'France' }
    },
    // Validation par l'admin
    isValidated: {
        type: Boolean,
        default: false
    },
    validatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    validatedAt: {
        type: Date,
        default: null
    },
    rejectedReason: {
        type: String,
        default: null
    }
}, { _id: false });

/**
 * @desc Schéma Mongoose pour les utilisateurs (SCHÉMA PRINCIPAL USER)
 */
const userSchema = new mongoose.Schema({
    // Champs d'authentification
    email: {
        type: String,
        required: [true, 'L\'email est requis'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Veuillez fournir un email valide'
        ]
    },
    password: {
        type: String,
        required: [true, 'Le mot de passe est requis'],
        minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
        select: false // Ne pas retourner le password par défaut
    },

    // Informations personnelles
    nom: {
        type: String,
        required: [true, 'Le nom est requis'],
        trim: true,
        maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
    },
    prenom: {
        type: String,
        required: [true, 'Le prénom est requis'],
        trim: true,
        maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
    },
    telephone: {
        type: String,
        trim: true,
        maxlength: [20, 'Le numéro de téléphone ne peut pas dépasser 20 caractères']
    },
    adresse: {
        rue: { type: String, trim: true },
        ville: { type: String, trim: true },
        codePostal: { type: String, trim: true },
        pays: { type: String, trim: true, default: 'Madagascar' }
    },

    // Rôle et statut
    role: {
        type: String,
        enum: {
            values: ['ADMIN', 'BOUTIQUE', 'CLIENT'],
            message: 'Le rôle doit être ADMIN, BOUTIQUE ou CLIENT'
        },
        default: 'CLIENT'
    },
    isActive: {
        type: Boolean,
        default: true
    },

    // Données spécifiques BOUTIQUE
    boutique: {
        type: boutiqueSchema,
        default: null
    },

    // Tracking connexions
    lastLogin: {
        type: Date,
        default: null
    },
    loginCount: {
        type: Number,
        default: 0
    },

    // Reset password
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpire: {
        type: Date,
        select: false
    }
}, {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * @desc Index pour optimiser les requêtes par rôle et statut
 */
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'boutique.isValidated': 1 });

/**
 * @desc Virtual pour obtenir le nom complet de l'utilisateur
 */
userSchema.virtual('nomComplet').get(function () {
    return `${this.prenom} ${this.nom}`;
});

/**
 * @desc Hook pre-save pour hasher le mot de passe et valider les données boutique
 * Mongoose moderne sans next()
 */
userSchema.pre('save', async function () {
    // ---- Hash du password si modifié ----
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }

    // ---- Validation données boutique ----
    // Si le rôle est BOUTIQUE, les données boutique sont requises
    if (this.role === 'BOUTIQUE' && !this.boutique) {
        throw new Error('Les données de la boutique sont requises pour le rôle BOUTIQUE');
    }

    // Si le rôle est BOUTIQUE et nouvelle inscription, isValidated = false
    if (this.role === 'BOUTIQUE' && this.isNew) {
        if (this.boutique) {
            this.boutique.isValidated = false;
        }
    }

    // Si le rôle n'est pas BOUTIQUE, pas de données boutique
    if (this.role !== 'BOUTIQUE') {
        this.boutique = null;
    }
});

/**
 * @desc Comparer un mot de passe en clair avec le hash stocké
 * @param {string} candidatePassword - Mot de passe en clair à comparer
 * @returns {boolean} - True si les mots de passe correspondent, sinon false
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * @desc Générer un JWT token signé
 * @returns {string} - Le token JWT
 */
userSchema.methods.getSignedJwtToken = function () {
    return jwt.sign(
        {
            userId: this._id,
            email: this.email,
            role: this.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRE || '7d'
        }
    );
};

/**
 * @desc Générer un token de réinitialisation de mot de passe
 * Stocke le token hashé et la date d'expiration dans l'utilisateur
 * @returns {string} - Le token non hashé à envoyer par email
 */
userSchema.methods.getResetPasswordToken = function () {
    // Générer un token aléatoire
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hasher le token et le stocker
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Expiration dans 10 minutes
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    // Retourner le token non hashé (sera envoyé par email)
    return resetToken;
};

/**
 * @desc Trouver un utilisateur par email et password (credentials)
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe en clair
 * @returns {Object|null} - L'utilisateur si trouvé et password correct, sinon null
 */
userSchema.statics.findByCredentials = async function (email, password) {
    // Trouver l'utilisateur avec le password
    const user = await this.findOne({ email }).select('+password');

    if (!user) {
        return null;
    }

    // Vérifier le password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return null;
    }

    return user;
};

/**
 * @desc Retourne un objet utilisateur sans les données sensibles
 */
userSchema.methods.toSafeObject = function () {
    const userObject = this.toObject();

    // Supprimer les champs sensibles
    delete userObject.password;
    delete userObject.resetPasswordToken;
    delete userObject.resetPasswordExpire;
    delete userObject.__v;

    return userObject;
};

// EXPORT DU MODÈLE
const User = mongoose.model('User', userSchema);

module.exports = User;