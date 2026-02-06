/**
 * Dashboard Boutique Controller
 * 
 * Controleur pour le tableau de bord des boutiques
 * 
 * @module controllers/dashboard-boutique.controller
 */

const Produit = require('../models/Produit');
const Commande = require('../models/Commande');
const Categorie = require('../models/Categorie');

/**
 * @desc    Recuperer les statistiques globales de la boutique
 * @route   GET /api/boutique/dashboard
 * @access  Private (BOUTIQUE)
 */
const getStats = async (req, res) => {
    try {
        const boutiqueId = req.user._id;

        const now = new Date();
        const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

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

        // Stats commandes
        let statsCommandes = {
            enAttente: 0,
            duJour: 0,
            caJour: 0,
            caMois: 0
        };

        try {
            const commandesStats = await Commande.aggregate([
                {
                    $match: { 'parBoutique.boutique': boutiqueId }
                },
                { $unwind: '$parBoutique' },
                { $match: { 'parBoutique.boutique': boutiqueId } },
                {
                    $facet: {
                        enAttente: [
                            { $match: { 'parBoutique.statut': 'en_attente' } },
                            { $count: 'count' }
                        ],
                        jour: [
                            {
                                $match: {
                                    createdAt: { $gte: debutJour },
                                    'parBoutique.statut': { $nin: ['annulee', 'rupture'] }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    count: { $sum: 1 },
                                    ca: { $sum: '$parBoutique.sousTotal' }
                                }
                            }
                        ],
                        mois: [
                            {
                                $match: {
                                    createdAt: { $gte: debutMois },
                                    'parBoutique.statut': { $nin: ['annulee', 'rupture'] }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    ca: { $sum: '$parBoutique.sousTotal' }
                                }
                            }
                        ]
                    }
                }
            ]);

            if (commandesStats[0]) {
                const cs = commandesStats[0];
                statsCommandes = {
                    enAttente: cs.enAttente[0]?.count || 0,
                    duJour: cs.jour[0]?.count || 0,
                    caJour: cs.jour[0]?.ca || 0,
                    caMois: cs.mois[0]?.ca || 0
                };
            }
        } catch (err) {
            // Si le modele Commande n'existe pas encore, on garde les valeurs par defaut
            console.log('Stats commandes non disponibles:', err.message);
        }

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
                    }
                },
                commandes: statsCommandes
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

        const now = new Date();
        const debutJour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

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

        // Stats commandes pour resume
        let commandesEnAttente = 0;
        let commandesJour = 0;
        let caJour = 0;
        let caMois = 0;

        try {
            const [enAttenteCount, statsJour, statsMois] = await Promise.all([
                Commande.countDocuments({
                    'parBoutique': { $elemMatch: { boutique: boutiqueId, statut: 'en_attente' } }
                }),
                Commande.aggregate([
                    { $match: { 'parBoutique.boutique': boutiqueId, createdAt: { $gte: debutJour } } },
                    { $unwind: '$parBoutique' },
                    { $match: { 'parBoutique.boutique': boutiqueId, 'parBoutique.statut': { $nin: ['annulee', 'rupture'] } } },
                    { $group: { _id: null, count: { $sum: 1 }, montant: { $sum: '$parBoutique.sousTotal' } } }
                ]),
                Commande.aggregate([
                    { $match: { 'parBoutique.boutique': boutiqueId, createdAt: { $gte: debutMois } } },
                    { $unwind: '$parBoutique' },
                    { $match: { 'parBoutique.boutique': boutiqueId, 'parBoutique.statut': { $nin: ['annulee', 'rupture'] } } },
                    { $group: { _id: null, montant: { $sum: '$parBoutique.sousTotal' } } }
                ])
            ]);

            commandesEnAttente = enAttenteCount;
            commandesJour = statsJour[0]?.count || 0;
            caJour = statsJour[0]?.montant || 0;
            caMois = statsMois[0]?.montant || 0;
        } catch (err) {
            console.log('Stats commandes non disponibles:', err.message);
        }

        res.status(200).json({
            success: true,
            data: {
                produits: total,
                actifs: actifs,
                alertes: stockFaible + enRupture,
                promos: enPromo,
                commandesEnAttente,
                commandesJour,
                caJour,
                caMois
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
 * @desc    Dernieres commandes
 * @route   GET /api/boutique/dashboard/dernieres-commandes
 * @access  Private (BOUTIQUE)
 */
const getDernieresCommandes = async (req, res) => {
    try {
        const boutiqueId = req.user._id;
        const { limit = 5 } = req.query;

        const commandes = await Commande.find({
            'parBoutique.boutique': boutiqueId
        })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate('client', 'nom prenom')
            .lean();

        const commandesFormatees = commandes.map(cmd => {
            const sousCommande = cmd.parBoutique.find(
                sc => sc.boutique.toString() === boutiqueId.toString()
            );

            return {
                _id: cmd._id,
                numero: cmd.numero,
                client: {
                    nom: cmd.client?.nom,
                    prenom: cmd.client?.prenom
                },
                statut: sousCommande?.statut || cmd.statut,
                sousTotal: sousCommande?.sousTotal || 0,
                itemsCount: sousCommande?.items.reduce((sum, i) => sum + i.quantite, 0) || 0,
                createdAt: cmd.createdAt
            };
        });

        res.status(200).json({
            success: true,
            message: 'Dernieres commandes recuperees.',
            data: {
                commandes: commandesFormatees
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

module.exports = {
    getStats,
    getAlertesStock,
    getProduitsParCategorie,
    getResume,
    getDernieresCommandes
};