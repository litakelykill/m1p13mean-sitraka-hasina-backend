/**
 * Role Middleware
 * 
 * Middleware de vérification des rôles utilisateur
 * Permet de restreindre l'accès aux routes selon les rôles
 * 
 * @module middlewares/role.middleware
 */

/**
 * @desc Codes d'erreur pour le middleware de rôle
 */
const ROLE_ERRORS = {
    NO_USER: {
        code: 'NO_USER',
        message: 'Utilisateur non authentifié.',
        statusCode: 401
    },
    FORBIDDEN: {
        code: 'FORBIDDEN',
        message: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.',
        statusCode: 403
    },
    BOUTIQUE_NOT_VALIDATED: {
        code: 'BOUTIQUE_NOT_VALIDATED',
        message: 'Votre boutique n\'a pas encore été validée par l\'administrateur.',
        statusCode: 403
    },
    BOUTIQUE_REJECTED: {
        code: 'BOUTIQUE_REJECTED',
        message: 'Votre demande de boutique a été rejetée.',
        statusCode: 403
    }
};

/**
 * Factory function pour créer un middleware de vérification de rôle
 * 
 * @param {...string} roles - Liste des rôles autorisés
 * @returns {Function} Middleware Express
 * 
 * @example
 * // Route accessible uniquement aux admins
 * router.get('/admin-only', auth, checkRole('ADMIN'), controller);
 * 
 * @example
 * // Route accessible aux admins et boutiques
 * router.get('/manage', auth, checkRole('ADMIN', 'BOUTIQUE'), controller);
 */
const checkRole = (...roles) => {
    return (req, res, next) => {
        try {
            // Vérifier que l'utilisateur existe (middleware auth appelé avant)
            if (!req.user) {
                return res.status(ROLE_ERRORS.NO_USER.statusCode).json({
                    success: false,
                    message: ROLE_ERRORS.NO_USER.message,
                    error: ROLE_ERRORS.NO_USER.code
                });
            }

            // Vérifier que le rôle est autorisé
            if (!roles.includes(req.user.role)) {
                return res.status(ROLE_ERRORS.FORBIDDEN.statusCode).json({
                    success: false,
                    message: ROLE_ERRORS.FORBIDDEN.message,
                    error: ROLE_ERRORS.FORBIDDEN.code,
                    requiredRoles: roles,
                    userRole: req.user.role
                });
            }

            // Rôle autorisé, continuer
            next();

        } catch (error) {
            console.error('Erreur middleware checkRole:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur lors de la vérification des permissions.',
                error: 'INTERNAL_SERVER_ERROR'
            });
        }
    };
};

/**
 * @desc Middleware pour vérifier que la boutique est validée
 * À utiliser après auth middleware et pour les routes BOUTIQUE
 * 
 * @param {Object} req - Objet request Express
 * @param {Object} res - Objet response Express
 * @param {Function} next - Fonction next Express
 */
const checkBoutiqueValidated = (req, res, next) => {
    try {
        // Vérifier que l'utilisateur existe
        if (!req.user) {
            return res.status(ROLE_ERRORS.NO_USER.statusCode).json({
                success: false,
                message: ROLE_ERRORS.NO_USER.message,
                error: ROLE_ERRORS.NO_USER.code
            });
        }

        // Si ce n'est pas une boutique, passer
        if (req.user.role !== 'BOUTIQUE') {
            return next();
        }

        // Vérifier que la boutique existe
        if (!req.user.boutique) {
            return res.status(ROLE_ERRORS.FORBIDDEN.statusCode).json({
                success: false,
                message: 'Données de boutique manquantes.',
                error: 'BOUTIQUE_DATA_MISSING'
            });
        }

        // Vérifier que la boutique est validée
        if (!req.user.boutique.isValidated) {
            // Vérifier si elle a été rejetée
            if (req.user.boutique.rejectedReason) {
                return res.status(ROLE_ERRORS.BOUTIQUE_REJECTED.statusCode).json({
                    success: false,
                    message: ROLE_ERRORS.BOUTIQUE_REJECTED.message,
                    error: ROLE_ERRORS.BOUTIQUE_REJECTED.code,
                    reason: req.user.boutique.rejectedReason
                });
            }

            return res.status(ROLE_ERRORS.BOUTIQUE_NOT_VALIDATED.statusCode).json({
                success: false,
                message: ROLE_ERRORS.BOUTIQUE_NOT_VALIDATED.message,
                error: ROLE_ERRORS.BOUTIQUE_NOT_VALIDATED.code
            });
        }

        // Boutique validée, continuer
        next();

    } catch (error) {
        console.error('Erreur middleware checkBoutiqueValidated:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur lors de la vérification de la boutique.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc Middleware combiné : vérifie le rôle ET la validation boutique si applicable
 * Utile pour les routes accessibles par ADMIN et BOUTIQUE (validée)
 * 
 * @param {...string} roles - Liste des rôles autorisés
 * @returns {Function} Middleware Express
 */
const checkRoleAndBoutiqueValidation = (...roles) => {
    return (req, res, next) => {
        // D'abord vérifier le rôle
        checkRole(...roles)(req, res, (err) => {
            if (err) return next(err);

            // Si le rôle est OK et que c'est une boutique, vérifier la validation
            if (req.user && req.user.role === 'BOUTIQUE') {
                return checkBoutiqueValidated(req, res, next);
            }

            next();
        });
    };
};

/**
 * @desc Middleware pour vérifier que l'utilisateur accède à ses propres ressources
 * ou est un admin
 * 
 * @param {string} paramName - Nom du paramètre contenant l'ID utilisateur
 * @returns {Function} Middleware Express
 */
const checkOwnershipOrAdmin = (paramName = 'userId') => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(ROLE_ERRORS.NO_USER.statusCode).json({
                    success: false,
                    message: ROLE_ERRORS.NO_USER.message,
                    error: ROLE_ERRORS.NO_USER.code
                });
            }

            const targetUserId = req.params[paramName];

            // Si admin, accès autorisé
            if (req.user.role === 'ADMIN') {
                return next();
            }

            // Sinon, vérifier que c'est son propre ID
            if (req.user._id.toString() !== targetUserId) {
                return res.status(ROLE_ERRORS.FORBIDDEN.statusCode).json({
                    success: false,
                    message: 'Vous ne pouvez accéder qu\'à vos propres ressources.',
                    error: 'NOT_OWNER'
                });
            }

            next();

        } catch (error) {
            console.error('Erreur middleware checkOwnershipOrAdmin:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur.',
                error: 'INTERNAL_SERVER_ERROR'
            });
        }
    };
};

module.exports = {
    checkRole,
    checkBoutiqueValidated,
    checkRoleAndBoutiqueValidation,
    checkOwnershipOrAdmin,
    ROLE_ERRORS
};