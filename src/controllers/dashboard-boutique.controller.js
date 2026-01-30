/**
 * Dashboard Boutique Controller
 * 
 * Controleur pour le tableau de bord des boutiques
 * 
 * @module controllers/dashboard-boutique.controller
 */

const Produit = require('../models/Produit');
const Categorie = require('../models/Categorie');

/**
 * @desc    Recuperer les statistiques globales de la boutique
 * @route   GET /api/boutique/dashboard
 * @access  Private (BOUTIQUE)
 */
const getStats = async (req, res) => {
    try {
        const boutiqueId = req.user._id;

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
                // Placeholder pour futures stats commandes
                commandes: {
                    message: 'Statistiques commandes disponibles prochainement',
                    enAttente: 0,
                    duJour: 0,
                    caJour: 0,
                    caMois: 0
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

        res.status(200).json({
            success: true,
            data: {
                produits: total,
                actifs: actifs,
                alertes: stockFaible + enRupture,
                promos: enPromo
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

module.exports = {
    getStats,
    getAlertesStock,
    getProduitsParCategorie,
    getResume
};