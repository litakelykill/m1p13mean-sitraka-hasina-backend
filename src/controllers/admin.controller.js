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
const Produit = require('../models/Produit');
const Commande = require('../models/Commande');
const { deleteLocalFile } = require('../config/multer');
const NotificationService = require('../services/notification.service');

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

/**
 * @desc Construire l'URL de l'avatar d'un utilisateur
 * @param {Object} user - L'utilisateur
 * @param {Object} req - Requete Express
 * @returns {string|null} URL de l'avatar ou null si pas d'avatar
 */
const buildAvatarUrl = (user, req) => {
    if (!user.avatar) return null;
    return `${req.protocol}://${req.get('host')}/uploads/avatars/${user.avatar}`;
};

/**
 * @desc Formater une boutique pour la reponse
 * @param {Object} user - L'utilisateur
 * @param {Object} req - Requete Express
 * @returns {Object} Boutique formatee
 */
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

/**
 * @desc Extraire les parametres de pagination depuis la query
 * @param {Object} query - Objet query de la requete
 * @returns {Object} Parametres de pagination { page, limit, skip }
 */
const getPagination = (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * @desc    Recuperer les statistiques globales du dashboard
 * @route   GET /api/admin/dashboard
 * @access  Private (ADMIN)
 */
const getDashboardStats = async (req, res) => {
    try {
        // Dates pour les stats temporelles
        const now = new Date();
        const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const debutSemaine = new Date(debutJour);
        debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

        // Executer toutes les requetes en parallele
        const [
            totalBoutiques,
            boutiquesEnAttente,
            boutiquesValidees,
            boutiquesSuspendues,
            totalClients,
            totalAdmins,
            boutiquesRejetees,
            // Stats produits
            totalProduits,
            produitsActifs,
            produitsEnPromo,
            produitsEnRupture,
            // Stats commandes
            totalCommandes,
            commandesEnAttente,
            commandesConfirmees,
            commandesLivrees,
            commandesAnnulees,
            // Stats CA
            statsCA,
            statsCAJour,
            statsCAMois
        ] = await Promise.all([
            // Boutiques
            User.countDocuments({ role: 'BOUTIQUE' }),
            User.countDocuments({
                role: 'BOUTIQUE',
                'boutique.isValidated': false,
                isActive: true,
                'boutique.rejectedReason': null
            }),
            User.countDocuments({
                role: 'BOUTIQUE',
                'boutique.isValidated': true,
                isActive: true
            }),
            User.countDocuments({
                role: 'BOUTIQUE',
                isActive: false
            }),
            User.countDocuments({ role: 'CLIENT' }),
            User.countDocuments({ role: 'ADMIN' }),
            User.countDocuments({
                role: 'BOUTIQUE',
                'boutique.rejectedReason': { $ne: null }
            }),
            // Produits
            Produit.countDocuments({}),
            Produit.countDocuments({ isActive: true }),
            Produit.countDocuments({ isActive: true, enPromo: true }),
            Produit.countDocuments({ isActive: true, stock: 0 }),
            // Commandes
            Commande.countDocuments({}),
            Commande.countDocuments({ statut: 'en_attente' }),
            Commande.countDocuments({ statut: { $in: ['confirmee', 'en_preparation', 'expediee'] } }),
            Commande.countDocuments({ statut: 'livree' }),
            Commande.countDocuments({ statut: 'annulee' }),
            // CA total
            Commande.aggregate([
                { $match: { statut: { $nin: ['annulee', 'rupture'] } } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            // CA jour
            Commande.aggregate([
                { $match: { statut: { $nin: ['annulee', 'rupture'] }, createdAt: { $gte: debutJour } } },
                { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
            ]),
            // CA mois
            Commande.aggregate([
                { $match: { statut: { $nin: ['annulee', 'rupture'] }, createdAt: { $gte: debutMois } } },
                { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
            ])
        ]);

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
                        boutiques: totalBoutiques,
                        total: totalBoutiques + totalClients + totalAdmins
                    },
                    produits: {
                        total: totalProduits,
                        actifs: produitsActifs,
                        enPromo: produitsEnPromo,
                        enRupture: produitsEnRupture
                    },
                    commandes: {
                        total: totalCommandes,
                        enAttente: commandesEnAttente,
                        enCours: commandesConfirmees,
                        livrees: commandesLivrees,
                        annulees: commandesAnnulees
                    },
                    chiffreAffaires: {
                        total: statsCA[0]?.total || 0,
                        jour: statsCAJour[0]?.total || 0,
                        mois: statsCAMois[0]?.total || 0,
                        commandesJour: statsCAJour[0]?.count || 0,
                        commandesMois: statsCAMois[0]?.count || 0
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

        // ========================================
        // NOTIFICATION A LA BOUTIQUE
        // ========================================
        try {
            await NotificationService.notifierBoutiqueValidee(
                boutique._id,
                boutique.boutique.nomBoutique
            );
        } catch (notifError) {
            console.error('Erreur notification boutique validee:', notifError);
        }

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

/**
 * @desc    Recuperer les donnees pour les graphiques du dashboard
 * @route   GET /api/admin/dashboard/graphiques
 * @access  Private (ADMIN)
 */
const getDashboardGraphiques = async (req, res) => {
    try {
        const { periode = '7jours' } = req.query;

        // Determiner la plage de dates
        const now = new Date();
        let dateDebut;
        let groupBy;

        switch (periode) {
            case '30jours':
                dateDebut = new Date(now);
                dateDebut.setDate(dateDebut.getDate() - 30);
                groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                break;
            case '12mois':
                dateDebut = new Date(now);
                dateDebut.setMonth(dateDebut.getMonth() - 12);
                groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                break;
            case '7jours':
            default:
                dateDebut = new Date(now);
                dateDebut.setDate(dateDebut.getDate() - 7);
                groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                break;
        }

        // Commandes par jour/mois
        const commandesParPeriode = await Commande.aggregate([
            { $match: { createdAt: { $gte: dateDebut } } },
            {
                $group: {
                    _id: groupBy,
                    commandes: { $sum: 1 },
                    ca: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$statut', 'annulee'] },
                                        { $ne: ['$statut', 'rupture'] }
                                    ]
                                },
                                '$total',
                                0
                            ]
                        }
                    },
                    livrees: { $sum: { $cond: [{ $eq: ['$statut', 'livree'] }, 1, 0] } },
                    annulees: { $sum: { $cond: [{ $eq: ['$statut', 'annulee'] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Inscriptions par jour/mois
        const inscriptionsParPeriode = await User.aggregate([
            { $match: { createdAt: { $gte: dateDebut } } },
            {
                $group: {
                    _id: {
                        date: groupBy,
                        role: '$role'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Formatter inscriptions par role
        const inscriptionsFormatted = {};
        inscriptionsParPeriode.forEach(item => {
            const date = item._id.date;
            const role = item._id.role;
            if (!inscriptionsFormatted[date]) {
                inscriptionsFormatted[date] = { date, clients: 0, boutiques: 0 };
            }
            if (role === 'CLIENT') inscriptionsFormatted[date].clients = item.count;
            if (role === 'BOUTIQUE') inscriptionsFormatted[date].boutiques = item.count;
        });

        // Repartition produits par categorie
        const produitsParCategorie = await Produit.aggregate([
            { $match: { isActive: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'categorie',
                    foreignField: '_id',
                    as: 'categorieInfo'
                }
            },
            { $unwind: { path: '$categorieInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$categorieInfo.nom',
                    count: { $sum: 1 },
                    valeurStock: { $sum: { $multiply: ['$prix', '$stock'] } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Top boutiques par CA
        const topBoutiquesCA = await Commande.aggregate([
            { $match: { statut: { $nin: ['annulee', 'rupture'] } } },
            { $unwind: '$parBoutique' },
            {
                $group: {
                    _id: '$parBoutique.boutique',
                    ca: { $sum: '$parBoutique.total' },
                    commandes: { $sum: 1 }
                }
            },
            { $sort: { ca: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'boutiqueInfo'
                }
            },
            { $unwind: '$boutiqueInfo' },
            {
                $project: {
                    _id: 1,
                    ca: 1,
                    commandes: 1,
                    nomBoutique: '$boutiqueInfo.boutique.nomBoutique'
                }
            }
        ]);

        // Repartition commandes par statut
        const commandesParStatut = await Commande.aggregate([
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Repartition boutiques par statut
        const boutiquesParStatut = await User.aggregate([
            { $match: { role: 'BOUTIQUE' } },
            {
                $project: {
                    statut: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$isActive', false] }, then: 'suspendues' },
                                { case: { $ne: ['$boutique.rejectedReason', null] }, then: 'rejetees' },
                                { case: { $eq: ['$boutique.isValidated', true] }, then: 'validees' }
                            ],
                            default: 'en_attente'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$statut',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Donnees graphiques recuperees.',
            data: {
                periode,
                commandesParPeriode,
                inscriptionsParPeriode: Object.values(inscriptionsFormatted),
                produitsParCategorie: produitsParCategorie.map(p => ({
                    categorie: p._id || 'Sans categorie',
                    count: p.count,
                    valeurStock: p.valeurStock
                })),
                topBoutiquesCA,
                commandesParStatut: commandesParStatut.map(c => ({
                    statut: c._id,
                    count: c.count
                })),
                boutiquesParStatut: boutiquesParStatut.map(b => ({
                    statut: b._id,
                    count: b.count
                }))
            }
        });

    } catch (error) {
        console.error('Erreur getDashboardGraphiques:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    getDashboardStats,
    getDashboardGraphiques,
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