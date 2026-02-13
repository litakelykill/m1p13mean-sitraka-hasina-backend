/**
 * Avis Controller
 * 
 * Controleur pour la gestion des avis sur les boutiques
 * 
 * @module controllers/avis.controller
 */

const Avis = require('../models/Avis');
const User = require('../models/User');
const Commande = require('../models/Commande');
const mongoose = require('mongoose');
const NotificationService = require('../services/notification.service');

/**
 * Codes d'erreur pour les operations sur les avis
 */
const AVIS_ERRORS = {
    BOUTIQUE_NOT_FOUND: {
        code: 'BOUTIQUE_NOT_FOUND',
        message: 'Boutique non trouvee.',
        statusCode: 404
    },
    AVIS_NOT_FOUND: {
        code: 'AVIS_NOT_FOUND',
        message: 'Avis non trouve.',
        statusCode: 404
    },
    AVIS_ALREADY_EXISTS: {
        code: 'AVIS_ALREADY_EXISTS',
        message: 'Vous avez deja donne un avis sur cette boutique.',
        statusCode: 409
    },
    CANNOT_REVIEW_OWN_BOUTIQUE: {
        code: 'CANNOT_REVIEW_OWN_BOUTIQUE',
        message: 'Vous ne pouvez pas donner un avis sur votre propre boutique.',
        statusCode: 403
    },
    AVIS_NOT_OWNER: {
        code: 'AVIS_NOT_OWNER',
        message: 'Vous n\'etes pas l\'auteur de cet avis.',
        statusCode: 403
    },
    BOUTIQUE_NOT_OWNER: {
        code: 'BOUTIQUE_NOT_OWNER',
        message: 'Cet avis ne concerne pas votre boutique.',
        statusCode: 403
    },
    REPONSE_ALREADY_EXISTS: {
        code: 'REPONSE_ALREADY_EXISTS',
        message: 'Vous avez deja repondu a cet avis.',
        statusCode: 409
    }
};

/**
 * @desc Formatter un avis pour la reponse - HELPER
 * @param {Object} avis - L'avis a formatter
 * @param {Object} req - L'objet de requete pour construire les URLs
 * @param {String} currentUserId - ID de l'utilisateur courant pour indiquer si il a marque comme utile
 * @return {Object} Avis formatte pour la reponse
 */
const formatAvisResponse = (avis, req, currentUserId = null) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avisObj = avis.toObject ? avis.toObject() : avis;

    // Avatar client
    if (avisObj.client && avisObj.client.avatar) {
        avisObj.client.avatarUrl = `${baseUrl}/uploads/avatars/${avisObj.client.avatar}`;
    }

    // Verifier si l'utilisateur courant a marque comme utile
    if (currentUserId) {
        avisObj.marqueUtileParMoi = avisObj.marqueUtilePar?.some(
            id => id.toString() === currentUserId.toString()
        ) || false;
    }

    // Ne pas exposer la liste complete des marquages
    delete avisObj.marqueUtilePar;

    return avisObj;
};

/**
 * @desc    Donner un avis sur une boutique
 * @route   POST /api/avis
 * @access  Private (CLIENT)
 */
const donnerAvis = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { boutiqueId, note, commentaire, commandeId } = req.body;

        // Verifier que la boutique existe et est validee
        const boutique = await User.findOne({
            _id: boutiqueId,
            role: 'BOUTIQUE',
            'boutique.isValidated': true,
            isActive: true
        });

        if (!boutique) {
            return res.status(AVIS_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: AVIS_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: AVIS_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Verifier que le client n'est pas le proprietaire de la boutique
        if (boutique._id.toString() === clientId.toString()) {
            return res.status(AVIS_ERRORS.CANNOT_REVIEW_OWN_BOUTIQUE.statusCode).json({
                success: false,
                message: AVIS_ERRORS.CANNOT_REVIEW_OWN_BOUTIQUE.message,
                error: AVIS_ERRORS.CANNOT_REVIEW_OWN_BOUTIQUE.code
            });
        }

        // Verifier si le client a deja donne un avis
        const avisExistant = await Avis.clientADejaAvis(clientId, boutiqueId);
        if (avisExistant) {
            return res.status(AVIS_ERRORS.AVIS_ALREADY_EXISTS.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_ALREADY_EXISTS.message,
                error: AVIS_ERRORS.AVIS_ALREADY_EXISTS.code
            });
        }

        // Verifier si le client a commande dans cette boutique (pour badge "verifie")
        const aCommande = await Avis.clientACommande(clientId, boutiqueId);

        // Creer l'avis
        const avis = await Avis.create({
            client: clientId,
            boutique: boutiqueId,
            commande: commandeId || null,
            note,
            commentaire,
            estVerifie: aCommande,
            statut: 'approuve'
        });

        // Populer pour la reponse
        await avis.populate('client', 'nom prenom avatar');

        // ========================================
        // NOTIFICATION A LA BOUTIQUE
        // ========================================
        try {
            const clientNom = `${req.user.prenom} ${req.user.nom}`;
            await NotificationService.notifierNouvelAvis(
                boutiqueId,
                avis,
                clientNom
            );
        } catch (notifError) {
            console.error('Erreur notification nouvel avis:', notifError);
        }

        res.status(201).json({
            success: true,
            message: 'Avis enregistre avec succes.',
            data: { avis: formatAvisResponse(avis, req, clientId) }
        });

    } catch (error) {
        console.error('Erreur donnerAvis:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Vous avez deja donne un avis sur cette boutique.',
                error: 'AVIS_ALREADY_EXISTS'
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', '),
                error: 'VALIDATION_ERROR'
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
 * @desc    Modifier son avis
 * @route   PUT /api/avis/:id
 * @access  Private (CLIENT)
 */
const modifierAvis = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { note, commentaire } = req.body;

        const avis = await Avis.findById(req.params.id);

        if (!avis) {
            return res.status(AVIS_ERRORS.AVIS_NOT_FOUND.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_NOT_FOUND.message,
                error: AVIS_ERRORS.AVIS_NOT_FOUND.code
            });
        }

        // Verifier que c'est l'auteur
        if (avis.client.toString() !== clientId.toString()) {
            return res.status(AVIS_ERRORS.AVIS_NOT_OWNER.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_NOT_OWNER.message,
                error: AVIS_ERRORS.AVIS_NOT_OWNER.code
            });
        }

        // Mettre a jour
        if (note !== undefined) avis.note = note;
        if (commentaire !== undefined) avis.commentaire = commentaire;

        await avis.save();
        await avis.populate('client', 'nom prenom avatar');

        res.status(200).json({
            success: true,
            message: 'Avis modifie avec succes.',
            data: { avis: formatAvisResponse(avis, req, clientId) }
        });

    } catch (error) {
        console.error('Erreur modifierAvis:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID invalide.',
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
 * @desc    Supprimer son avis
 * @route   DELETE /api/avis/:id
 * @access  Private (CLIENT)
 */
const supprimerAvis = async (req, res) => {
    try {
        const clientId = req.user._id;

        const avis = await Avis.findById(req.params.id);

        if (!avis) {
            return res.status(AVIS_ERRORS.AVIS_NOT_FOUND.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_NOT_FOUND.message,
                error: AVIS_ERRORS.AVIS_NOT_FOUND.code
            });
        }

        // Verifier que c'est l'auteur
        if (avis.client.toString() !== clientId.toString()) {
            return res.status(AVIS_ERRORS.AVIS_NOT_OWNER.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_NOT_OWNER.message,
                error: AVIS_ERRORS.AVIS_NOT_OWNER.code
            });
        }

        await Avis.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Avis supprime avec succes.'
        });

    } catch (error) {
        console.error('Erreur supprimerAvis:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID invalide.',
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
 * @desc    Liste des avis donnes par le client
 * @route   GET /api/avis/mes-avis
 * @access  Private (CLIENT)
 */
const getMesAvis = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;

        const [avis, total] = await Promise.all([
            Avis.find({ client: clientId })
                .populate('boutique', 'boutique.nomBoutique boutique.logo')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Avis.countDocuments({ client: clientId })
        ]);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const avisFormatted = avis.map(a => {
            const obj = a.toObject();
            if (obj.boutique?.boutique?.logo) {
                obj.boutique.logoUrl = `${baseUrl}/uploads/boutiques/logos/${obj.boutique.boutique.logo}`;
            }
            return obj;
        });

        res.status(200).json({
            success: true,
            message: 'Liste des avis recuperee.',
            data: {
                avis: avisFormatted,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getMesAvis:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Marquer/Demarquer un avis comme utile
 * @route   POST /api/avis/:id/utile
 * @access  Private (CLIENT)
 */
const marquerUtile = async (req, res) => {
    try {
        const clientId = req.user._id;

        const avis = await Avis.findById(req.params.id);

        if (!avis) {
            return res.status(AVIS_ERRORS.AVIS_NOT_FOUND.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_NOT_FOUND.message,
                error: AVIS_ERRORS.AVIS_NOT_FOUND.code
            });
        }

        const estMarque = avis.marquerUtile(clientId);
        await avis.save();

        res.status(200).json({
            success: true,
            message: estMarque ? 'Avis marque comme utile.' : 'Marquage retire.',
            data: {
                marqueUtile: estMarque,
                utilesCount: avis.utilesCount
            }
        });

    } catch (error) {
        console.error('Erreur marquerUtile:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Liste des avis d'une boutique
 * @route   GET /api/avis/boutique/:boutiqueId
 * @access  Public
 */
const getAvisBoutique = async (req, res) => {
    try {
        const { boutiqueId } = req.params;
        const { page = 1, limit = 10, sort = 'recent' } = req.query;
        const currentUserId = req.user?._id;

        // Verifier que la boutique existe
        const boutique = await User.findOne({
            _id: boutiqueId,
            role: 'BOUTIQUE'
        });

        if (!boutique) {
            return res.status(AVIS_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: AVIS_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: AVIS_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Recuperer les avis
        const result = await Avis.getAvisBoutique(boutiqueId, {
            page: parseInt(page),
            limit: parseInt(limit),
            sort
        });

        // Calculer les stats
        const stats = await Avis.calculerNoteMoyenne(new mongoose.Types.ObjectId(boutiqueId));

        // Formatter les avis
        const avisFormatted = result.avis.map(a => formatAvisResponse(a, req, currentUserId));

        res.status(200).json({
            success: true,
            message: 'Avis de la boutique recuperes.',
            data: {
                stats,
                avis: avisFormatted,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: result.totalPages
                }
            }
        });

    } catch (error) {
        console.error('Erreur getAvisBoutique:', error);

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
 * @desc    Liste des avis recus par la boutique
 * @route   GET /api/boutique/avis
 * @access  Private (BOUTIQUE)
 */
const getAvisRecus = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { page = 1, limit = 10, sort = 'recent', statut } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;

        let sortOption = { createdAt: -1 };
        if (sort === 'note_desc') sortOption = { note: -1, createdAt: -1 };
        if (sort === 'note_asc') sortOption = { note: 1, createdAt: -1 };
        if (sort === 'sans_reponse') sortOption = { 'reponse.date': 1, createdAt: -1 };

        const filter = { boutique: boutiqueId };
        if (statut) filter.statut = statut;

        const [avis, total, stats] = await Promise.all([
            Avis.find(filter)
                .populate('client', 'nom prenom avatar')
                .populate('commande', 'numero')
                .sort(sortOption)
                .skip(skip)
                .limit(limitNum),
            Avis.countDocuments(filter),
            Avis.calculerNoteMoyenne(boutiqueId)
        ]);

        // Compter les avis sans reponse
        const sansReponse = await Avis.countDocuments({
            boutique: boutiqueId,
            statut: 'approuve',
            'reponse.contenu': { $exists: false }
        });

        const avisFormatted = avis.map(a => formatAvisResponse(a, req));

        res.status(200).json({
            success: true,
            message: 'Avis recus recuperes.',
            data: {
                stats: {
                    ...stats,
                    sansReponse
                },
                avis: avisFormatted,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getAvisRecus:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Repondre a un avis
 * @route   POST /api/boutique/avis/:id/reponse
 * @access  Private (BOUTIQUE)
 */
const repondreAvis = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { contenu } = req.body;

        const avis = await Avis.findById(req.params.id);

        if (!avis) {
            return res.status(AVIS_ERRORS.AVIS_NOT_FOUND.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_NOT_FOUND.message,
                error: AVIS_ERRORS.AVIS_NOT_FOUND.code
            });
        }

        // Verifier que c'est bien un avis sur cette boutique
        if (avis.boutique.toString() !== boutiqueId.toString()) {
            return res.status(AVIS_ERRORS.BOUTIQUE_NOT_OWNER.statusCode).json({
                success: false,
                message: AVIS_ERRORS.BOUTIQUE_NOT_OWNER.message,
                error: AVIS_ERRORS.BOUTIQUE_NOT_OWNER.code
            });
        }

        // Verifier si deja repondu
        if (avis.reponse && avis.reponse.contenu) {
            return res.status(AVIS_ERRORS.REPONSE_ALREADY_EXISTS.statusCode).json({
                success: false,
                message: AVIS_ERRORS.REPONSE_ALREADY_EXISTS.message,
                error: AVIS_ERRORS.REPONSE_ALREADY_EXISTS.code
            });
        }

        avis.ajouterReponse(contenu);
        await avis.save();
        await avis.populate('client', 'nom prenom avatar');

        res.status(200).json({
            success: true,
            message: 'Reponse ajoutee avec succes.',
            data: { avis: formatAvisResponse(avis, req) }
        });

    } catch (error) {
        console.error('Erreur repondreAvis:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Modifier sa reponse a un avis
 * @route   PUT /api/boutique/avis/:id/reponse
 * @access  Private (BOUTIQUE)
 */
const modifierReponse = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { contenu } = req.body;

        const avis = await Avis.findById(req.params.id);

        if (!avis) {
            return res.status(AVIS_ERRORS.AVIS_NOT_FOUND.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_NOT_FOUND.message,
                error: AVIS_ERRORS.AVIS_NOT_FOUND.code
            });
        }

        if (avis.boutique.toString() !== boutiqueId.toString()) {
            return res.status(AVIS_ERRORS.BOUTIQUE_NOT_OWNER.statusCode).json({
                success: false,
                message: AVIS_ERRORS.BOUTIQUE_NOT_OWNER.message,
                error: AVIS_ERRORS.BOUTIQUE_NOT_OWNER.code
            });
        }

        avis.reponse.contenu = contenu.trim();
        avis.reponse.date = new Date();
        await avis.save();
        await avis.populate('client', 'nom prenom avatar');

        res.status(200).json({
            success: true,
            message: 'Reponse modifiee avec succes.',
            data: { avis: formatAvisResponse(avis, req) }
        });

    } catch (error) {
        console.error('Erreur modifierReponse:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Moderer un avis (approuver/rejeter)
 * @route   PUT /api/admin/avis/:id/moderer
 * @access  Private (ADMIN)
 */
const modererAvis = async (req, res) => {
    try {
        const { statut, raison } = req.body;

        if (!['approuve', 'rejete'].includes(statut)) {
            return res.status(400).json({
                success: false,
                message: 'Statut invalide. Valeurs: approuve, rejete',
                error: 'INVALID_STATUS'
            });
        }

        const avis = await Avis.findById(req.params.id);

        if (!avis) {
            return res.status(AVIS_ERRORS.AVIS_NOT_FOUND.statusCode).json({
                success: false,
                message: AVIS_ERRORS.AVIS_NOT_FOUND.message,
                error: AVIS_ERRORS.AVIS_NOT_FOUND.code
            });
        }

        avis.statut = statut;
        if (statut === 'rejete' && raison) {
            avis.raisonModeration = raison;
        }

        await avis.save();

        res.status(200).json({
            success: true,
            message: `Avis ${statut}.`,
            data: { avis }
        });

    } catch (error) {
        console.error('Erreur modererAvis:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Liste des avis signales
 * @route   GET /api/admin/avis/signales
 * @access  Private (ADMIN)
 */
const getAvisSignales = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [avis, total] = await Promise.all([
            Avis.find({ statut: 'signale' })
                .populate('client', 'nom prenom email')
                .populate('boutique', 'boutique.nomBoutique email')
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Avis.countDocuments({ statut: 'signale' })
        ]);

        res.status(200).json({
            success: true,
            message: 'Avis signales recuperes.',
            data: {
                avis,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getAvisSignales:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    // Client
    donnerAvis,
    modifierAvis,
    supprimerAvis,
    getMesAvis,
    marquerUtile,
    // Public
    getAvisBoutique,
    // Boutique
    getAvisRecus,
    repondreAvis,
    modifierReponse,
    // Admin
    modererAvis,
    getAvisSignales,
    // Errors
    AVIS_ERRORS
};