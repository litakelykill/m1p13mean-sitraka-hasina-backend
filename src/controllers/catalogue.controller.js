/**
 * Catalogue Controller
 * 
 * Controleur pour le catalogue produits (PUBLIC)
 * Accessible sans authentification
 * 
 * @module controllers/catalogue.controller
 */

const Produit = require('../models/Produit');
const Categorie = require('../models/Categorie');
const User = require('../models/User');

/**
 * Codes d'erreur pour le catalogue
 */
const CATALOGUE_ERRORS = {
    PRODUIT_NOT_FOUND: {
        code: 'PRODUIT_NOT_FOUND',
        message: 'Produit non trouve.',
        statusCode: 404
    },
    BOUTIQUE_NOT_FOUND: {
        code: 'BOUTIQUE_NOT_FOUND',
        message: 'Boutique non trouvee.',
        statusCode: 404
    },
    CATEGORIE_NOT_FOUND: {
        code: 'CATEGORIE_NOT_FOUND',
        message: 'Categorie non trouvee.',
        statusCode: 404
    }
};

/**
 * @desc    Recuperer les parametres de pagination - HELPER
 */
const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 12));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * @desc    Construire les URLs des images d'un produit - HELPER
 */
const buildImageUrls = (produit, baseUrl) => {
    const produitObj = produit.toObject ? produit.toObject() : { ...produit };

    produitObj.imagePrincipaleUrl = produitObj.imagePrincipale
        ? `${baseUrl}/uploads/produits/${produitObj.imagePrincipale}`
        : null;

    produitObj.imagesUrls = (produitObj.images || []).map(
        img => `${baseUrl}/uploads/produits/${img}`
    );

    return produitObj;
};

/**
 * @desc    Formatter les infos d'une boutique avec URLs - HELPER
 */
const formatBoutiqueInfo = (user, baseUrl) => {
    if (!user || !user.boutique) return null;

    return {
        _id: user._id,
        nomBoutique: user.boutique.nomBoutique,
        slug: user.boutique.slug || null,
        logo: user.boutique.logo,
        logoUrl: user.boutique.logo
            ? `${baseUrl}/uploads/boutiques/logos/${user.boutique.logo}`
            : null,
        description: user.boutique.description,
        categorie: user.boutique.categorie
    };
};

/**
 * @desc    Recuperer les IDs des boutiques validees - HELPER
 */
const getBoutiquesValideesIds = async () => {
    const boutiques = await User.find({
        role: 'BOUTIQUE',
        'boutique.isValidated': true,
        isActive: true
    }).select('_id');

    return boutiques.map(b => b._id);
};

/**
 * @desc    Liste des produits avec filtres et pagination
 * @route   GET /api/catalogue/produits
 * @access  Public
 */
const getProduits = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { categorie, boutique, prixMin, prixMax, enPromo, search, sort } = req.query;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Recuperer les IDs des boutiques validees
        const boutiquesValideesIds = await getBoutiquesValideesIds();

        // Construire le filtre de base
        const filter = {
            isActive: true,
            boutique: { $in: boutiquesValideesIds }
        };

        // Filtre par categorie
        if (categorie) {
            filter.categorie = categorie;
        }

        // Filtre par boutique
        if (boutique) {
            // Verifier que la boutique est dans la liste des validees
            if (boutiquesValideesIds.some(id => id.toString() === boutique)) {
                filter.boutique = boutique;
            } else {
                // Boutique non validee, retourner liste vide
                return res.status(200).json({
                    success: true,
                    data: {
                        produits: [],
                        pagination: { page, limit, total: 0, totalPages: 0 },
                        filtres: { categorie, boutique, prixMin, prixMax, enPromo }
                    }
                });
            }
        }

        // Filtre par prix
        if (prixMin || prixMax) {
            filter.prix = {};
            if (prixMin) filter.prix.$gte = parseFloat(prixMin);
            if (prixMax) filter.prix.$lte = parseFloat(prixMax);
        }

        // Filtre par promotion
        if (enPromo === 'true') {
            filter.enPromo = true;
        }

        // Recherche par mot-cle
        if (search) {
            filter.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Construire le tri
        let sortOption = { createdAt: -1 }; // Par defaut: plus recents
        switch (sort) {
            case 'prix_asc':
                sortOption = { prix: 1 };
                break;
            case 'prix_desc':
                sortOption = { prix: -1 };
                break;
            case 'recent':
                sortOption = { createdAt: -1 };
                break;
            case 'ancien':
                sortOption = { createdAt: 1 };
                break;
        }

        // Executer les requetes
        const [produits, total] = await Promise.all([
            Produit.find(filter)
                .populate('categorie', 'nom slug')
                .populate('boutique', 'boutique.nomBoutique boutique.logo boutique.slug')
                .sort(sortOption)
                .skip(skip)
                .limit(limit),
            Produit.countDocuments(filter)
        ]);

        // Formatter les produits avec URLs
        const produitsFormatted = produits.map(p => {
            const produit = buildImageUrls(p, baseUrl);

            // Formatter les infos boutique
            if (p.boutique && p.boutique.boutique) {
                produit.boutique = {
                    _id: p.boutique._id,
                    nomBoutique: p.boutique.boutique.nomBoutique,
                    logo: p.boutique.boutique.logo,
                    logoUrl: p.boutique.boutique.logo
                        ? `${baseUrl}/uploads/boutiques/logos/${p.boutique.boutique.logo}`
                        : null
                };
            }

            return produit;
        });

        res.status(200).json({
            success: true,
            message: 'Liste des produits recuperee.',
            data: {
                produits: produitsFormatted,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                },
                filtres: {
                    categorie: categorie || null,
                    boutique: boutique || null,
                    prixMin: prixMin ? parseFloat(prixMin) : null,
                    prixMax: prixMax ? parseFloat(prixMax) : null,
                    enPromo: enPromo === 'true',
                    search: search || null,
                    sort: sort || 'recent'
                }
            }
        });

    } catch (error) {
        console.error('Erreur getProduits catalogue:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Details d'un produit
 * @route   GET /api/catalogue/produits/:id
 * @access  Public
 */
const getProduitById = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const produit = await Produit.findById(req.params.id)
            .populate('categorie', 'nom slug')
            .populate('boutique', 'boutique nom prenom');

        if (!produit) {
            return res.status(CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.statusCode).json({
                success: false,
                message: CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.message,
                error: CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.code
            });
        }

        // Verifier que le produit est actif
        if (!produit.isActive) {
            return res.status(CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.statusCode).json({
                success: false,
                message: 'Ce produit n\'est plus disponible.',
                error: 'PRODUIT_INACTIVE'
            });
        }

        // Verifier que la boutique est validee
        if (!produit.boutique || !produit.boutique.boutique || !produit.boutique.boutique.isValidated) {
            return res.status(CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.statusCode).json({
                success: false,
                message: 'Ce produit n\'est plus disponible.',
                error: 'BOUTIQUE_NOT_VALIDATED'
            });
        }

        // Incrementer le compteur de vues
        await Produit.findByIdAndUpdate(req.params.id, { $inc: { vues: 1 } });

        // Formatter le produit
        const produitFormatted = buildImageUrls(produit, baseUrl);

        // Formatter les infos boutique
        produitFormatted.boutique = formatBoutiqueInfo(produit.boutique, baseUrl);

        res.status(200).json({
            success: true,
            message: 'Details du produit recuperes.',
            data: { produit: produitFormatted }
        });

    } catch (error) {
        console.error('Erreur getProduitById catalogue:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de produit invalide.',
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
 * @desc    Details d'un produit par slug
 * @route   GET /api/catalogue/produits/slug/:slug
 * @access  Public
 */
const getProduitBySlug = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const produit = await Produit.findOne({ slug: req.params.slug })
            .populate('categorie', 'nom slug')
            .populate('boutique', 'boutique nom prenom');

        if (!produit) {
            return res.status(CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.statusCode).json({
                success: false,
                message: CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.message,
                error: CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.code
            });
        }

        // Verifier que le produit est actif
        if (!produit.isActive) {
            return res.status(CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.statusCode).json({
                success: false,
                message: 'Ce produit n\'est plus disponible.',
                error: 'PRODUIT_INACTIVE'
            });
        }

        // Verifier que la boutique est validee
        if (!produit.boutique || !produit.boutique.boutique || !produit.boutique.boutique.isValidated) {
            return res.status(CATALOGUE_ERRORS.PRODUIT_NOT_FOUND.statusCode).json({
                success: false,
                message: 'Ce produit n\'est plus disponible.',
                error: 'BOUTIQUE_NOT_VALIDATED'
            });
        }

        // Incrementer le compteur de vues
        await Produit.findByIdAndUpdate(produit._id, { $inc: { vues: 1 } });

        // Formatter le produit
        const produitFormatted = buildImageUrls(produit, baseUrl);
        produitFormatted.boutique = formatBoutiqueInfo(produit.boutique, baseUrl);

        res.status(200).json({
            success: true,
            message: 'Details du produit recuperes.',
            data: { produit: produitFormatted }
        });

    } catch (error) {
        console.error('Erreur getProduitBySlug catalogue:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Liste des categories actives avec comptage produits
 * @route   GET /api/catalogue/categories
 * @access  Public
 */
const getCategories = async (req, res) => {
    try {
        // Recuperer les IDs des boutiques validees
        const boutiquesValideesIds = await getBoutiquesValideesIds();

        // Recuperer les categories actives
        const categories = await Categorie.find({ isActive: true })
            .select('nom slug description ordre')
            .sort({ ordre: 1, nom: 1 });

        // Compter les produits par categorie
        const produitsCount = await Produit.aggregate([
            {
                $match: {
                    isActive: true,
                    boutique: { $in: boutiquesValideesIds }
                }
            },
            {
                $group: {
                    _id: '$categorie',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Creer un map pour acces rapide
        const countMap = {};
        produitsCount.forEach(item => {
            if (item._id) {
                countMap[item._id.toString()] = item.count;
            }
        });

        // Ajouter le comptage a chaque categorie
        const categoriesWithCount = categories.map(cat => ({
            _id: cat._id,
            nom: cat.nom,
            slug: cat.slug,
            description: cat.description,
            ordre: cat.ordre,
            produitsCount: countMap[cat._id.toString()] || 0
        }));

        // Total produits sans categorie
        const sansCategorie = produitsCount.find(item => item._id === null);

        res.status(200).json({
            success: true,
            message: 'Liste des categories recuperee.',
            data: {
                categories: categoriesWithCount,
                sansCategorie: sansCategorie ? sansCategorie.count : 0
            }
        });

    } catch (error) {
        console.error('Erreur getCategories catalogue:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Liste des boutiques validees avec filtres et pagination
 * @route   GET /api/catalogue/boutiques
 * @access  Public
 */
const getBoutiques = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { categorie, search, sort } = req.query;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Construire le filtre de base
        const filter = {
            role: 'BOUTIQUE',
            'boutique.isValidated': true,
            isActive: true
        };

        // Filtre par categorie de boutique
        if (categorie) {
            filter['boutique.categorie'] = { $regex: categorie, $options: 'i' };
        }

        // Recherche par nom de boutique
        if (search) {
            filter['boutique.nomBoutique'] = { $regex: search, $options: 'i' };
        }

        // Recuperer les boutiques
        const boutiques = await User.find(filter)
            .select('boutique.nomBoutique boutique.description boutique.logo boutique.categorie boutique.slug createdAt')
            .lean();

        // Recuperer les IDs des boutiques
        const boutiqueIds = boutiques.map(b => b._id);

        // Compter les produits par boutique avec stats detaillees
        const produitsStats = await Produit.aggregate([
            { $match: { boutique: { $in: boutiqueIds } } },
            {
                $group: {
                    _id: '$boutique',
                    produitsCount: { $sum: 1 },
                    produitsActifs: { $sum: { $cond: ['$isActive', 1, 0] } },
                    produitsEnPromo: { $sum: { $cond: [{ $and: ['$isActive', '$enPromo'] }, 1, 0] } }
                }
            }
        ]);

        // Creer un map pour acces rapide
        const statsMap = {};
        produitsStats.forEach(item => {
            statsMap[item._id.toString()] = {
                produitsCount: item.produitsCount,
                produitsActifs: item.produitsActifs,
                produitsEnPromo: item.produitsEnPromo
            };
        });

        // Formatter les boutiques
        let boutiquesFormatted = boutiques.map(b => {
            const stats = statsMap[b._id.toString()] || { produitsCount: 0, produitsActifs: 0, produitsEnPromo: 0 };
            return {
                _id: b._id,
                nomBoutique: b.boutique.nomBoutique,
                description: b.boutique.description,
                categorie: b.boutique.categorie,
                slug: b.boutique.slug,
                logo: b.boutique.logo,
                logoUrl: b.boutique.logo
                    ? `${baseUrl}/uploads/boutiques/logos/${b.boutique.logo}`
                    : null,
                produitsCount: stats.produitsCount,
                produitsActifs: stats.produitsActifs,
                produitsEnPromo: stats.produitsEnPromo,
                createdAt: b.createdAt
            };
        });

        // Appliquer le tri
        switch (sort) {
            case 'nom_asc':
                boutiquesFormatted.sort((a, b) => a.nomBoutique.localeCompare(b.nomBoutique));
                break;
            case 'nom_desc':
                boutiquesFormatted.sort((a, b) => b.nomBoutique.localeCompare(a.nomBoutique));
                break;
            case 'recent':
                boutiquesFormatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'ancien':
                boutiquesFormatted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'produits_desc':
            default:
                boutiquesFormatted.sort((a, b) => b.produitsActifs - a.produitsActifs);
                break;
        }

        // Appliquer la pagination manuellement
        const total = boutiquesFormatted.length;
        const paginatedBoutiques = boutiquesFormatted.slice(skip, skip + limit);

        res.status(200).json({
            success: true,
            message: 'Liste des boutiques recuperee.',
            data: {
                boutiques: paginatedBoutiques,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                },
                filtres: {
                    categorie: categorie || null,
                    search: search || null,
                    sort: sort || 'produits_desc'
                }
            }
        });

    } catch (error) {
        console.error('Erreur getBoutiques catalogue:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Details complets d'une boutique
 * @route   GET /api/catalogue/boutiques/:id
 * @access  Public
 */
const getBoutiqueById = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Recuperer la boutique
        const boutique = await User.findOne({
            _id: req.params.id,
            role: 'BOUTIQUE',
            'boutique.isValidated': true,
            isActive: true
        }).select('-password -refreshToken -resetPasswordToken -resetPasswordExpires');

        if (!boutique) {
            return res.status(CATALOGUE_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: CATALOGUE_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: CATALOGUE_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Statistiques des produits
        const produitsStats = await Produit.aggregate([
            { $match: { boutique: boutique._id } },
            {
                $group: {
                    _id: null,
                    produitsTotal: { $sum: 1 },
                    produitsActifs: { $sum: { $cond: ['$isActive', 1, 0] } },
                    produitsEnPromo: { $sum: { $cond: [{ $and: ['$isActive', '$enPromo'] }, 1, 0] } }
                }
            }
        ]);

        const stats = produitsStats[0] || { produitsTotal: 0, produitsActifs: 0, produitsEnPromo: 0 };

        // Formatter la reponse
        const boutiqueFormatted = {
            _id: boutique._id,
            nomBoutique: boutique.boutique.nomBoutique,
            description: boutique.boutique.description,
            categorie: boutique.boutique.categorie,
            slug: boutique.boutique.slug,
            logo: boutique.boutique.logo,
            logoUrl: boutique.boutique.logo
                ? `${baseUrl}/uploads/boutiques/logos/${boutique.boutique.logo}`
                : null,
            banniere: boutique.boutique.banniere,
            banniereUrl: boutique.boutique.banniere
                ? `${baseUrl}/uploads/boutiques/bannieres/${boutique.boutique.banniere}`
                : null,
            contact: {
                email: boutique.email,
                telephone: boutique.telephone,
                siteWeb: boutique.boutique.siteWeb || null,
                adresse: boutique.adresse || null
            },
            horaires: {
                horairesTexte: boutique.boutique.horairesTexte || null,
                detailles: boutique.boutique.horaires || null
            },
            reseauxSociaux: boutique.boutique.reseauxSociaux || {},
            stats: {
                produitsTotal: stats.produitsTotal,
                produitsActifs: stats.produitsActifs,
                produitsEnPromo: stats.produitsEnPromo
            },
            createdAt: boutique.createdAt
        };

        res.status(200).json({
            success: true,
            message: 'Details de la boutique recuperes.',
            data: { boutique: boutiqueFormatted }
        });

    } catch (error) {
        console.error('Erreur getBoutiqueById catalogue:', error);

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
 * @desc    Liste des categories de boutiques distinctes
 * @route   GET /api/catalogue/boutiques/categories
 * @access  Public
 */
const getBoutiquesCategories = async (req, res) => {
    try {
        // Aggregation pour obtenir les categories distinctes
        const categories = await User.aggregate([
            {
                $match: {
                    role: 'BOUTIQUE',
                    'boutique.isValidated': true,
                    isActive: true,
                    'boutique.categorie': { $exists: true, $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$boutique.categorie',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Formatter
        const categoriesFormatted = categories.map(c => ({
            nom: c._id,
            count: c.count
        }));

        // Total boutiques
        const totalBoutiques = await User.countDocuments({
            role: 'BOUTIQUE',
            'boutique.isValidated': true,
            isActive: true
        });

        res.status(200).json({
            success: true,
            message: 'Categories de boutiques recuperees.',
            data: {
                categories: categoriesFormatted,
                total: totalBoutiques
            }
        });

    } catch (error) {
        console.error('Erreur getBoutiquesCategories catalogue:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Liste des produits d'une boutique
 * @route   GET /api/catalogue/boutiques/:id/produits
 * @access  Public
 */
const getProduitsByBoutique = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { categorie, prixMin, prixMax, enPromo, search, sort } = req.query;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Verifier que la boutique existe et est validee
        const boutique = await User.findOne({
            _id: req.params.id,
            role: 'BOUTIQUE',
            'boutique.isValidated': true,
            isActive: true
        }).select('boutique.nomBoutique boutique.description boutique.logo boutique.banniere boutique.categorie');

        if (!boutique) {
            return res.status(CATALOGUE_ERRORS.BOUTIQUE_NOT_FOUND.statusCode).json({
                success: false,
                message: CATALOGUE_ERRORS.BOUTIQUE_NOT_FOUND.message,
                error: CATALOGUE_ERRORS.BOUTIQUE_NOT_FOUND.code
            });
        }

        // Construire le filtre
        const filter = {
            boutique: req.params.id,
            isActive: true
        };

        if (categorie) {
            filter.categorie = categorie;
        }

        if (prixMin || prixMax) {
            filter.prix = {};
            if (prixMin) filter.prix.$gte = parseFloat(prixMin);
            if (prixMax) filter.prix.$lte = parseFloat(prixMax);
        }

        if (enPromo === 'true') {
            filter.enPromo = true;
        }

        if (search) {
            filter.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Tri
        let sortOption = { createdAt: -1 };
        switch (sort) {
            case 'prix_asc':
                sortOption = { prix: 1 };
                break;
            case 'prix_desc':
                sortOption = { prix: -1 };
                break;
            case 'recent':
                sortOption = { createdAt: -1 };
                break;
            case 'ancien':
                sortOption = { createdAt: 1 };
                break;
        }

        // Executer les requetes
        const [produits, total] = await Promise.all([
            Produit.find(filter)
                .populate('categorie', 'nom slug')
                .sort(sortOption)
                .skip(skip)
                .limit(limit),
            Produit.countDocuments(filter)
        ]);

        // Formatter les produits
        const produitsFormatted = produits.map(p => buildImageUrls(p, baseUrl));

        // Formatter les infos boutique
        const boutiqueInfo = {
            _id: boutique._id,
            nomBoutique: boutique.boutique.nomBoutique,
            description: boutique.boutique.description,
            categorie: boutique.boutique.categorie,
            logo: boutique.boutique.logo,
            logoUrl: boutique.boutique.logo
                ? `${baseUrl}/uploads/boutiques/logos/${boutique.boutique.logo}`
                : null,
            banniere: boutique.boutique.banniere,
            banniereUrl: boutique.boutique.banniere
                ? `${baseUrl}/uploads/boutiques/bannieres/${boutique.boutique.banniere}`
                : null
        };

        res.status(200).json({
            success: true,
            message: 'Produits de la boutique recuperes.',
            data: {
                boutique: boutiqueInfo,
                produits: produitsFormatted,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getProduitsByBoutique catalogue:', error);

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

module.exports = {
    getProduits,
    getProduitById,
    getProduitBySlug,
    getCategories,
    getBoutiques,
    getBoutiqueById,
    getBoutiquesCategories,
    getProduitsByBoutique,
    CATALOGUE_ERRORS
};