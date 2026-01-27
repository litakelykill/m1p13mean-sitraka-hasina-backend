/**
 * Auth Controller
 * 
 * Contrôleur pour la gestion de l'authentification
 * - Inscription (register)
 * - Connexion (login)
 * - Profil utilisateur (getMe, updateProfile)
 * - Gestion mot de passe (changePassword)
 * - Déconnexion (logout)
 * 
 * @module controllers/auth.controller
 */

const User = require('../models/User');

/**
 * @desc Codes d'erreur standardisés pour l'authentification
 * @typedef {Object} AuthErrors
 */
const AUTH_ERRORS = {
    EMAIL_EXISTS: {
        code: 'EMAIL_EXISTS',
        message: 'Cet email est déjà utilisé.',
        statusCode: 409
    },
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect.',
        statusCode: 401
    },
    ACCOUNT_DISABLED: {
        code: 'ACCOUNT_DISABLED',
        message: 'Votre compte a été désactivé. Contactez l\'administrateur.',
        statusCode: 403
    },
    BOUTIQUE_NOT_VALIDATED: {
        code: 'BOUTIQUE_NOT_VALIDATED',
        message: 'Votre boutique n\'a pas encore été validée par l\'administrateur. Veuillez patienter.',
        statusCode: 403
    },
    WRONG_PASSWORD: {
        code: 'WRONG_PASSWORD',
        message: 'Le mot de passe actuel est incorrect.',
        statusCode: 401
    },
    USER_NOT_FOUND: {
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouvé.',
        statusCode: 404
    },
    ADMIN_REGISTRATION_FORBIDDEN: {
        code: 'ADMIN_REGISTRATION_FORBIDDEN',
        message: 'L\'inscription en tant qu\'administrateur n\'est pas autorisée.',
        statusCode: 403
    }
};

/**
 * @desc Envoie une réponse JSON avec le token JWT et les données utilisateur (sans données sensibles - HELPER)
 * @param {Object} user - Instance de l'utilisateur
 * @param {Number} statusCode - Code de statut HTTP
 * @param {Object} res - Objet de réponse Express
 * @param {String} message - Message à inclure dans la réponse
 * @return {void}
 */
const sendTokenResponse = (user, statusCode, res, message) => {
    // Générer le token JWT
    const token = user.getSignedJwtToken();

    // Retourner l'utilisateur sans données sensibles
    const userData = user.toSafeObject();

    res.status(statusCode).json({
        success: true,
        message,
        token,
        data: {
            user: userData
        }
    });
};

/**
 * @desc    Inscription d'un nouvel utilisateur
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
    try {
        const { email, password, nom, prenom, telephone, adresse, role, boutique } = req.body;
        // L'inscription en tant qu'ADMIN n'est pas autorisée via cette route
        if (role === 'ADMIN') {
            return res.status(AUTH_ERRORS.ADMIN_REGISTRATION_FORBIDDEN.statusCode).json({
                success: false,
                message: AUTH_ERRORS.ADMIN_REGISTRATION_FORBIDDEN.message,
                error: AUTH_ERRORS.ADMIN_REGISTRATION_FORBIDDEN.code
            });
        }
        // Rechercher un utilisateur avec le même email
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(AUTH_ERRORS.EMAIL_EXISTS.statusCode).json({
                success: false,
                message: AUTH_ERRORS.EMAIL_EXISTS.message,
                error: AUTH_ERRORS.EMAIL_EXISTS.code
            });
        }
        // Données de base - préparer l'objet userData
        const userData = {
            email,
            password,
            nom,
            prenom,
            telephone,
            adresse,
            role: role || 'CLIENT'
        };

        // Ajouter les données boutique si rôle BOUTIQUE
        if (userData.role === 'BOUTIQUE') {
            if (!boutique || !boutique.nomBoutique) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom de la boutique est requis pour le rôle BOUTIQUE.',
                    error: 'BOUTIQUE_NAME_REQUIRED'
                });
            }

            userData.boutique = {
                nomBoutique: boutique.nomBoutique,
                description: boutique.description || '',
                categorie: boutique.categorie || '',
                siret: boutique.siret || '',
                telephone: boutique.telephone || '',
                email: boutique.email || email,
                horaires: boutique.horaires || '',
                adresse: boutique.adresse || {},
                isValidated: false // Toujours false à l'inscription
            };
        }

        // create() déclenche les hooks pre-save pour le hash du password et la validation boutique - créer l'utilisateur
        const user = await User.create(userData);

        // Message différent si boutique en attente de validation - retourne avec token
        const message = userData.role === 'BOUTIQUE'
            ? 'Inscription réussie. Votre boutique est en attente de validation par l\'administrateur.'
            : 'Inscription réussie. Bienvenue !';

        sendTokenResponse(user, 201, res, message);

    } catch (error) {
        console.error('Erreur register:', error);

        // Gérer les erreurs de validation Mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation.',
                error: 'VALIDATION_ERROR',
                errors: messages
            });
        }

        // Erreur de duplication (email unique)
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: AUTH_ERRORS.EMAIL_EXISTS.message,
                error: AUTH_ERRORS.EMAIL_EXISTS.code
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur lors de l\'inscription.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Connexion d'un utilisateur
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // récupérer le user avec le mot de passe (champ select +password)
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(AUTH_ERRORS.INVALID_CREDENTIALS.statusCode).json({
                success: false,
                message: AUTH_ERRORS.INVALID_CREDENTIALS.message,
                error: AUTH_ERRORS.INVALID_CREDENTIALS.code
            });
        }

        // vérifier le mot de passe avec la méthode comparePassword
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(AUTH_ERRORS.INVALID_CREDENTIALS.statusCode).json({
                success: false,
                message: AUTH_ERRORS.INVALID_CREDENTIALS.message,
                error: AUTH_ERRORS.INVALID_CREDENTIALS.code
            });
        }

        // vérifier si le compete est actif
        if (!user.isActive) {
            return res.status(AUTH_ERRORS.ACCOUNT_DISABLED.statusCode).json({
                success: false,
                message: AUTH_ERRORS.ACCOUNT_DISABLED.message,
                error: AUTH_ERRORS.ACCOUNT_DISABLED.code
            });
        }

        // Vérifier si boutique validée (si rôle BOUTIQUE)
        if (user.role === 'BOUTIQUE' && user.boutique && !user.boutique.isValidated) {
            // On permet la connexion mais on signale que la boutique n'est pas validée
            // Le client pourra voir son profil mais pas accéder aux fonctionnalités boutique

            // Mettre à jour les infos de connexion quand même
            user.lastLogin = new Date();
            user.loginCount = (user.loginCount || 0) + 1;
            await user.save({ validateBeforeSave: false });

            const token = user.getSignedJwtToken();
            const userData = user.toSafeObject();

            return res.status(200).json({
                success: true,
                message: 'Connexion réussie. Attention : votre boutique n\'est pas encore validée.',
                token,
                data: {
                    user: userData,
                    boutiqueValidated: false
                }
            });
        }

        // Mettre à jour les informations de connexion
        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save({ validateBeforeSave: false });

        // Retourner la réponse avec token
        sendTokenResponse(user, 200, res, 'Connexion réussie.');

    } catch (error) {
        console.error('Erreur login:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur lors de la connexion.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Récupérer le profil de l'utilisateur connecté
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        // L'utilisateur est déjà disponible via le middleware auth
        const user = req.user.toSafeObject();

        res.status(200).json({
            success: true,
            message: 'Profil récupéré avec succès.',
            data: {
                user
            }
        });

    } catch (error) {
        console.error('Erreur getMe:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Mettre à jour le profil de l'utilisateur connecté
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        // Champs autorisés pour la mise à jour
        const allowedFields = ['nom', 'prenom', 'telephone', 'adresse'];

        // Construire l'objet de mise à jour
        const updateData = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // Vérifier qu'il y a des données à mettre à jour
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée à mettre à jour.',
                error: 'NO_UPDATE_DATA'
            });
        }

        // Mettre à jour l'utilisateur
        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            {
                new: true, // Retourner le document mis à jour
                runValidators: true // Exécuter les validations
            }
        );

        if (!user) {
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profil mis à jour avec succès.',
            data: {
                user: user.toSafeObject()
            }
        });

    } catch (error) {
        console.error('Erreur updateProfile:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation.',
                error: 'VALIDATION_ERROR',
                errors: messages
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Changer le mot de passe de l'utilisateur connecté
 * @route   PUT /api/auth/password
 * @access  Private
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Récupérer l'utilisateur avec le password
        const user = await User.findById(req.user._id).select('+password');

        if (!user) {
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        // Vérifier l'ancien mot de passe
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(AUTH_ERRORS.WRONG_PASSWORD.statusCode).json({
                success: false,
                message: AUTH_ERRORS.WRONG_PASSWORD.message,
                error: AUTH_ERRORS.WRONG_PASSWORD.code
            });
        }

        // Mettre à jour le mot de passe (sera hashé par le hook pre-save)
        user.password = newPassword;
        await user.save();

        // Générer un nouveau token
        const token = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            message: 'Mot de passe modifié avec succès.',
            token,
            data: {
                user: user.toSafeObject()
            }
        });

    } catch (error) {
        console.error('Erreur changePassword:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation.',
                error: 'VALIDATION_ERROR',
                errors: messages
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Déconnexion de l'utilisateur
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
    try {
        // Côté serveur, nous ne stockons pas les tokens
        // La déconnexion se fait côté client en supprimant le token
        // Cette route sert principalement à :
        // 1. Confirmer la déconnexion
        // 2. Potentiellement invalider le token dans une blacklist (optionnel)
        // 3. Logger la déconnexion (optionnel)

        res.status(200).json({
            success: true,
            message: 'Déconnexion réussie.',
            data: null
        });

    } catch (error) {
        console.error('Erreur logout:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Mettre à jour les informations de la boutique
 * @route   PUT /api/auth/boutique
 * @access  Private (BOUTIQUE only)
 */
const updateBoutique = async (req, res) => {
    try {
        // Vérifier que c'est bien une boutique
        if (req.user.role !== 'BOUTIQUE') {
            return res.status(403).json({
                success: false,
                message: 'Cette fonctionnalité est réservée aux boutiques.',
                error: 'NOT_A_BOUTIQUE'
            });
        }

        const { boutique } = req.body;

        if (!boutique) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée de boutique fournie.',
                error: 'NO_BOUTIQUE_DATA'
            });
        }

        // Champs autorisés pour la mise à jour (pas isValidated, validatedBy, etc.)
        const allowedBoutiqueFields = [
            'nomBoutique', 'description', 'categorie', 'siret',
            'telephone', 'email', 'horaires', 'adresse'
        ];

        // Construire l'objet de mise à jour
        const updateData = {};

        allowedBoutiqueFields.forEach(field => {
            if (boutique[field] !== undefined) {
                updateData[`boutique.${field}`] = boutique[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnée à mettre à jour.',
                error: 'NO_UPDATE_DATA'
            });
        }

        // Mettre à jour
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Informations de la boutique mises à jour avec succès.',
            data: {
                user: user.toSafeObject()
            }
        });

    } catch (error) {
        console.error('Erreur updateBoutique:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation.',
                error: 'VALIDATION_ERROR',
                errors: messages
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc Exporter les contrôleurs d'authentification
 */
module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    logout,
    updateBoutique,
    AUTH_ERRORS
};