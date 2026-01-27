/**
 * Auth Middleware
 * 
 * Middleware de vérification de l'authentification JWT
 * Extrait le token du header Authorization, le vérifie,
 * et ajoute l'utilisateur à req.user
 * 
 * @module middlewares/auth.middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc Codes d'erreur pour le middleware d'authentification
 */
const AUTH_ERRORS = {
    NO_TOKEN: {
        code: 'NO_TOKEN',
        message: 'Accès refusé. Aucun token fourni.',
        statusCode: 401
    },
    INVALID_TOKEN_FORMAT: {
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Format de token invalide. Utilisez le format: Bearer <token>',
        statusCode: 401
    },
    INVALID_TOKEN: {
        code: 'INVALID_TOKEN',
        message: 'Token invalide.',
        statusCode: 401
    },
    TOKEN_EXPIRED: {
        code: 'TOKEN_EXPIRED',
        message: 'Token expiré. Veuillez vous reconnecter.',
        statusCode: 401
    },
    USER_NOT_FOUND: {
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur associé au token introuvable.',
        statusCode: 401
    },
    ACCOUNT_DISABLED: {
        code: 'ACCOUNT_DISABLED',
        message: 'Votre compte a été désactivé. Contactez l\'administrateur.',
        statusCode: 403
    }
};

/**
 * @desc Middleware d'authentification
 * Vérifie le token JWT et ajoute l'utilisateur à req.user
 * 
 * @param {Object} req - Objet request Express
 * @param {Object} res - Objet response Express
 * @param {Function} next - Fonction next Express
 */
const auth = async (req, res, next) => {
    try {
        //  Extraire le token du header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(AUTH_ERRORS.NO_TOKEN.statusCode).json({
                success: false,
                message: AUTH_ERRORS.NO_TOKEN.message,
                error: AUTH_ERRORS.NO_TOKEN.code
            });
        }

        // Vérifier le format "Bearer <token>"
        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(AUTH_ERRORS.INVALID_TOKEN_FORMAT.statusCode).json({
                success: false,
                message: AUTH_ERRORS.INVALID_TOKEN_FORMAT.message,
                error: AUTH_ERRORS.INVALID_TOKEN_FORMAT.code
            });
        }

        const token = parts[1]; // Le token JWT

        // Vérifier et décoder le token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            // Gérer les différentes erreurs JWT
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(AUTH_ERRORS.TOKEN_EXPIRED.statusCode).json({
                    success: false,
                    message: AUTH_ERRORS.TOKEN_EXPIRED.message,
                    error: AUTH_ERRORS.TOKEN_EXPIRED.code
                });
            }

            return res.status(AUTH_ERRORS.INVALID_TOKEN.statusCode).json({
                success: false,
                message: AUTH_ERRORS.INVALID_TOKEN.message,
                error: AUTH_ERRORS.INVALID_TOKEN.code
            });
        }

        // Récupérer l'utilisateur depuis la DB
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(AUTH_ERRORS.USER_NOT_FOUND.statusCode).json({
                success: false,
                message: AUTH_ERRORS.USER_NOT_FOUND.message,
                error: AUTH_ERRORS.USER_NOT_FOUND.code
            });
        }

        // Vérifier que le compte est actif
        if (!user.isActive) {
            return res.status(AUTH_ERRORS.ACCOUNT_DISABLED.statusCode).json({
                success: false,
                message: AUTH_ERRORS.ACCOUNT_DISABLED.message,
                error: AUTH_ERRORS.ACCOUNT_DISABLED.code
            });
        }

        // Ajouter l'utilisateur et le token à req
        req.user = user;
        req.token = token;

        // Continuer vers le prochain middleware/controller
        next();

    } catch (error) {
        console.error('Erreur middleware auth:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur lors de l\'authentification.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc Middleware optionnel d'authentification
 * même logique que auth mais ne bloque pas si pas de token
 * Utile pour les routes publiques qui peuvent avoir un comportement différent
 * si l'utilisateur est connecté
 * 
 * @param {Object} req - Objet request Express
 * @param {Object} res - Objet response Express
 * @param {Function} next - Fonction next Express
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Si pas de token, continuer sans user
        if (!authHeader) {
            req.user = null;
            return next();
        }

        const parts = authHeader.split(' ');

        // Si format invalide, continuer sans user
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            req.user = null;
            return next();
        }

        const token = parts[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (user && user.isActive) {
                req.user = user;
                req.token = token;
            } else {
                req.user = null;
            }
        } catch (jwtError) {
            req.user = null;
        }

        next();

    } catch (error) {
        console.error('Erreur middleware optionalAuth:', error);
        req.user = null;
        next();
    }
};

module.exports = {
    auth,
    optionalAuth,
    AUTH_ERRORS
};