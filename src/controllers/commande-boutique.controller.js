/**
 * Commande Boutique Controller
 * 
 * Controleur pour la gestion des commandes cote boutique
 * 
 * @module controllers/commande-boutique.controller
 */

const Commande = require('../models/Commande');
const { TRANSITIONS_AUTORISEES } = require('../models/Commande');
const Produit = require('../models/Produit');
const User = require('../models/User');
const NotificationService = require('../services/notification.service');

/**
 * @desc Codes d'erreur standardises pour les operations de commande boutique
 */
const COMMANDE_BOUTIQUE_ERRORS = {
    COMMANDE_NOT_FOUND: {
        code: 'COMMANDE_NOT_FOUND',
        message: 'Commande non trouvee.',
        statusCode: 404
    },
    COMMANDE_NOT_OWNER: {
        code: 'COMMANDE_NOT_OWNER',
        message: 'Cette commande ne contient pas de produits de votre boutique.',
        statusCode: 403
    },
    STATUT_INVALID: {
        code: 'STATUT_INVALID',
        message: 'Transition de statut non autorisee.',
        statusCode: 400
    },
    NOTE_REQUIRED: {
        code: 'NOTE_REQUIRED',
        message: 'Le contenu de la note est requis.',
        statusCode: 400
    }
};

/**
 * @desc Formatter une commande pour n'afficher que les details pertinents a une boutique - HELPER
 * @param {Object} commande - La commande a formatter
 * @param {String} boutiqueId - L'ID de la boutique pour laquelle on formatte la commande
 * @param {String} baseUrl - L'URL de base du serveur pour construire les liens d'images
 * @return {Object|null} - La commande formattee pour la boutique ou null si la boutique n'est pas concernee par la commande
 */
const formatterCommandePourBoutique = (commande, boutiqueId, baseUrl) => {
    const sousCommande = commande.parBoutique.find(
        sc => sc.boutique.toString() === boutiqueId.toString()
    );

    if (!sousCommande) return null;

    return {
        _id: commande._id,
        numero: commande.numero,
        client: commande.client,
        adresseLivraison: commande.adresseLivraison,
        items: sousCommande.items.map(item => ({
            ...item.toObject ? item.toObject() : item,
            imagePrincipaleUrl: item.imagePrincipale
                ? `${baseUrl}/uploads/produits/${item.imagePrincipale}`
                : null
        })),
        sousTotal: sousCommande.sousTotal,
        total: sousCommande.total,
        statut: sousCommande.statut,
        historiqueStatuts: sousCommande.historiqueStatuts,
        notes: sousCommande.notes,
        statutGlobal: commande.statut,
        modePaiement: commande.modePaiement,
        paiementStatut: commande.paiementStatut,
        createdAt: commande.createdAt,
        updatedAt: commande.updatedAt
    };
};

/**
 * @desc Restaurer le stock des produits d'une boutique en cas d'annulation ou de rupture - HELPER
 * @param {Array} items - Les items de la sous-commande boutique contenant les references produit et quantite
 */
const restaurerStockBoutique = async (items) => {
    for (const item of items) {
        await Produit.findByIdAndUpdate(item.produit, {
            $inc: { stock: item.quantite }
        });
    }
};

/**
 * @desc    Liste des commandes recues par la boutique
 * @route   GET /api/boutique/commandes
 * @access  Private (BOUTIQUE)
 */
const getCommandes = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { page = 1, limit = 10, statut } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Filtrer par boutique dans parBoutique
        const filter = { 'parBoutique.boutique': boutiqueId };
        if (statut) {
            filter['parBoutique'] = {
                $elemMatch: {
                    boutique: boutiqueId,
                    statut: statut
                }
            };
        }

        const [commandes, total] = await Promise.all([
            Commande.find(filter)
                .populate('client', 'nom prenom email telephone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Commande.countDocuments(filter)
        ]);

        // Formatter les commandes pour cette boutique
        const commandesFormatted = commandes.map(c => {
            const formatted = formatterCommandePourBoutique(c, boutiqueId, baseUrl);
            return {
                _id: formatted._id,
                numero: c.numero,
                client: c.client,
                statut: formatted.statut,
                total: formatted.total,
                itemsCount: formatted.items.reduce((sum, i) => sum + i.quantite, 0),
                createdAt: c.createdAt
            };
        }).filter(c => c !== null);

        res.status(200).json({
            success: true,
            message: 'Liste des commandes recuperee.',
            data: {
                commandes: commandesFormatted,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getCommandes boutique:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Commandes en attente (nouvelles)
 * @route   GET /api/boutique/commandes/nouvelles
 * @access  Private (BOUTIQUE)
 */
const getNouvellesCommandes = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const commandes = await Commande.find({
            'parBoutique': {
                $elemMatch: {
                    boutique: boutiqueId,
                    statut: 'en_attente'
                }
            }
        })
            .populate('client', 'nom prenom email telephone')
            .sort({ createdAt: -1 })
            .limit(50);

        const commandesFormatted = commandes.map(c => {
            const formatted = formatterCommandePourBoutique(c, boutiqueId, baseUrl);
            return {
                _id: c._id,
                numero: c.numero,
                client: c.client,
                statut: formatted.statut,
                total: formatted.total,
                itemsCount: formatted.items.reduce((sum, i) => sum + i.quantite, 0),
                items: formatted.items,
                adresseLivraison: c.adresseLivraison,
                createdAt: c.createdAt
            };
        }).filter(c => c !== null);

        res.status(200).json({
            success: true,
            message: 'Nouvelles commandes recuperees.',
            data: {
                commandes: commandesFormatted,
                count: commandesFormatted.length
            }
        });

    } catch (error) {
        console.error('Erreur getNouvellesCommandes:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Statistiques commandes de la boutique
 * @route   GET /api/boutique/commandes/stats
 * @access  Private (BOUTIQUE)
 */
const getStats = async (req, res) => {
    try {
        const boutiqueId = req.user._id;

        const now = new Date();
        const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const debutSemaine = new Date(debutJour);
        debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

        // Aggregation pour les stats
        const statsAggregation = await Commande.aggregate([
            { $match: { 'parBoutique.boutique': boutiqueId } },
            { $unwind: '$parBoutique' },
            { $match: { 'parBoutique.boutique': boutiqueId } },
            {
                $group: {
                    _id: null,
                    totalCommandes: { $sum: 1 },
                    totalCA: { $sum: '$parBoutique.total' },
                    commandesEnAttente: {
                        $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'en_attente'] }, 1, 0] }
                    },
                    commandesConfirmees: {
                        $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'confirmee'] }, 1, 0] }
                    },
                    commandesEnPreparation: {
                        $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'en_preparation'] }, 1, 0] }
                    },
                    commandesExpediees: {
                        $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'expediee'] }, 1, 0] }
                    },
                    commandesLivrees: {
                        $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'livree'] }, 1, 0] }
                    },
                    commandesAnnulees: {
                        $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'annulee'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Stats par periode
        const [statsJour, statsSemaine, statsMois] = await Promise.all([
            Commande.aggregate([
                { $match: { 'parBoutique.boutique': boutiqueId, createdAt: { $gte: debutJour } } },
                { $unwind: '$parBoutique' },
                { $match: { 'parBoutique.boutique': boutiqueId } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        total: { $sum: '$parBoutique.total' }
                    }
                }
            ]),
            Commande.aggregate([
                { $match: { 'parBoutique.boutique': boutiqueId, createdAt: { $gte: debutSemaine } } },
                { $unwind: '$parBoutique' },
                { $match: { 'parBoutique.boutique': boutiqueId } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        total: { $sum: '$parBoutique.total' }
                    }
                }
            ]),
            Commande.aggregate([
                { $match: { 'parBoutique.boutique': boutiqueId, createdAt: { $gte: debutMois } } },
                { $unwind: '$parBoutique' },
                { $match: { 'parBoutique.boutique': boutiqueId } },
                {
                    $group: {
                        _id: null,
                        count: { $sum: 1 },
                        total: { $sum: '$parBoutique.total' }
                    }
                }
            ])
        ]);

        const stats = statsAggregation[0] || {
            totalCommandes: 0,
            totalCA: 0,
            commandesEnAttente: 0,
            commandesConfirmees: 0,
            commandesEnPreparation: 0,
            commandesExpediees: 0,
            commandesLivrees: 0,
            commandesAnnulees: 0
        };

        res.status(200).json({
            success: true,
            message: 'Statistiques recuperees.',
            data: {
                global: {
                    totalCommandes: stats.totalCommandes,
                    totalCA: stats.totalCA,
                    parStatut: {
                        en_attente: stats.commandesEnAttente,
                        confirmee: stats.commandesConfirmees,
                        en_preparation: stats.commandesEnPreparation,
                        expediee: stats.commandesExpediees,
                        livree: stats.commandesLivrees,
                        annulee: stats.commandesAnnulees
                    }
                },
                jour: {
                    commandes: statsJour[0]?.count || 0,
                    ca: statsJour[0]?.total || 0
                },
                semaine: {
                    commandes: statsSemaine[0]?.count || 0,
                    ca: statsSemaine[0]?.total || 0
                },
                mois: {
                    commandes: statsMois[0]?.count || 0,
                    ca: statsMois[0]?.total || 0
                }
            }
        });

    } catch (error) {
        console.error('Erreur getStats commandes:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Details d'une commande pour la boutique
 * @route   GET /api/boutique/commandes/:id
 * @access  Private (BOUTIQUE)
 */
const getCommandeDetails = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const commande = await Commande.findById(req.params.id)
            .populate('client', 'nom prenom email telephone');

        if (!commande) {
            return res.status(COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        const commandeFormatted = formatterCommandePourBoutique(commande, boutiqueId, baseUrl);

        if (!commandeFormatted) {
            return res.status(COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Details de la commande recuperes.',
            data: { commande: commandeFormatted }
        });

    } catch (error) {
        console.error('Erreur getCommandeDetails boutique:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de commande invalide.',
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
 * @desc    Changer le statut d'une commande
 * @route   PUT /api/boutique/commandes/:id/statut
 * @access  Private (BOUTIQUE)
 */
const changerStatut = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { statut, commentaire } = req.body;

        const commande = await Commande.findById(req.params.id);

        if (!commande) {
            return res.status(COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        const sousCommande = commande.getSousCommandeBoutique(boutiqueId);

        if (!sousCommande) {
            return res.status(COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        // Verifier la transition de statut
        if (!Commande.isTransitionAutorisee(sousCommande.statut, statut)) {
            return res.status(COMMANDE_BOUTIQUE_ERRORS.STATUT_INVALID.statusCode).json({
                success: false,
                message: `Transition de '${sousCommande.statut}' vers '${statut}' non autorisee.`,
                error: COMMANDE_BOUTIQUE_ERRORS.STATUT_INVALID.code,
                data: {
                    statutActuel: sousCommande.statut,
                    transitionsAutorisees: TRANSITIONS_AUTORISEES[sousCommande.statut]
                }
            });
        }

        // Si annulation ou rupture, restaurer le stock
        if (statut === 'annulee' || statut === 'rupture') {
            await restaurerStockBoutique(sousCommande.items);
        }

        // Mettre a jour le statut
        commande.ajouterHistoriqueStatutBoutique(boutiqueId, statut, boutiqueId, commentaire || '');
        await commande.save();

        // ========================================
        // NOTIFICATION AU CLIENT
        // ========================================
        try {
            // Recuperer le nom de la boutique
            const boutique = await User.findById(boutiqueId).select('boutique.nomBoutique');
            const nomBoutique = boutique?.boutique?.nomBoutique || 'La boutique';

            await NotificationService.notifierStatutCommande(
                commande.client,
                commande,
                statut,
                nomBoutique,
                commentaire
            );
        } catch (notifError) {
            console.error('Erreur notification client:', notifError);
            // Ne pas bloquer si notification echoue
        }

        res.status(200).json({
            success: true,
            message: `Statut mis a jour: ${statut}`,
            data: {
                numero: commande.numero,
                statut: sousCommande.statut,
                statutGlobal: commande.statut
            }
        });

    } catch (error) {
        console.error('Erreur changerStatut:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de commande invalide.',
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
 * @desc    Ajouter une note interne a une commande
 * @route   POST /api/boutique/commandes/:id/notes
 * @access  Private (BOUTIQUE)
 */
const ajouterNote = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { contenu } = req.body;

        if (!contenu || !contenu.trim()) {
            return res.status(COMMANDE_BOUTIQUE_ERRORS.NOTE_REQUIRED.statusCode).json({
                success: false,
                message: COMMANDE_BOUTIQUE_ERRORS.NOTE_REQUIRED.message,
                error: COMMANDE_BOUTIQUE_ERRORS.NOTE_REQUIRED.code
            });
        }

        const commande = await Commande.findById(req.params.id);

        if (!commande) {
            return res.status(COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        const sousCommande = commande.getSousCommandeBoutique(boutiqueId);

        if (!sousCommande) {
            return res.status(COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_BOUTIQUE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        // Ajouter la note
        commande.ajouterNoteBoutique(boutiqueId, contenu.trim(), boutiqueId);
        await commande.save();

        res.status(201).json({
            success: true,
            message: 'Note ajoutee.',
            data: {
                notes: sousCommande.notes
            }
        });

    } catch (error) {
        console.error('Erreur ajouterNote:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de commande invalide.',
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

module.exports = {
    getCommandes,
    getNouvellesCommandes,
    getStats,
    getCommandeDetails,
    changerStatut,
    ajouterNote,
    COMMANDE_BOUTIQUE_ERRORS
};