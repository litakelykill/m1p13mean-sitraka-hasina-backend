/**
 * Commande Boutique Controller
 * 
 * Controleur pour les commandes cote boutique
 * 
 * @module controllers/commande-boutique.controller
 */

const Commande = require('../models/Commande');
const Produit = require('../models/Produit');

/**
 * @desc Codes d'erreur pour les commandes boutique
 */
const COMMANDE_ERRORS = {
    COMMANDE_NOT_FOUND: {
        code: 'COMMANDE_NOT_FOUND',
        message: 'Commande non trouvee.',
        statusCode: 404
    },
    COMMANDE_NOT_OWNER: {
        code: 'COMMANDE_NOT_OWNER',
        message: 'Cette commande ne concerne pas votre boutique.',
        statusCode: 403
    },
    STATUT_INVALID: {
        code: 'STATUT_INVALID',
        message: 'Transition de statut non autorisee.',
        statusCode: 400
    }
};

/**
 * @desc    Liste des commandes recues par la boutique
 * @route   GET /api/boutique/commandes
 * @access  Private (BOUTIQUE)
 */
const listeCommandes = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const {
            page = 1,
            limit = 10,
            statut = 'toutes',
            dateDebut,
            dateFin
        } = req.query;

        // Construire la requete
        const query = {
            'parBoutique.boutique': boutiqueId
        };

        // Filtre par statut de la sous-commande
        if (statut && statut !== 'toutes') {
            query['parBoutique'] = {
                $elemMatch: {
                    boutique: boutiqueId,
                    statut: statut
                }
            };
        }

        // Filtre par date
        if (dateDebut || dateFin) {
            query.createdAt = {};
            if (dateDebut) {
                query.createdAt.$gte = new Date(dateDebut);
            }
            if (dateFin) {
                query.createdAt.$lte = new Date(dateFin);
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [commandes, total] = await Promise.all([
            Commande.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('client', 'nom prenom email')
                .lean(),
            Commande.countDocuments(query)
        ]);

        // Extraire uniquement les informations pertinentes pour cette boutique
        const commandesFormatees = commandes.map(cmd => {
            const sousCommande = cmd.parBoutique.find(
                sc => sc.boutique.toString() === boutiqueId.toString()
            );

            return {
                _id: cmd._id,
                numero: cmd.numero,
                client: {
                    nom: cmd.client?.nom,
                    prenom: cmd.client?.prenom,
                    email: cmd.client?.email
                },
                statut: sousCommande?.statut || cmd.statut,
                itemsCount: sousCommande?.items.reduce((sum, i) => sum + i.quantite, 0) || 0,
                sousTotal: sousCommande?.sousTotal || 0,
                adresseLivraison: {
                    ville: cmd.adresseLivraison.ville,
                    codePostal: cmd.adresseLivraison.codePostal
                },
                createdAt: cmd.createdAt
            };
        });

        res.status(200).json({
            success: true,
            message: 'Liste des commandes recuperee.',
            data: {
                commandes: commandesFormatees,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Erreur listeCommandes boutique:', error);
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
const commandesNouvelles = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const query = {
            'parBoutique': {
                $elemMatch: {
                    boutique: boutiqueId,
                    statut: 'en_attente'
                }
            }
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [commandes, total] = await Promise.all([
            Commande.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('client', 'nom prenom email telephone')
                .lean(),
            Commande.countDocuments(query)
        ]);

        // Formater les commandes
        const commandesFormatees = commandes.map(cmd => {
            const sousCommande = cmd.parBoutique.find(
                sc => sc.boutique.toString() === boutiqueId.toString()
            );

            return {
                _id: cmd._id,
                numero: cmd.numero,
                client: {
                    nom: cmd.client?.nom,
                    prenom: cmd.client?.prenom,
                    telephone: cmd.client?.telephone
                },
                items: sousCommande?.items || [],
                sousTotal: sousCommande?.sousTotal || 0,
                adresseLivraison: cmd.adresseLivraison,
                createdAt: cmd.createdAt
            };
        });

        res.status(200).json({
            success: true,
            message: 'Commandes en attente recuperees.',
            data: {
                commandes: commandesFormatees,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Erreur commandesNouvelles:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Statistiques des commandes
 * @route   GET /api/boutique/commandes/stats
 * @access  Private (BOUTIQUE)
 */
const statsCommandes = async (req, res) => {
    try {
        const boutiqueId = req.user._id;

        const now = new Date();
        const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const debutSemaine = new Date(now);
        debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
        debutSemaine.setHours(0, 0, 0, 0);
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

        // Agregation pour les statistiques
        const stats = await Commande.aggregate([
            {
                $match: {
                    'parBoutique.boutique': boutiqueId
                }
            },
            {
                $unwind: '$parBoutique'
            },
            {
                $match: {
                    'parBoutique.boutique': boutiqueId
                }
            },
            {
                $group: {
                    _id: null,
                    totalCommandes: { $sum: 1 },
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
                    },
                    chiffreAffairesTotal: {
                        $sum: {
                            $cond: [
                                { $in: ['$parBoutique.statut', ['confirmee', 'en_preparation', 'expediee', 'livree']] },
                                '$parBoutique.sousTotal',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Statistiques par periode
        const statsPeriode = await Commande.aggregate([
            {
                $match: {
                    'parBoutique.boutique': boutiqueId,
                    'parBoutique.statut': { $in: ['confirmee', 'en_preparation', 'expediee', 'livree'] }
                }
            },
            {
                $unwind: '$parBoutique'
            },
            {
                $match: {
                    'parBoutique.boutique': boutiqueId,
                    'parBoutique.statut': { $in: ['confirmee', 'en_preparation', 'expediee', 'livree'] }
                }
            },
            {
                $facet: {
                    jour: [
                        { $match: { createdAt: { $gte: debutJour } } },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                montant: { $sum: '$parBoutique.sousTotal' }
                            }
                        }
                    ],
                    semaine: [
                        { $match: { createdAt: { $gte: debutSemaine } } },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                montant: { $sum: '$parBoutique.sousTotal' }
                            }
                        }
                    ],
                    mois: [
                        { $match: { createdAt: { $gte: debutMois } } },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: 1 },
                                montant: { $sum: '$parBoutique.sousTotal' }
                            }
                        }
                    ]
                }
            }
        ]);

        const globalStats = stats[0] || {
            totalCommandes: 0,
            commandesEnAttente: 0,
            commandesConfirmees: 0,
            commandesEnPreparation: 0,
            commandesExpediees: 0,
            commandesLivrees: 0,
            commandesAnnulees: 0,
            chiffreAffairesTotal: 0
        };

        const periodeStats = statsPeriode[0] || { jour: [], semaine: [], mois: [] };

        res.status(200).json({
            success: true,
            message: 'Statistiques des commandes recuperees.',
            data: {
                global: globalStats,
                parStatut: {
                    en_attente: globalStats.commandesEnAttente,
                    confirmee: globalStats.commandesConfirmees,
                    en_preparation: globalStats.commandesEnPreparation,
                    expediee: globalStats.commandesExpediees,
                    livree: globalStats.commandesLivrees,
                    annulee: globalStats.commandesAnnulees
                },
                periode: {
                    jour: {
                        commandes: periodeStats.jour[0]?.count || 0,
                        chiffreAffaires: periodeStats.jour[0]?.montant || 0
                    },
                    semaine: {
                        commandes: periodeStats.semaine[0]?.count || 0,
                        chiffreAffaires: periodeStats.semaine[0]?.montant || 0
                    },
                    mois: {
                        commandes: periodeStats.mois[0]?.count || 0,
                        chiffreAffaires: periodeStats.mois[0]?.montant || 0
                    }
                }
            }
        });

    } catch (error) {
        console.error('Erreur statsCommandes:', error);
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
const detailsCommande = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { id } = req.params;

        const commande = await Commande.findById(id)
            .populate('client', 'nom prenom email telephone')
            .lean();

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        // Trouver la sous-commande de cette boutique
        const sousCommande = commande.parBoutique.find(
            sc => sc.boutique.toString() === boutiqueId.toString()
        );

        if (!sousCommande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Details de la commande recuperes.',
            data: {
                commande: {
                    _id: commande._id,
                    numero: commande.numero,
                    client: commande.client,
                    adresseLivraison: commande.adresseLivraison,
                    items: sousCommande.items,
                    sousTotal: sousCommande.sousTotal,
                    statut: sousCommande.statut,
                    historiqueStatuts: sousCommande.historiqueStatuts,
                    notes: sousCommande.notes,
                    modePaiement: commande.modePaiement,
                    paiementStatut: commande.paiementStatut,
                    createdAt: commande.createdAt,
                    updatedAt: commande.updatedAt
                }
            }
        });

    } catch (error) {
        console.error('Erreur detailsCommande boutique:', error);
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
        const { id } = req.params;
        const { statut, commentaire = '' } = req.body;

        const commande = await Commande.findById(id);

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        // Trouver la sous-commande de cette boutique
        const sousCommandeIndex = commande.parBoutique.findIndex(
            sc => sc.boutique.toString() === boutiqueId.toString()
        );

        if (sousCommandeIndex === -1) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        const sousCommande = commande.parBoutique[sousCommandeIndex];

        // Verifier que la transition est autorisee
        if (!Commande.transitionAutorisee(sousCommande.statut, statut)) {
            return res.status(COMMANDE_ERRORS.STATUT_INVALID.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.STATUT_INVALID.message,
                error: COMMANDE_ERRORS.STATUT_INVALID.code,
                details: `Transition de "${sousCommande.statut}" vers "${statut}" non autorisee.`
            });
        }

        // Mettre a jour le statut de la sous-commande
        sousCommande.statut = statut;
        sousCommande.historiqueStatuts.push({
            statut,
            date: new Date(),
            commentaire,
            auteur: boutiqueId
        });

        // Si annulation ou rupture, restaurer le stock
        if (statut === 'annulee' || statut === 'rupture') {
            for (const item of sousCommande.items) {
                await Produit.findByIdAndUpdate(item.produit, {
                    $inc: { stock: item.quantite }
                });
            }
        }

        // Recalculer le statut global
        const nouveauStatutGlobal = commande.calculerStatutGlobal();
        if (commande.statut !== nouveauStatutGlobal) {
            commande.statut = nouveauStatutGlobal;
            commande.historiqueStatuts.push({
                statut: nouveauStatutGlobal,
                date: new Date(),
                commentaire: 'Mise a jour automatique suite au changement de statut d\'une boutique',
                auteur: boutiqueId
            });
        }

        await commande.save();

        res.status(200).json({
            success: true,
            message: `Statut mis a jour: ${statut}`,
            data: {
                commande: {
                    _id: commande._id,
                    numero: commande.numero,
                    statutBoutique: statut,
                    statutGlobal: commande.statut
                }
            }
        });

    } catch (error) {
        console.error('Erreur changerStatut:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Ajouter une note interne
 * @route   POST /api/boutique/commandes/:id/notes
 * @access  Private (BOUTIQUE)
 */
const ajouterNote = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { id } = req.params;
        const { contenu } = req.body;

        const commande = await Commande.findById(id);

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        // Trouver la sous-commande de cette boutique
        const sousCommandeIndex = commande.parBoutique.findIndex(
            sc => sc.boutique.toString() === boutiqueId.toString()
        );

        if (sousCommandeIndex === -1) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        // Ajouter la note a la sous-commande
        const nouvelleNote = {
            contenu,
            date: new Date(),
            auteur: boutiqueId
        };

        commande.parBoutique[sousCommandeIndex].notes.push(nouvelleNote);
        await commande.save();

        res.status(201).json({
            success: true,
            message: 'Note ajoutee avec succes.',
            data: {
                note: nouvelleNote
            }
        });

    } catch (error) {
        console.error('Erreur ajouterNote:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    listeCommandes,
    commandesNouvelles,
    statsCommandes,
    detailsCommande,
    changerStatut,
    ajouterNote,
    COMMANDE_ERRORS
};