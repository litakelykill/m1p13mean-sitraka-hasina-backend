/**
 * Auth Controller
 * 
 * Controleur pour la gestion de l'authentification
 * - Inscription (register)
 * - Connexion (login)
 * - Profil utilisateur (getMe, updateProfile)
 * - Gestion mot de passe (changePassword)
 * - Gestion avatar (uploadAvatar, deleteAvatar)
 * - Deconnexion (logout)
 * 
 * @module controllers/auth.controller
 */

const User = require('../models/User');
const { deleteLocalFile, MAX_FILE_SIZE } = require('../config/multer');
const multer = require('multer');

// ============================================
// POUR CLOUDINARY (Decommenter si migration)
// ============================================
// const { deleteFromCloudinary, getPublicIdFromUrl } = require('../config/multer');

// ============================================
// CODES D'ERREUR
// ============================================
const AUTH_ERRORS = {
    EMAIL_EXISTS: {
        code: 'EMAIL_EXISTS',
        message: 'Cet email est deja utilise.',
        statusCode: 409
    },
    INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect.',
        statusCode: 401
    },
    ACCOUNT_DISABLED: {
        code: 'ACCOUNT_DISABLED',
        message: 'Votre compte a ete desactive. Contactez l\'administrateur.',
        statusCode: 403
    },
    BOUTIQUE_NOT_VALIDATED: {
        code: 'BOUTIQUE_NOT_VALIDATED',
        message: 'Votre boutique n\'a pas encore ete validee par l\'administrateur. Veuillez patienter.',
        statusCode: 403
    },
    WRONG_PASSWORD: {
        code: 'WRONG_PASSWORD',
        message: 'Le mot de passe actuel est incorrect.',
        statusCode: 401
    },
    USER_NOT_FOUND: {
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur non trouve.',
        statusCode: 404
    },
    ADMIN_REGISTRATION_FORBIDDEN: {
        code: 'ADMIN_REGISTRATION_FORBIDDEN',
        message: 'L\'inscription en tant qu\'administrateur n\'est pas autorisee.',
        statusCode: 403
    },
    NO_FILE_UPLOADED: {
        code: 'NO_FILE_UPLOADED',
        message: 'Aucun fichier n\'a ete envoye.',
        statusCode: 400
    },
    NO_AVATAR: {
        code: 'NO_AVATAR',
        message: 'Aucun avatar a supprimer.',
        statusCode: 400
    },
    FILE_TOO_LARGE: {
        code: 'FILE_TOO_LARGE',
        message: `Fichier trop volumineux. Taille maximum : ${MAX_FILE_SIZE / (1024 * 1024)} MB`,
        statusCode: 400
    },
    INVALID_FILE_TYPE: {
        code: 'INVALID_FILE_TYPE',
        message: 'Type de fichier non autorise. Types acceptes : JPEG, JPG, PNG, WEBP',
        statusCode: 400
    }
};

/**
 * @desc Creer une reponse JSON avec token JWT - HELPER
 * @param {Object} req - Requete Express
 * @param {Object} res - Reponse Express
 * @param {Object} user - Utilisateur
 * @param {number} statusCode - Code HTTP de la reponse
 * @param {string} message - Message de la reponse
 */
const sendTokenResponse = (req, res, user, statusCode, message) => {
    // Generer le token JWT
    const token = user.getSignedJwtToken();

    // Retourner l'utilisateur avec URL avatar
    const userData = user.toSafeObjectWithAvatarUrl(req);

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

        // Empecher l'inscription ADMIN
        if (role === 'ADMIN') {
            return res.status(AUTH_ERRORS.ADMIN_REGISTRATION_FORBIDDEN.statusCode).json({
                success: false,
                message: AUTH_ERRORS.ADMIN_REGISTRATION_FORBIDDEN.message,
                error: AUTH_ERRORS.ADMIN_REGISTRATION_FORBIDDEN.code
            });
        }

        // Verifier si l'email existe deja
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(AUTH_ERRORS.EMAIL_EXISTS.statusCode).json({
                success: false,
                message: AUTH_ERRORS.EMAIL_EXISTS.message,
                error: AUTH_ERRORS.EMAIL_EXISTS.code
            });
        }

        // Preparer les donnees utilisateur
        const userData = {
            email,
            password,
            nom,
            prenom,
            telephone,
            adresse,
            role: role || 'CLIENT'
        };

        // Ajouter les donnees boutique si role BOUTIQUE
        if (userData.role === 'BOUTIQUE') {
            if (!boutique || !boutique.nomBoutique) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom de la boutique est requis pour le role BOUTIQUE.',
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
                isValidated: false // Toujours false a l'inscription
            };
        }

        // Creer l'utilisateur
        const user = await User.create(userData);

        // Retourner la reponse avec token
        const message = userData.role === 'BOUTIQUE'
            ? 'Inscription reussie. Votre boutique est en attente de validation par l\'administrateur.'
            : 'Inscription reussie. Bienvenue !';

        sendTokenResponse(req, res, user, 201, message);

    } catch (error) {
        console.error('Erreur register:', error);

        // Gerer les erreurs de validation Mongoose
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

        // Recuperer l'utilisateur avec le password
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

        if (!user) {
            return res.status(AUTH_ERRORS.INVALID_CREDENTIALS.statusCode).json({
                success: false,
                message: AUTH_ERRORS.INVALID_CREDENTIALS.message,
                error: AUTH_ERRORS.INVALID_CREDENTIALS.code
            });
        }

        // Verifier le mot de passe
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(AUTH_ERRORS.INVALID_CREDENTIALS.statusCode).json({
                success: false,
                message: AUTH_ERRORS.INVALID_CREDENTIALS.message,
                error: AUTH_ERRORS.INVALID_CREDENTIALS.code
            });
        }

        // Verifier si le compte est actif
        if (!user.isActive) {
            return res.status(AUTH_ERRORS.ACCOUNT_DISABLED.statusCode).json({
                success: false,
                message: AUTH_ERRORS.ACCOUNT_DISABLED.message,
                error: AUTH_ERRORS.ACCOUNT_DISABLED.code
            });
        }

        // Verifier si boutique validee (si role BOUTIQUE)
        if (user.role === 'BOUTIQUE' && user.boutique && !user.boutique.isValidated) {
            // On permet la connexion mais on signale que la boutique n'est pas validee
            // Le client pourra voir son profil mais pas acceder aux fonctionnalites boutique

            // Mettre a jour les infos de connexion quand meme
            user.lastLogin = new Date();
            user.loginCount = (user.loginCount || 0) + 1;
            await user.save({ validateBeforeSave: false });

            const token = user.getSignedJwtToken();
            const userData = user.toSafeObjectWithAvatarUrl(req);

            return res.status(200).json({
                success: true,
                message: 'Connexion reussie. Attention : votre boutique n\'est pas encore validee.',
                token,
                data: {
                    user: userData,
                    boutiqueValidated: false
                }
            });
        }

        // Mettre a jour les informations de connexion
        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save({ validateBeforeSave: false });

        // Retourner la reponse avec token
        sendTokenResponse(req, res, user, 200, 'Connexion reussie.');

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
 * @desc    Recuperer le profil de l'utilisateur connecte
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
    try {
        // L'utilisateur est deja disponible via le middleware auth
        const user = req.user.toSafeObjectWithAvatarUrl(req);

        res.status(200).json({
            success: true,
            message: 'Profil recupere avec succes.',
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
 * @desc    Mettre a jour le profil de l'utilisateur connecte
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        // Champs autorises pour la mise a jour
        const allowedFields = ['nom', 'prenom', 'telephone', 'adresse'];

        // Construire l'objet de mise a jour
        const updateData = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        // Verifier qu'il y a des donnees a mettre a jour
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnee a mettre a jour.',
                error: 'NO_UPDATE_DATA'
            });
        }

        // Mettre a jour l'utilisateur
        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            {
                new: true, // Retourner le document mis a jour
                runValidators: true // Executer les validations
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
            message: 'Profil mis a jour avec succes.',
            data: {
                user: user.toSafeObjectWithAvatarUrl(req)
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
 * @desc    Changer le mot de passe de l'utilisateur connecte
 * @route   PUT /api/auth/password
 * @access  Private
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Recuperer l'utilisateur avec le password
        const user = await User.findById(req.user._id).select('+password');

        if (!user) {
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        // Verifier l'ancien mot de passe
        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(AUTH_ERRORS.WRONG_PASSWORD.statusCode).json({
                success: false,
                message: AUTH_ERRORS.WRONG_PASSWORD.message,
                error: AUTH_ERRORS.WRONG_PASSWORD.code
            });
        }

        // Mettre a jour le mot de passe (sera hashe par le hook pre-save)
        user.password = newPassword;
        await user.save();

        // Generer un nouveau token
        const token = user.getSignedJwtToken();

        res.status(200).json({
            success: true,
            message: 'Mot de passe modifie avec succes.',
            token,
            data: {
                user: user.toSafeObjectWithAvatarUrl(req)
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
 * @desc    Upload ou remplacer la photo de profil
 * @route   PUT /api/auth/avatar
 * @access  Private
 */
const uploadAvatar = async (req, res) => {
    try {
        // ========================================
        // Gestion des erreurs Multer
        // ========================================
        if (req.fileValidationError) {
            return res.status(400).json({
                success: false,
                message: req.fileValidationError,
                error: 'INVALID_FILE_TYPE'
            });
        }

        // Verifier qu'un fichier a ete envoye
        if (!req.file) {
            return res.status(AUTH_ERRORS.NO_FILE_UPLOADED.statusCode).json({
                success: false,
                message: AUTH_ERRORS.NO_FILE_UPLOADED.message,
                error: AUTH_ERRORS.NO_FILE_UPLOADED.code
            });
        }

        // Recuperer l'utilisateur
        const user = await User.findById(req.user._id);

        if (!user) {
            // Supprimer le fichier uploade si user non trouve
            await deleteLocalFile(`./uploads/avatars/${req.file.filename}`);
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        // Supprimer l'ancien avatar s'il existe
        if (user.avatar) {
            try {
                await deleteLocalFile(`./uploads/avatars/${user.avatar}`);

                // Pour Cloudinary :
                // const publicId = getPublicIdFromUrl(user.avatar);
                // await deleteFromCloudinary(publicId);
            } catch (deleteError) {
                console.error('Erreur suppression ancien avatar:', deleteError);
                // On continue meme si la suppression echoue
            }
        }

        // Mettre a jour l'avatar dans la base
        // Stockage local : on stocke le nom du fichier
        user.avatar = req.file.filename;

        // Pour Cloudinary : on stocke l'URL complete
        // user.avatar = req.file.path;

        await user.save({ validateBeforeSave: false });

        // Construire l'URL complete pour la reponse
        const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${user.avatar}`;

        // Pour Cloudinary : l'URL est deja dans req.file.path
        // const avatarUrl = req.file.path;

        res.status(200).json({
            success: true,
            message: 'Photo de profil mise a jour avec succes.',
            data: {
                avatar: user.avatar,
                avatarUrl: avatarUrl,
                user: user.toSafeObjectWithAvatarUrl(req)
            }
        });

    } catch (error) {
        console.error('Erreur uploadAvatar:', error);

        // Gerer les erreurs Multer
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(AUTH_ERRORS.FILE_TOO_LARGE.statusCode).json({
                    success: false,
                    message: AUTH_ERRORS.FILE_TOO_LARGE.message,
                    error: AUTH_ERRORS.FILE_TOO_LARGE.code
                });
            }
        }

        if (error.code === 'INVALID_FILE_TYPE') {
            return res.status(AUTH_ERRORS.INVALID_FILE_TYPE.statusCode).json({
                success: false,
                message: AUTH_ERRORS.INVALID_FILE_TYPE.message,
                error: AUTH_ERRORS.INVALID_FILE_TYPE.code
            });
        }

        // Supprimer le fichier uploade en cas d'erreur
        if (req.file) {
            try {
                await deleteLocalFile(`./uploads/avatars/${req.file.filename}`);
            } catch (deleteError) {
                console.error('Erreur suppression fichier apres erreur:', deleteError);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur lors de l\'upload.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Supprimer la photo de profil
 * @route   DELETE /api/auth/avatar
 * @access  Private
 */
const deleteAvatar = async (req, res) => {
    try {
        // Recuperer l'utilisateur
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        // Verifier qu'il y a un avatar a supprimer
        if (!user.avatar) {
            return res.status(AUTH_ERRORS.NO_AVATAR.statusCode).json({
                success: false,
                message: AUTH_ERRORS.NO_AVATAR.message,
                error: AUTH_ERRORS.NO_AVATAR.code
            });
        }

        // Supprimer le fichier physique
        try {
            await deleteLocalFile(`./uploads/avatars/${user.avatar}`);

            // Pour Cloudinary :
            // const publicId = getPublicIdFromUrl(user.avatar);
            // await deleteFromCloudinary(publicId);
        } catch (deleteError) {
            console.error('Erreur suppression fichier avatar:', deleteError);
            // On continue meme si la suppression du fichier echoue
        }

        // Mettre a jour la base
        user.avatar = null;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Photo de profil supprimee avec succes.',
            data: {
                user: user.toSafeObjectWithAvatarUrl(req)
            }
        });

    } catch (error) {
        console.error('Erreur deleteAvatar:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Deconnexion de l'utilisateur
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
    try {
        // Cote serveur, nous ne stockons pas les tokens
        // La deconnexion se fait cote client en supprimant le token
        // Cette route sert principalement a :
        // 1. Confirmer la deconnexion
        // 2. Potentiellement invalider le token dans une blacklist (optionnel)
        // 3. Logger la deconnexion (optionnel)

        res.status(200).json({
            success: true,
            message: 'Deconnexion reussie.',
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
 * @desc    Mettre a jour les informations de la boutique
 * @route   PUT /api/auth/boutique
 * @access  Private (BOUTIQUE only)
 */
const updateBoutique = async (req, res) => {
    try {
        // Verifier que c'est bien une boutique
        if (req.user.role !== 'BOUTIQUE') {
            return res.status(403).json({
                success: false,
                message: 'Cette fonctionnalite est reservee aux boutiques.',
                error: 'NOT_A_BOUTIQUE'
            });
        }

        const { boutique } = req.body;

        if (!boutique) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnee de boutique fournie.',
                error: 'NO_BOUTIQUE_DATA'
            });
        }

        // Champs autorises pour la mise a jour (pas isValidated, validatedBy, etc.)
        const allowedBoutiqueFields = [
            'nomBoutique', 'description', 'categorie', 'siret',
            'telephone', 'email', 'horaires', 'adresse'
        ];

        // Construire l'objet de mise a jour
        const updateData = {};

        allowedBoutiqueFields.forEach(field => {
            if (boutique[field] !== undefined) {
                updateData[`boutique.${field}`] = boutique[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Aucune donnee a mettre a jour.',
                error: 'NO_UPDATE_DATA'
            });
        }

        // Mettre a jour
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Informations de la boutique mises a jour avec succes.',
            data: {
                user: user.toSafeObjectWithAvatarUrl(req)
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

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    uploadAvatar,
    deleteAvatar,
    logout,
    updateBoutique,
    AUTH_ERRORS
};