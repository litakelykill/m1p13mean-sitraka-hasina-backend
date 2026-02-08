/**
 * Dashboard Boutique Controller
 * 
 * Controleur pour le tableau de bord des boutiques
 * 
 * @module controllers/dashboard-boutique.controller
 */

const mongoose = require('mongoose');
const Produit = require('../models/Produit');
const Categorie = require('../models/Categorie');
const Commande = require('../models/Commande');

/**
 * @desc    Recuperer les statistiques globales de la boutique
 * @route   GET /api/boutique/dashboard
 * @access  Private (BOUTIQUE)
 */
const getStats = async (req, res) => {
    try {
        const boutiqueId = req.user._id;

        // Dates pour les stats temporelles
        const now = new Date();
        const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
        const debutSemaine = new Date(debutJour);
        debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());

        // Stats produits
        const [
            totalProduits,
            produitsActifs,
            produitsInactifs,
            produitsEnPromo,
            produitsStockFaible,
            produitsEnRupture
        ] = await Promise.all([
            Produit.countDocuments({ boutique: boutiqueId }),
            Produit.countDocuments({ boutique: boutiqueId, isActive: true }),
            Produit.countDocuments({ boutique: boutiqueId, isActive: false }),
            Produit.countDocuments({ boutique: boutiqueId, enPromo: true }),
            Produit.countDocuments({
                boutique: boutiqueId,
                $expr: { $and: [{ $lte: ['$stock', '$seuilAlerte'] }, { $gt: ['$stock', 0] }] }
            }),
            Produit.countDocuments({ boutique: boutiqueId, stock: 0 })
        ]);

        // Valeur totale du stock
        const valeurStockResult = await Produit.aggregate([
            { $match: { boutique: boutiqueId } },
            {
                $group: {
                    _id: null,
                    valeurTotale: { $sum: { $multiply: ['$prix', '$stock'] } },
                    stockTotal: { $sum: '$stock' }
                }
            }
        ]);

        const valeurStock = valeurStockResult[0] || { valeurTotale: 0, stockTotal: 0 };

        // Stats commandes boutique
        const commandesStats = await Commande.aggregate([
            { $match: { 'parBoutique.boutique': boutiqueId } },
            { $unwind: '$parBoutique' },
            { $match: { 'parBoutique.boutique': boutiqueId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    enAttente: { $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'en_attente'] }, 1, 0] } },
                    confirmees: { $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'confirmee'] }, 1, 0] } },
                    enPreparation: { $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'en_preparation'] }, 1, 0] } },
                    expediees: { $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'expediee'] }, 1, 0] } },
                    livrees: { $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'livree'] }, 1, 0] } },
                    annulees: { $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'annulee'] }, 1, 0] } },
                    caTotal: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$parBoutique.statut', 'annulee'] },
                                        { $ne: ['$parBoutique.statut', 'rupture'] }
                                    ]
                                },
                                '$parBoutique.total',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Stats commandes du jour
        const commandesJour = await Commande.aggregate([
            {
                $match: {
                    'parBoutique.boutique': boutiqueId,
                    createdAt: { $gte: debutJour }
                }
            },
            { $unwind: '$parBoutique' },
            { $match: { 'parBoutique.boutique': boutiqueId } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    ca: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$parBoutique.statut', 'annulee'] },
                                        { $ne: ['$parBoutique.statut', 'rupture'] }
                                    ]
                                },
                                '$parBoutique.total',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Stats commandes du mois
        const commandesMois = await Commande.aggregate([
            {
                $match: {
                    'parBoutique.boutique': boutiqueId,
                    createdAt: { $gte: debutMois }
                }
            },
            { $unwind: '$parBoutique' },
            { $match: { 'parBoutique.boutique': boutiqueId } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    ca: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$parBoutique.statut', 'annulee'] },
                                        { $ne: ['$parBoutique.statut', 'rupture'] }
                                    ]
                                },
                                '$parBoutique.total',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const stats = commandesStats[0] || {
            total: 0, enAttente: 0, confirmees: 0, enPreparation: 0,
            expediees: 0, livrees: 0, annulees: 0, caTotal: 0
        };

        res.status(200).json({
            success: true,
            message: 'Statistiques du dashboard recuperees.',
            data: {
                stats: {
                    produits: {
                        total: totalProduits,
                        actifs: produitsActifs,
                        inactifs: produitsInactifs,
                        enPromo: produitsEnPromo,
                        stockFaible: produitsStockFaible,
                        enRupture: produitsEnRupture
                    },
                    stock: {
                        quantiteTotale: valeurStock.stockTotal,
                        valeurTotale: valeurStock.valeurTotale
                    },
                    commandes: {
                        total: stats.total,
                        enAttente: stats.enAttente,
                        enCours: stats.confirmees + stats.enPreparation + stats.expediees,
                        livrees: stats.livrees,
                        annulees: stats.annulees,
                        parStatut: {
                            en_attente: stats.enAttente,
                            confirmee: stats.confirmees,
                            en_preparation: stats.enPreparation,
                            expediee: stats.expediees,
                            livree: stats.livrees,
                            annulee: stats.annulees
                        }
                    },
                    chiffreAffaires: {
                        total: stats.caTotal,
                        jour: commandesJour[0]?.ca || 0,
                        mois: commandesMois[0]?.ca || 0,
                        commandesJour: commandesJour[0]?.count || 0,
                        commandesMois: commandesMois[0]?.count || 0
                    }
                }
            }
        });

    } catch (error) {
        console.error('Erreur getStats dashboard boutique:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Recuperer les produits en alerte stock
 * @route   GET /api/boutique/dashboard/alertes-stock
 * @access  Private (BOUTIQUE)
 */
const getAlertesStock = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Produits en stock faible (stock > 0 mais <= seuilAlerte)
        const stockFaible = await Produit.find({
            boutique: boutiqueId,
            $expr: { $and: [{ $lte: ['$stock', '$seuilAlerte'] }, { $gt: ['$stock', 0] }] }
        })
            .select('nom slug stock seuilAlerte prix imagePrincipale')
            .sort({ stock: 1 })
            .limit(20);

        // Produits en rupture (stock = 0)
        const enRupture = await Produit.find({
            boutique: boutiqueId,
            stock: 0
        })
            .select('nom slug stock prix imagePrincipale')
            .sort({ updatedAt: -1 })
            .limit(20);

        // Formatter avec URLs images
        const formatProduit = (p) => {
            const produit = p.toObject();
            produit.imagePrincipaleUrl = produit.imagePrincipale
                ? `${baseUrl}/uploads/produits/${produit.imagePrincipale}`
                : null;
            return produit;
        };

        res.status(200).json({
            success: true,
            message: 'Alertes stock recuperees.',
            data: {
                stockFaible: {
                    count: stockFaible.length,
                    produits: stockFaible.map(formatProduit)
                },
                enRupture: {
                    count: enRupture.length,
                    produits: enRupture.map(formatProduit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getAlertesStock:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Repartition des produits par categorie
 * @route   GET /api/boutique/dashboard/produits-par-categorie
 * @access  Private (BOUTIQUE)
 */
const getProduitsParCategorie = async (req, res) => {
    try {
        const boutiqueId = req.user._id;

        // Aggregation pour compter par categorie
        const repartition = await Produit.aggregate([
            { $match: { boutique: boutiqueId } },
            {
                $group: {
                    _id: '$categorie',
                    count: { $sum: 1 },
                    actifs: { $sum: { $cond: ['$isActive', 1, 0] } },
                    valeurStock: { $sum: { $multiply: ['$prix', '$stock'] } }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categorieInfo'
                }
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    actifs: 1,
                    valeurStock: 1,
                    categorie: {
                        $cond: {
                            if: { $gt: [{ $size: '$categorieInfo' }, 0] },
                            then: { $arrayElemAt: ['$categorieInfo', 0] },
                            else: { nom: 'Sans categorie', slug: null }
                        }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Formatter la reponse
        const categories = repartition.map(r => ({
            categorieId: r._id,
            nom: r.categorie.nom,
            slug: r.categorie.slug,
            produits: {
                total: r.count,
                actifs: r.actifs
            },
            valeurStock: r.valeurStock
        }));

        // Total general
        const total = categories.reduce((acc, c) => acc + c.produits.total, 0);

        res.status(200).json({
            success: true,
            message: 'Repartition par categorie recuperee.',
            data: {
                total: total,
                categories: categories
            }
        });

    } catch (error) {
        console.error('Erreur getProduitsParCategorie:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Resume rapide pour widgets
 * @route   GET /api/boutique/dashboard/resume
 * @access  Private (BOUTIQUE)
 */
const getResume = async (req, res) => {
    try {
        const boutiqueId = req.user._id;

        // Stats produits
        const [total, actifs, stockFaible, enRupture, enPromo] = await Promise.all([
            Produit.countDocuments({ boutique: boutiqueId }),
            Produit.countDocuments({ boutique: boutiqueId, isActive: true }),
            Produit.countDocuments({
                boutique: boutiqueId,
                $expr: { $and: [{ $lte: ['$stock', '$seuilAlerte'] }, { $gt: ['$stock', 0] }] }
            }),
            Produit.countDocuments({ boutique: boutiqueId, stock: 0 }),
            Produit.countDocuments({ boutique: boutiqueId, enPromo: true })
        ]);

        // Commandes en attente
        const commandesEnAttente = await Commande.countDocuments({
            'parBoutique': {
                $elemMatch: {
                    boutique: boutiqueId,
                    statut: 'en_attente'
                }
            }
        });

        // CA du jour
        const now = new Date();
        const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const caJourResult = await Commande.aggregate([
            {
                $match: {
                    'parBoutique.boutique': boutiqueId,
                    createdAt: { $gte: debutJour }
                }
            },
            { $unwind: '$parBoutique' },
            { $match: { 'parBoutique.boutique': boutiqueId } },
            {
                $group: {
                    _id: null,
                    ca: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$parBoutique.statut', 'annulee'] },
                                        { $ne: ['$parBoutique.statut', 'rupture'] }
                                    ]
                                },
                                '$parBoutique.total',
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                produits: total,
                actifs: actifs,
                alertes: stockFaible + enRupture,
                promos: enPromo,
                commandesEnAttente: commandesEnAttente,
                caJour: caJourResult[0]?.ca || 0
            }
        });

    } catch (error) {
        console.error('Erreur getResume:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Recuperer les dernieres commandes
 * @route   GET /api/boutique/dashboard/dernieres-commandes
 * @access  Private (BOUTIQUE)
 */
const getDernieresCommandes = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { limit = 10 } = req.query;
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

        const commandes = await Commande.find({
            'parBoutique.boutique': boutiqueId
        })
            .select('numero statut total createdAt parBoutique client')
            .populate('client', 'nom prenom email')
            .sort({ createdAt: -1 })
            .limit(limitNum);

        // Formatter pour cette boutique
        const commandesFormatted = commandes.map(c => {
            const sousCommande = c.parBoutique.find(
                sc => sc.boutique.toString() === boutiqueId.toString()
            );

            return {
                _id: c._id,
                numero: c.numero,
                client: c.client,
                statut: sousCommande?.statut || c.statut,
                total: sousCommande?.total || 0,
                itemsCount: sousCommande?.items?.length || 0,
                createdAt: c.createdAt
            };
        });

        res.status(200).json({
            success: true,
            message: 'Dernieres commandes recuperees.',
            data: {
                commandes: commandesFormatted
            }
        });

    } catch (error) {
        console.error('Erreur getDernieresCommandes:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Donnees pour graphique des ventes
 * @route   GET /api/boutique/dashboard/graphique-ventes
 * @access  Private (BOUTIQUE)
 */
const getGraphiqueVentes = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
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

        // Ventes par periode
        const ventesParPeriode = await Commande.aggregate([
            {
                $match: {
                    'parBoutique.boutique': boutiqueId,
                    createdAt: { $gte: dateDebut }
                }
            },
            { $unwind: '$parBoutique' },
            { $match: { 'parBoutique.boutique': boutiqueId } },
            {
                $group: {
                    _id: groupBy,
                    commandes: { $sum: 1 },
                    ca: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$parBoutique.statut', 'annulee'] },
                                        { $ne: ['$parBoutique.statut', 'rupture'] }
                                    ]
                                },
                                '$parBoutique.total',
                                0
                            ]
                        }
                    },
                    livrees: { $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'livree'] }, 1, 0] } },
                    annulees: { $sum: { $cond: [{ $eq: ['$parBoutique.statut', 'annulee'] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top produits vendus
        const topProduits = await Commande.aggregate([
            {
                $match: {
                    'parBoutique.boutique': boutiqueId,
                    'parBoutique.statut': { $nin: ['annulee', 'rupture'] }
                }
            },
            { $unwind: '$parBoutique' },
            { $match: { 'parBoutique.boutique': boutiqueId } },
            { $unwind: '$parBoutique.items' },
            {
                $group: {
                    _id: '$parBoutique.items.produit',
                    nom: { $first: '$parBoutique.items.nom' },
                    quantiteVendue: { $sum: '$parBoutique.items.quantite' },
                    caGenere: { $sum: '$parBoutique.items.sousTotal' }
                }
            },
            { $sort: { quantiteVendue: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            message: 'Donnees graphique recuperees.',
            data: {
                periode,
                ventesParPeriode,
                topProduits
            }
        });

    } catch (error) {
        console.error('Erreur getGraphiqueVentes:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    getStats,
    getAlertesStock,
    getProduitsParCategorie,
    getResume,
    getDernieresCommandes,
    getGraphiqueVentes
};