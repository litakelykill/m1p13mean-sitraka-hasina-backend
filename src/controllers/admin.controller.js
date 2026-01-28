/**
 * Admin Controller
 * 
 * Controleur pour le dashboard admin et la gestion des boutiques
 * - Statistiques globales
 * - Liste des boutiques (en attente, validees, suspendues)
 * - Actions sur les boutiques (valider, suspendre, reactiver, rejeter, supprimer)
 * 
 * @module controllers/admin.controller
 */

const User = require('../models/User');
const { deleteLocalFile } = require('../config/multer');

// ============================================
// CODES D'ERREUR
// ============================================
const ADMIN_ERRORS = {
    BOUTIQUE_NOT_FOUND: {
        code: 'BOUTIQUE_NOT_FOUND',
        message: 'Boutique non trouvee.',
        statusCode: 404
    },
    NOT_A_BOUTIQUE: {
        code: 'NOT_A_BOUTIQUE',
        message: 'Cet utilisateur n\'est pas une boutique.',
        statusCode: 400
    },
    ALREADY_VALIDATED: {
        code: 'ALREADY_VALIDATED',
        message: 'Cette boutique est deja validee.',
        statusCode: 400
    },
    ALREADY_SUSPENDED: {
        code: 'ALREADY_SUSPENDED',
        message: 'Cette boutique est deja suspendue.',
        statusCode: 400
    },
    ALREADY_ACTIVE: {
        code: 'ALREADY_ACTIVE',
        message: 'Cette boutique est deja active.',
        statusCode: 400
    },
    ALREADY_REJECTED: {
        code: 'ALREADY_REJECTED',
        message: 'Cette boutique a deja ete rejetee.',
        statusCode: 400
    },
    CANNOT_DELETE_VALIDATED: {
        code: 'CANNOT_DELETE_VALIDATED',
        message: 'Impossible de supprimer une boutique validee. Suspendez-la d\'abord.',
        statusCode: 400
    }
};

// ============================================
// HELPER : Construire l'URL avatar
// ============================================
const buildAvatarUrl = (user, req) => {
    if (!user.avatar) return null;
    return `${req.protocol}://${req.get('host')}/uploads/avatars/${user.avatar}`;
};

// ============================================
// HELPER : Formater une boutique pour la reponse
// ============================================
const formatBoutiqueResponse = (user, req) => {
    const userObj = user.toObject ? user.toObject() : user;

    // Supprimer les champs sensibles
    delete userObj.password;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpire;
    delete userObj.__v;

    // Ajouter l'URL avatar
    userObj.avatarUrl = buildAvatarUrl(userObj, req);

    return userObj;
};

// ============================================
// HELPER : Pagination
// ============================================
const getPagination = (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

// ============================================
// CONTROLLER : Dashboard Stats
// ============================================
/**
 * @desc    Recuperer les statistiques globales du dashboard
 * @route   GET /api/admin/dashboard
 * @access  Private (ADMIN)
 */
const getDashboardStats = async (req, res) => {
    try {
        // Executer toutes les requetes en parallele
        const [
            totalBoutiques,
            boutiquesEnAttente,
            boutiquesValidees,
            boutiquesSuspendues,
            totalClients,
            totalAdmins
        ] = await Promise.all([
            // Total boutiques
            User.countDocuments({ role: 'BOUTIQUE' }),

            // Boutiques en attente (non validees et actives)
            User.countDocuments({
                role: 'BOUTIQUE',
                'boutique.isValidated': false,
                isActive: true,
                'boutique.rejectedReason': null
            }),

            // Boutiques validees et actives
            User.countDocuments({
                role: 'BOUTIQUE',
                'boutique.isValidated': true,
                isActive: true
            }),

            // Boutiques suspendues
            User.countDocuments({
                role: 'BOUTIQUE',
                isActive: false
            }),

            // Total clients
            User.countDocuments({ role: 'CLIENT' }),

            // Total admins
            User.countDocuments({ role: 'ADMIN' })
        ]);

        // Boutiques rejetees
        const boutiquesRejetees = await User.countDocuments({
            role: 'BOUTIQUE',
            'boutique.rejectedReason': { $ne: null }
        });

        res.status(200).json({
            success: true,
            message: 'Statistiques recuperees avec succes.',
            data: {
                stats: {
                    boutiques: {
                        total: totalBoutiques,
                        enAttente: boutiquesEnAttente,
                        validees: boutiquesValidees,
                        suspendues: boutiquesSuspendues,
                        rejetees: boutiquesRejetees
                    },
                    utilisateurs: {
                        clients: totalClients,
                        admins: totalAdmins,
                        total: totalBoutiques + totalClients + totalAdmins
                    }
                }
            }
        });

    } catch (error) {
        console.error('Erreur getDashboardStats:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Liste boutiques en attente
// ============================================
/**
 * @desc    Recuperer la liste des boutiques en attente de validation
 * @route   GET /api/admin/boutiques/en-attente
 * @access  Private (ADMIN)
 */
const getBoutiquesEnAttente = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        // Compter le total
        const total = await User.countDocuments({
            role: 'BOUTIQUE',
            'boutique.isValidated': false,
            isActive: true,
            'boutique.rejectedReason': null
        });

        // Recuperer les boutiques
        const boutiques = await User.find({
            role: 'BOUTIQUE',
            'boutique.isValidated': false,
            isActive: true,
            'boutique.rejectedReason': null
        })
            .select('-password -resetPasswordToken -resetPasswordExpire')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Formater les reponses
        const formattedBoutiques = boutiques.map(b => formatBoutiqueResponse(b, req));

        res.status(200).json({
            success: true,
            message: 'Liste des boutiques en attente recuperee.',
            data: {
                boutiques: formattedBoutiques,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getBoutiquesEnAttente:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Liste boutiques validees
// ============================================
/**
 * @desc    Recuperer la liste des boutiques validees
 * @route   GET /api/admin/boutiques/validees
 * @access  Private (ADMIN)
 */
const getBoutiquesValidees = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        // Compter le total
        const total = await User.countDocuments({
            role: 'BOUTIQUE',
            'boutique.isValidated': true,
            isActive: true
        });

        // Recuperer les boutiques
        const boutiques = await User.find({
            role: 'BOUTIQUE',
            'boutique.isValidated': true,
            isActive: true
        })
            .select('-password -resetPasswordToken -resetPasswordExpire')
            .populate('boutique.validatedBy', 'nom prenom email')
            .sort({ 'boutique.validatedAt': -1 })
            .skip(skip)
            .limit(limit);

        // Formater les reponses
        const formattedBoutiques = boutiques.map(b => formatBoutiqueResponse(b, req));

        res.status(200).json({
            success: true,
            message: 'Liste des boutiques validees recuperee.',
            data: {
                boutiques: formattedBoutiques,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getBoutiquesValidees:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Liste boutiques suspendues
// ============================================
/**
 * @desc    Recuperer la liste des boutiques suspendues
 * @route   GET /api/admin/boutiques/suspendues
 * @access  Private (ADMIN)
 */
const getBoutiquesSuspendues = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        // Compter le total
        const total = await User.countDocuments({
            role: 'BOUTIQUE',
            isActive: false
        });

        // Recuperer les boutiques
        const boutiques = await User.find({
            role: 'BOUTIQUE',
            isActive: false
        })
            .select('-password -resetPasswordToken -resetPasswordExpire')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        // Formater les reponses
        const formattedBoutiques = boutiques.map(b => formatBoutiqueResponse(b, req));

        res.status(200).json({
            success: true,
            message: 'Liste des boutiques suspendues recuperee.',
            data: {
                boutiques: formattedBoutiques,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getBoutiquesSuspendues:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Liste boutiques rejetees
// ============================================
/**
 * @desc    Recuperer la liste des boutiques rejetees
 * @route   GET /api/admin/boutiques/rejetees
 * @access  Private (ADMIN)
 */
const getBoutiquesRejetees = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        // Compter le total
        const total = await User.countDocuments({
            role: 'BOUTIQUE',
            'boutique.rejectedReason': { $ne: null }
        });

        // Recuperer les boutiques
        const boutiques = await User.find({
            role: 'BOUTIQUE',
            'boutique.rejectedReason': { $ne: null }
        })
            .select('-password -resetPasswordToken -resetPasswordExpire')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        // Formater les reponses
        const formattedBoutiques = boutiques.map(b => formatBoutiqueResponse(b, req));

        res.status(200).json({
            success: true,
            message: 'Liste des boutiques rejetees recuperee.',
            data: {
                boutiques: formattedBoutiques,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getBoutiquesRejetees:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Details d'une boutique
// ============================================
/**
 * @desc    Recuperer les details d'une boutique
 * @route   GET /api/admin/boutiques/:id
 * @access  Private (ADMIN)
 */
const getBoutiqueDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Recuperer la boutique
        const boutique = await User.findById(id)
            .select('-password -resetPasswordToken -resetPasswordExpire')
            .populate('boutique.validatedBy', 'nom prenom email');

        if (!boutique) {
            return res.status(ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Verifier que c'est bien une boutique
        if (boutique.role !== 'BOUTIQUE') {
            return res.status(ADMIN_ERRORS.NOT_A_BOUTIQUE.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.NOT_A_BOUTIQUE.message,
                error: ADMIN_ERRORS.NOT_A_BOUTIQUE.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Details de la boutique recuperes.',
            data: {
                boutique: formatBoutiqueResponse(boutique, req)
            }
        });

    } catch (error) {
        console.error('Erreur getBoutiqueDetails:', error);

        // Erreur si ID invalide
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de boutique invalide.',
                error: 'INVALID_ID'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Valider une boutique
// ============================================
/**
 * @desc    Valider une boutique
 * @route   PUT /api/admin/boutiques/:id/valider
 * @access  Private (ADMIN)
 */
const validerBoutique = async (req, res) => {
    try {
        const { id } = req.params;

        // Recuperer la boutique
        const boutique = await User.findById(id);

        if (!boutique) {
            return res.status(ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Verifier que c'est bien une boutique
        if (boutique.role !== 'BOUTIQUE') {
            return res.status(ADMIN_ERRORS.NOT_A_BOUTIQUE.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.NOT_A_BOUTIQUE.message,
                error: ADMIN_ERRORS.NOT_A_BOUTIQUE.code
            });
        }

        // Verifier si deja validee
        if (boutique.boutique && boutique.boutique.isValidated) {
            return res.status(ADMIN_ERRORS.ALREADY_VALIDATED.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.ALREADY_VALIDATED.message,
                error: ADMIN_ERRORS.ALREADY_VALIDATED.code
            });
        }

        // Valider la boutique
        boutique.boutique.isValidated = true;
        boutique.boutique.validatedBy = req.user._id;
        boutique.boutique.validatedAt = new Date();
        boutique.boutique.rejectedReason = null; // Effacer le rejet si existant
        boutique.isActive = true; // S'assurer que le compte est actif

        await boutique.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Boutique validee avec succes.',
            data: {
                boutique: formatBoutiqueResponse(boutique, req)
            }
        });

    } catch (error) {
        console.error('Erreur validerBoutique:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de boutique invalide.',
                error: 'INVALID_ID'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Suspendre une boutique
// ============================================
/**
 * @desc    Suspendre une boutique
 * @route   PUT /api/admin/boutiques/:id/suspendre
 * @access  Private (ADMIN)
 */
const suspendreBoutique = async (req, res) => {
    try {
        const { id } = req.params;

        // Recuperer la boutique
        const boutique = await User.findById(id);

        if (!boutique) {
            return res.status(ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Verifier que c'est bien une boutique
        if (boutique.role !== 'BOUTIQUE') {
            return res.status(ADMIN_ERRORS.NOT_A_BOUTIQUE.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.NOT_A_BOUTIQUE.message,
                error: ADMIN_ERRORS.NOT_A_BOUTIQUE.code
            });
        }

        // Verifier si deja suspendue
        if (!boutique.isActive) {
            return res.status(ADMIN_ERRORS.ALREADY_SUSPENDED.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.ALREADY_SUSPENDED.message,
                error: ADMIN_ERRORS.ALREADY_SUSPENDED.code
            });
        }

        // Suspendre la boutique
        boutique.isActive = false;

        await boutique.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Boutique suspendue avec succes.',
            data: {
                boutique: formatBoutiqueResponse(boutique, req)
            }
        });

    } catch (error) {
        console.error('Erreur suspendreBoutique:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de boutique invalide.',
                error: 'INVALID_ID'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Reactiver une boutique
// ============================================
/**
 * @desc    Reactiver une boutique suspendue
 * @route   PUT /api/admin/boutiques/:id/reactiver
 * @access  Private (ADMIN)
 */
const reactiverBoutique = async (req, res) => {
    try {
        const { id } = req.params;

        // Recuperer la boutique
        const boutique = await User.findById(id);

        if (!boutique) {
            return res.status(ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Verifier que c'est bien une boutique
        if (boutique.role !== 'BOUTIQUE') {
            return res.status(ADMIN_ERRORS.NOT_A_BOUTIQUE.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.NOT_A_BOUTIQUE.message,
                error: ADMIN_ERRORS.NOT_A_BOUTIQUE.code
            });
        }

        // Verifier si deja active
        if (boutique.isActive) {
            return res.status(ADMIN_ERRORS.ALREADY_ACTIVE.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.ALREADY_ACTIVE.message,
                error: ADMIN_ERRORS.ALREADY_ACTIVE.code
            });
        }

        // Reactiver la boutique
        boutique.isActive = true;

        await boutique.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Boutique reactivee avec succes.',
            data: {
                boutique: formatBoutiqueResponse(boutique, req)
            }
        });

    } catch (error) {
        console.error('Erreur reactiverBoutique:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de boutique invalide.',
                error: 'INVALID_ID'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Rejeter une boutique
// ============================================
/**
 * @desc    Rejeter une demande de boutique avec raison
 * @route   PUT /api/admin/boutiques/:id/rejeter
 * @access  Private (ADMIN)
 */
const rejeterBoutique = async (req, res) => {
    try {
        const { id } = req.params;
        const { raison } = req.body;

        // Recuperer la boutique
        const boutique = await User.findById(id);

        if (!boutique) {
            return res.status(ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Verifier que c'est bien une boutique
        if (boutique.role !== 'BOUTIQUE') {
            return res.status(ADMIN_ERRORS.NOT_A_BOUTIQUE.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.NOT_A_BOUTIQUE.message,
                error: ADMIN_ERRORS.NOT_A_BOUTIQUE.code
            });
        }

        // Verifier si deja validee (ne peut pas rejeter une boutique validee)
        if (boutique.boutique && boutique.boutique.isValidated) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de rejeter une boutique deja validee. Suspendez-la a la place.',
                error: 'CANNOT_REJECT_VALIDATED'
            });
        }

        // Rejeter la boutique
        boutique.boutique.isValidated = false;
        boutique.boutique.rejectedReason = raison;

        await boutique.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Boutique rejetee avec succes.',
            data: {
                boutique: formatBoutiqueResponse(boutique, req)
            }
        });

    } catch (error) {
        console.error('Erreur rejeterBoutique:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de boutique invalide.',
                error: 'INVALID_ID'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// CONTROLLER : Supprimer une boutique
// ============================================
/**
 * @desc    Supprimer une boutique
 * @route   DELETE /api/admin/boutiques/:id
 * @access  Private (ADMIN)
 */
const deleteBoutique = async (req, res) => {
    try {
        const { id } = req.params;

        // Recuperer la boutique
        const boutique = await User.findById(id);

        if (!boutique) {
            return res.status(ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: ADMIN_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Verifier que c'est bien une boutique
        if (boutique.role !== 'BOUTIQUE') {
            return res.status(ADMIN_ERRORS.NOT_A_BOUTIQUE.statusCode).json({
                success: false,
                message: ADMIN_ERRORS.NOT_A_BOUTIQUE.message,
                error: ADMIN_ERRORS.NOT_A_BOUTIQUE.code
            });
        }

        // Supprimer l'avatar si existe
        if (boutique.avatar) {
            try {
                await deleteLocalFile(`./uploads/avatars/${boutique.avatar}`);
            } catch (deleteError) {
                console.error('Erreur suppression avatar:', deleteError);
            }
        }

        // Supprimer la boutique
        await User.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Boutique supprimee avec succes.',
            data: {
                deletedId: id
            }
        });

    } catch (error) {
        console.error('Erreur deleteBoutique:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de boutique invalide.',
                error: 'INVALID_ID'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
    getDashboardStats,
    getBoutiquesEnAttente,
    getBoutiquesValidees,
    getBoutiquesSuspendues,
    getBoutiquesRejetees,
    getBoutiqueDetails,
    validerBoutique,
    suspendreBoutique,
    reactiverBoutique,
    rejeterBoutique,
    deleteBoutique,
    ADMIN_ERRORS
};