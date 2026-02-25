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
 * CLOUDINARY : uploadAvatarCloudinary, deleteAvatarCloudinary
 * 
 * @module controllers/auth.controller
 */

const User = require('../models/User');
const { deleteLocalFile, MAX_FILE_SIZE } = require('../config/multer');
const multer = require('multer');

// ============================================
// CLOUDINARY IMPORTS
// ============================================
const { deleteFromCloudinary, extractPublicId } = require('../config/multer-cloudinary');

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
                horaires: boutique.horaires || undefined,
                reseauxSociaux: boutique.reseauxSociaux || undefined,
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
            message: 'Erreur interne du serveur.',
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
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profil recupere avec succes.',
            data: {
                user: user.toSafeObjectWithAvatarUrl(req)
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
 * @desc    Mettre a jour le profil
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
    try {
        const { nom, prenom, telephone, adresse } = req.body;

        const updateData = {};
        if (nom !== undefined) updateData.nom = nom;
        if (prenom !== undefined) updateData.prenom = prenom;
        if (telephone !== undefined) updateData.telephone = telephone;
        if (adresse !== undefined) updateData.adresse = adresse;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Profil mis a jour avec succes.',
            data: {
                user: user.toSafeObjectWithAvatarUrl(req)
            }
        });

    } catch (error) {
        console.error('Erreur updateProfile:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Changer le mot de passe
 * @route   PUT /api/auth/password
 * @access  Private
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');

        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(AUTH_ERRORS.WRONG_PASSWORD.statusCode).json({
                success: false,
                message: AUTH_ERRORS.WRONG_PASSWORD.message,
                error: AUTH_ERRORS.WRONG_PASSWORD.code
            });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Mot de passe change avec succes.'
        });

    } catch (error) {
        console.error('Erreur changePassword:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Upload photo de profil (LOCAL)
 * @route   PUT /api/auth/avatar
 * @access  Private
 */
const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(AUTH_ERRORS.NO_FILE_UPLOADED.statusCode).json({
                success: false,
                message: AUTH_ERRORS.NO_FILE_UPLOADED.message,
                error: AUTH_ERRORS.NO_FILE_UPLOADED.code
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
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
            } catch (deleteError) {
                console.error('Erreur suppression ancien avatar:', deleteError);
            }
        }

        user.avatar = req.file.filename;
        await user.save({ validateBeforeSave: false });

        // Construire l'URL complete pour la reponse
        const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${user.avatar}`;

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
 * @desc    Supprimer photo de profil (LOCAL)
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

// ============================================
// CLOUDINARY - AVATAR FUNCTIONS
// ============================================

/**
 * @desc    Upload photo de profil (CLOUDINARY)
 * @route   PUT /api/auth/avatar/cloud
 * @access  Private
 */
const uploadAvatarCloudinary = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(AUTH_ERRORS.NO_FILE_UPLOADED.statusCode).json({
                success: false,
                message: AUTH_ERRORS.NO_FILE_UPLOADED.message,
                error: AUTH_ERRORS.NO_FILE_UPLOADED.code
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        // Supprimer l'ancien avatar de Cloudinary s'il existe
        if (user.avatar && user.avatar.includes('cloudinary.com')) {
            try {
                const publicId = extractPublicId(user.avatar);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            } catch (deleteError) {
                console.error('Erreur suppression ancien avatar Cloudinary:', deleteError);
            }
        }

        // Avec multer-storage-cloudinary, l'URL est dans req.file.path
        user.avatar = req.file.path;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Photo de profil mise a jour avec succes.',
            data: {
                avatar: user.avatar,
                avatarUrl: user.avatar,
                user: user.toSafeObjectWithAvatarUrl(req)
            }
        });

    } catch (error) {
        console.error('Erreur uploadAvatarCloudinary:', error);

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(AUTH_ERRORS.FILE_TOO_LARGE.statusCode).json({
                    success: false,
                    message: AUTH_ERRORS.FILE_TOO_LARGE.message,
                    error: AUTH_ERRORS.FILE_TOO_LARGE.code
                });
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
 * @desc    Supprimer photo de profil (CLOUDINARY)
 * @route   DELETE /api/auth/avatar/cloud
 * @access  Private
 */
const deleteAvatarCloudinary = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        if (!user.avatar) {
            return res.status(AUTH_ERRORS.NO_AVATAR.statusCode).json({
                success: false,
                message: AUTH_ERRORS.NO_AVATAR.message,
                error: AUTH_ERRORS.NO_AVATAR.code
            });
        }

        // Supprimer de Cloudinary
        if (user.avatar.includes('cloudinary.com')) {
            try {
                const publicId = extractPublicId(user.avatar);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            } catch (deleteError) {
                console.error('Erreur suppression Cloudinary:', deleteError);
            }
        }

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
        console.error('Erreur deleteAvatarCloudinary:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Deconnexion
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
    // CLOUDINARY
    uploadAvatarCloudinary,
    deleteAvatarCloudinary,
    AUTH_ERRORS
};