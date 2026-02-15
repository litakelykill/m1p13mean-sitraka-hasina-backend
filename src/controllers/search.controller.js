/**
 * Search Controller
 * 
 * Contrôleur pour la recherche avancée unifiée
 * - Recherche produits + boutiques
 * - Suggestions/Autocomplete
 * - Historique de recherche
 * - Trending
 * 
 * @module controllers/search.controller
 */

const Produit = require('../models/Produit');
const User = require('../models/User');
const Categorie = require('../models/Categorie');
const SearchHistory = require('../models/SearchHistory');
const mongoose = require('mongoose');

// ============================================
// HELPERS
// ============================================

/**
 * Récupérer les IDs des boutiques validées
 */
const getBoutiquesValideesIds = async () => {
    const boutiques = await User.find({
        role: 'BOUTIQUE',
        isActive: true,
        'boutique.isValidated': true
    }).select('_id');

    return boutiques.map(b => b._id);
};

/**
 * Construire l'URL complète d'une image
 */
const buildImageUrl = (baseUrl, path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

/**
 * Normaliser un terme de recherche
 */
const normalizeQuery = (query) => {
    return query
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
};

/**
 * @desc    Recherche unifiée produits et boutiques
 * @route   GET /api/search
 * @access  Public
 * 
 * @query   q - Terme de recherche (requis)
 * @query   type - all, produits, boutiques (default: all)
 * @query   categorie - ID catégorie (pour produits)
 * @query   prixMin - Prix minimum
 * @query   prixMax - Prix maximum
 * @query   enPromo - Produits en promo seulement
 * @query   sort - Tri (pertinence, prix_asc, prix_desc, recent)
 * @query   page - Page (default: 1)
 * @query   limit - Limite par type (default: 12)
 */
const search = async (req, res) => {
    try {
        const {
            q,
            type = 'all',
            categorie,
            prixMin,
            prixMax,
            enPromo,
            sort = 'pertinence',
            page = 1,
            limit = 12
        } = req.query;

        // Validation
        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Le terme de recherche doit contenir au moins 2 caractères.',
                error: 'QUERY_TOO_SHORT'
            });
        }

        const searchTerm = q.trim();
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
        const skip = (pageNum - 1) * limitNum;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Récupérer les boutiques validées
        const boutiquesValideesIds = await getBoutiquesValideesIds();

        let produits = [];
        let boutiques = [];
        let totalProduits = 0;
        let totalBoutiques = 0;

        // ========================================
        // RECHERCHE PRODUITS
        // ========================================
        if (type === 'all' || type === 'produits') {
            const produitFilter = {
                isActive: true,
                boutique: { $in: boutiquesValideesIds },
                $or: [
                    { nom: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } },
                    { tags: { $regex: searchTerm, $options: 'i' } }
                ]
            };

            // Filtres additionnels
            if (categorie && mongoose.Types.ObjectId.isValid(categorie)) {
                produitFilter.categorie = categorie;
            }

            if (prixMin || prixMax) {
                produitFilter.prix = {};
                if (prixMin) produitFilter.prix.$gte = parseFloat(prixMin);
                if (prixMax) produitFilter.prix.$lte = parseFloat(prixMax);
            }

            if (enPromo === 'true') {
                produitFilter.enPromo = true;
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
                case 'pertinence':
                default:
                    // Pour la pertinence, on privilégie les matchs dans le nom
                    sortOption = { createdAt: -1 };
                    break;
            }

            [produits, totalProduits] = await Promise.all([
                Produit.find(produitFilter)
                    .populate('boutique', 'boutique.nomBoutique boutique.logo')
                    .populate('categorie', 'nom slug')
                    .select('nom slug description prix prixPromo enPromo stock image images')
                    .sort(sortOption)
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                Produit.countDocuments(produitFilter)
            ]);

            // Formatter les produits
            produits = produits.map(p => ({
                _id: p._id,
                type: 'produit',
                nom: p.nom,
                slug: p.slug,
                description: p.description?.substring(0, 100) + (p.description?.length > 100 ? '...' : ''),
                prix: p.prix,
                prixPromo: p.prixPromo,
                enPromo: p.enPromo,
                stock: p.stock,
                image: buildImageUrl(baseUrl, p.image),
                categorie: p.categorie ? {
                    _id: p.categorie._id,
                    nom: p.categorie.nom
                } : null,
                boutique: p.boutique ? {
                    _id: p.boutique._id,
                    nom: p.boutique.boutique?.nomBoutique,
                    logo: buildImageUrl(baseUrl, p.boutique.boutique?.logo)
                } : null
            }));
        }

        // ========================================
        // RECHERCHE BOUTIQUES
        // ========================================
        if (type === 'all' || type === 'boutiques') {
            const boutiqueFilter = {
                _id: { $in: boutiquesValideesIds },
                $or: [
                    { 'boutique.nomBoutique': { $regex: searchTerm, $options: 'i' } },
                    { 'boutique.description': { $regex: searchTerm, $options: 'i' } },
                    { 'boutique.categorie': { $regex: searchTerm, $options: 'i' } }
                ]
            };

            [boutiques, totalBoutiques] = await Promise.all([
                User.find(boutiqueFilter)
                    .select('boutique.nomBoutique boutique.description boutique.categorie boutique.logo boutique.note boutique.nombreAvis')
                    .sort({ 'boutique.note': -1 })
                    .skip(type === 'boutiques' ? skip : 0)
                    .limit(type === 'boutiques' ? limitNum : 6)
                    .lean(),
                User.countDocuments(boutiqueFilter)
            ]);

            // Compter les produits par boutique
            const boutiquesIds = boutiques.map(b => b._id);
            const produitsCount = await Produit.aggregate([
                { $match: { boutique: { $in: boutiquesIds }, isActive: true } },
                { $group: { _id: '$boutique', count: { $sum: 1 } } }
            ]);
            const produitsCountMap = {};
            produitsCount.forEach(p => { produitsCountMap[p._id.toString()] = p.count; });

            // Formatter les boutiques
            boutiques = boutiques.map(b => ({
                _id: b._id,
                type: 'boutique',
                nom: b.boutique?.nomBoutique,
                description: b.boutique?.description?.substring(0, 100) + (b.boutique?.description?.length > 100 ? '...' : ''),
                categorie: b.boutique?.categorie,
                logo: buildImageUrl(baseUrl, b.boutique?.logo),
                note: b.boutique?.note || 0,
                nombreAvis: b.boutique?.nombreAvis || 0,
                nombreProduits: produitsCountMap[b._id.toString()] || 0
            }));
        }

        // ========================================
        // ENREGISTRER DANS L'HISTORIQUE
        // ========================================
        try {
            await SearchHistory.enregistrer({
                user: req.user?._id || null,
                query: searchTerm,
                type,
                filtres: {
                    categorie: categorie || null,
                    prixMin: prixMin ? parseFloat(prixMin) : null,
                    prixMax: prixMax ? parseFloat(prixMax) : null,
                    enPromo: enPromo === 'true' ? true : null
                },
                resultats: {
                    totalProduits,
                    totalBoutiques
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        } catch (historyError) {
            console.error('Erreur enregistrement historique:', historyError);
            // Ne pas bloquer la recherche si historique échoue
        }

        // ========================================
        // RÉPONSE
        // ========================================
        res.status(200).json({
            success: true,
            message: 'Recherche effectuée avec succès.',
            data: {
                query: searchTerm,
                type,
                resultats: {
                    produits: type === 'all' || type === 'produits' ? produits : undefined,
                    boutiques: type === 'all' || type === 'boutiques' ? boutiques : undefined
                },
                totaux: {
                    produits: totalProduits,
                    boutiques: totalBoutiques,
                    total: totalProduits + totalBoutiques
                },
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(
                        (type === 'produits' ? totalProduits :
                            type === 'boutiques' ? totalBoutiques :
                                Math.max(totalProduits, totalBoutiques)) / limitNum
                    )
                },
                filtres: {
                    categorie: categorie || null,
                    prixMin: prixMin || null,
                    prixMax: prixMax || null,
                    enPromo: enPromo || null,
                    sort
                }
            }
        });

    } catch (error) {
        console.error('Erreur search:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Suggestions de recherche (autocomplete)
 * @route   GET /api/search/suggestions
 * @access  Public
 * 
 * @query   q - Préfixe de recherche (min 2 caractères)
 * @query   limit - Nombre de suggestions (default: 10)
 */
const getSuggestions = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(200).json({
                success: true,
                data: { suggestions: [] }
            });
        }

        const searchTerm = q.trim();
        const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 10));
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        // Récupérer les boutiques validées
        const boutiquesValideesIds = await getBoutiquesValideesIds();

        // Recherche parallèle dans produits, boutiques et historique
        const [produitSuggestions, boutiqueSuggestions, historySuggestions] = await Promise.all([
            // Suggestions depuis les noms de produits
            Produit.find({
                isActive: true,
                boutique: { $in: boutiquesValideesIds },
                nom: { $regex: `^${searchTerm}`, $options: 'i' }
            })
                .select('nom image')
                .limit(5)
                .lean(),

            // Suggestions depuis les noms de boutiques
            User.find({
                _id: { $in: boutiquesValideesIds },
                'boutique.nomBoutique': { $regex: `^${searchTerm}`, $options: 'i' }
            })
                .select('boutique.nomBoutique boutique.logo')
                .limit(3)
                .lean(),

            // Suggestions depuis l'historique populaire
            SearchHistory.suggestionsPopulaires(searchTerm, 5)
        ]);

        // Combiner et dédupliquer
        const suggestions = [];
        const seen = new Set();

        // Ajouter suggestions historique (populaires)
        historySuggestions.forEach(h => {
            const key = normalizeQuery(h.query);
            if (!seen.has(key)) {
                seen.add(key);
                suggestions.push({
                    type: 'history',
                    text: h.query,
                    count: h.count
                });
            }
        });

        // Ajouter suggestions produits
        produitSuggestions.forEach(p => {
            const key = normalizeQuery(p.nom);
            if (!seen.has(key)) {
                seen.add(key);
                suggestions.push({
                    type: 'produit',
                    text: p.nom,
                    image: buildImageUrl(baseUrl, p.image)
                });
            }
        });

        // Ajouter suggestions boutiques
        boutiqueSuggestions.forEach(b => {
            const key = normalizeQuery(b.boutique?.nomBoutique || '');
            if (!seen.has(key) && b.boutique?.nomBoutique) {
                seen.add(key);
                suggestions.push({
                    type: 'boutique',
                    text: b.boutique.nomBoutique,
                    image: buildImageUrl(baseUrl, b.boutique?.logo)
                });
            }
        });

        res.status(200).json({
            success: true,
            data: {
                query: searchTerm,
                suggestions: suggestions.slice(0, limitNum)
            }
        });

    } catch (error) {
        console.error('Erreur getSuggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des suggestions.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Recherches populaires/trending
 * @route   GET /api/search/trending
 * @access  Public
 * 
 * @query   limit - Nombre de résultats (default: 10)
 * @query   days - Période en jours (default: 7)
 */
const getTrending = async (req, res) => {
    try {
        const { limit = 10, days = 7 } = req.query;

        const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 10));
        const daysNum = Math.min(30, Math.max(1, parseInt(days) || 7));

        const trending = await SearchHistory.trending(limitNum, daysNum);

        res.status(200).json({
            success: true,
            data: {
                periode: `${daysNum} derniers jours`,
                trending
            }
        });

    } catch (error) {
        console.error('Erreur getTrending:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des tendances.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Historique de recherche de l'utilisateur
 * @route   GET /api/search/history
 * @access  Private
 * 
 * @query   page - Page (default: 1)
 * @query   limit - Limite (default: 20)
 */
const getHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await SearchHistory.pourUtilisateur(req.user._id, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Erreur getHistory:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'historique.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Recherches récentes uniques de l'utilisateur
 * @route   GET /api/search/recent
 * @access  Private
 * 
 * @query   limit - Limite (default: 10)
 */
const getRecentSearches = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 10));
        const recherches = await SearchHistory.rechercheRecentesUniques(req.user._id, limitNum);

        res.status(200).json({
            success: true,
            data: {
                recherches
            }
        });

    } catch (error) {
        console.error('Erreur getRecentSearches:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des recherches récentes.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Supprimer tout l'historique de recherche
 * @route   DELETE /api/search/history
 * @access  Private
 */
const clearHistory = async (req, res) => {
    try {
        const deletedCount = await SearchHistory.supprimerPourUtilisateur(req.user._id);

        res.status(200).json({
            success: true,
            message: `${deletedCount} recherche(s) supprimée(s).`,
            data: { deletedCount }
        });

    } catch (error) {
        console.error('Erreur clearHistory:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression de l\'historique.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Supprimer une recherche spécifique
 * @route   DELETE /api/search/history/:id
 * @access  Private
 */
const deleteSearchItem = async (req, res) => {
    try {
        const result = await SearchHistory.supprimerRecherche(req.params.id, req.user._id);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Recherche non trouvée.',
                error: 'SEARCH_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Recherche supprimée.',
            data: null
        });

    } catch (error) {
        console.error('Erreur deleteSearchItem:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    search,
    getSuggestions,
    getTrending,
    getHistory,
    getRecentSearches,
    clearHistory,
    deleteSearchItem
};