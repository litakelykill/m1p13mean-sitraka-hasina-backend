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
 * @desc    Liste des boutiques validees avec comptage produits
 * @route   GET /api/catalogue/boutiques
 * @access  Public
 */
const getBoutiques = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Recuperer les boutiques validees
        const boutiques = await User.find({
            role: 'BOUTIQUE',
            'boutique.isValidated': true,
            isActive: true
        }).select('boutique.nomBoutique boutique.description boutique.logo boutique.categorie boutique.slug');

        // Compter les produits par boutique
        const produitsCount = await Produit.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$boutique',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Creer un map pour acces rapide
        const countMap = {};
        produitsCount.forEach(item => {
            countMap[item._id.toString()] = item.count;
        });

        // Formatter les boutiques
        const boutiquesFormatted = boutiques.map(b => ({
            _id: b._id,
            nomBoutique: b.boutique.nomBoutique,
            description: b.boutique.description,
            categorie: b.boutique.categorie,
            logo: b.boutique.logo,
            logoUrl: b.boutique.logo
                ? `${baseUrl}/uploads/boutiques/logos/${b.boutique.logo}`
                : null,
            produitsCount: countMap[b._id.toString()] || 0
        }));

        // Trier par nombre de produits (descroissant)
        boutiquesFormatted.sort((a, b) => b.produitsCount - a.produitsCount);

        res.status(200).json({
            success: true,
            message: 'Liste des boutiques recuperee.',
            data: {
                boutiques: boutiquesFormatted,
                total: boutiquesFormatted.length
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
    getProduitsByBoutique,
    CATALOGUE_ERRORS
};