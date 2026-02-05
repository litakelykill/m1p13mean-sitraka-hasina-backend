/**
 * Panier Controller
 * 
 * Controleur pour la gestion du panier client
 * 
 * @module controllers/panier.controller
 */

const Panier = require('../models/Panier');
const Produit = require('../models/Produit');
const User = require('../models/User');

/**
 * @desc Codes d'erreur pour les operations sur le panier
 */
const PANIER_ERRORS = {
    PANIER_EMPTY: {
        code: 'PANIER_EMPTY',
        message: 'Le panier est vide.',
        statusCode: 400
    },
    PRODUIT_NOT_FOUND: {
        code: 'PRODUIT_NOT_FOUND',
        message: 'Produit non trouve.',
        statusCode: 404
    },
    PRODUIT_INACTIVE: {
        code: 'PRODUIT_INACTIVE',
        message: 'Ce produit n\'est plus disponible.',
        statusCode: 400
    },
    BOUTIQUE_NOT_VALIDATED: {
        code: 'BOUTIQUE_NOT_VALIDATED',
        message: 'La boutique de ce produit n\'est plus active.',
        statusCode: 400
    },
    STOCK_INSUFFISANT: {
        code: 'STOCK_INSUFFISANT',
        message: 'Stock insuffisant pour ce produit.',
        statusCode: 400
    },
    QUANTITE_INVALIDE: {
        code: 'QUANTITE_INVALIDE',
        message: 'La quantite doit etre superieure a 0.',
        statusCode: 400
    },
    ITEM_NOT_IN_CART: {
        code: 'ITEM_NOT_IN_CART',
        message: 'Ce produit n\'est pas dans votre panier.',
        statusCode: 404
    }
};

/**
 * Vérifie si le produit existe, est actif et si sa boutique est validée. HELPER
 * @param {ObjectId} produitId - ID du produit à vérifier
 * @returns {Object} - Objet contenant le produit ou une erreur
 */
const verifyProduit = async (produitId) => {
    const produit = await Produit.findById(produitId)
        .populate('boutique', 'boutique.isValidated isActive');

    if (!produit) {
        return { error: PANIER_ERRORS.PRODUIT_NOT_FOUND };
    }

    if (!produit.isActive) {
        return { error: PANIER_ERRORS.PRODUIT_INACTIVE };
    }

    if (!produit.boutique ||
        !produit.boutique.isActive ||
        !produit.boutique.boutique ||
        !produit.boutique.boutique.isValidated) {
        return { error: PANIER_ERRORS.BOUTIQUE_NOT_VALIDATED };
    }

    return { produit };
};

// ============================================
// HELPER : Formatter le panier avec totaux
// ============================================
const formatPanierResponse = (panier, baseUrl) => {
    if (!panier || !panier.items || panier.items.length === 0) {
        return {
            _id: panier?._id || null,
            items: [],
            itemsCount: 0,
            totalArticles: 0,
            sousTotal: 0,
            total: 0,
            economies: 0,
            parBoutique: []
        };
    }

    let sousTotal = 0;
    let total = 0;
    const boutiquesMap = new Map();

    const itemsFormatted = panier.items.map(item => {
        const produit = item.produit;

        // Si produit non peuple ou supprime
        if (!produit || !produit._id) {
            return null;
        }

        // Calculer le prix actuel
        const prixActuel = produit.enPromo && produit.prixPromo
            ? produit.prixPromo
            : produit.prix;

        const itemSousTotal = item.prixUnitaire * item.quantite;
        const itemTotal = (item.prixPromo || item.prixUnitaire) * item.quantite;

        sousTotal += itemSousTotal;
        total += itemTotal;

        // Formatter l'item
        const itemFormatted = {
            produit: {
                _id: produit._id,
                nom: produit.nom,
                slug: produit.slug,
                prix: produit.prix,
                prixPromo: produit.prixPromo,
                enPromo: produit.enPromo,
                stock: produit.stock,
                isActive: produit.isActive,
                imagePrincipale: produit.imagePrincipale,
                imagePrincipaleUrl: produit.imagePrincipale
                    ? `${baseUrl}/uploads/produits/${produit.imagePrincipale}`
                    : null,
                boutique: produit.boutique && produit.boutique.boutique ? {
                    _id: produit.boutique._id,
                    nomBoutique: produit.boutique.boutique.nomBoutique,
                    logo: produit.boutique.boutique.logo,
                    logoUrl: produit.boutique.boutique.logo
                        ? `${baseUrl}/uploads/boutiques/logos/${produit.boutique.boutique.logo}`
                        : null
                } : null,
                categorie: produit.categorie
            },
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            prixPromo: item.prixPromo,
            sousTotal: itemTotal,
            ajouteLe: item.ajouteLe
        };

        // Regrouper par boutique
        if (produit.boutique && produit.boutique._id) {
            const boutiqueId = produit.boutique._id.toString();
            if (!boutiquesMap.has(boutiqueId)) {
                boutiquesMap.set(boutiqueId, {
                    boutique: itemFormatted.produit.boutique,
                    items: [],
                    sousTotal: 0
                });
            }
            const boutiqueData = boutiquesMap.get(boutiqueId);
            boutiqueData.items.push(itemFormatted);
            boutiqueData.sousTotal += itemTotal;
        }

        return itemFormatted;
    }).filter(item => item !== null);

    return {
        _id: panier._id,
        items: itemsFormatted,
        itemsCount: itemsFormatted.length,
        totalArticles: itemsFormatted.reduce((sum, item) => sum + item.quantite, 0),
        sousTotal,
        total,
        economies: sousTotal - total,
        parBoutique: Array.from(boutiquesMap.values())
    };
};

/**
 * @desc    Voir le panier complet du client
 * @route   GET /api/panier
 * @access  Private (CLIENT)
 */
const getPanier = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const clientId = req.user._id;

        // Recuperer le panier avec les produits peuples
        let panier = await Panier.findByClientPopulated(clientId);

        if (!panier) {
            panier = await Panier.create({ client: clientId, items: [] });
        }

        const panierFormatted = formatPanierResponse(panier, baseUrl);

        res.status(200).json({
            success: true,
            message: 'Panier recupere.',
            data: { panier: panierFormatted }
        });

    } catch (error) {
        console.error('Erreur getPanier:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Nombre d'articles dans le panier (pour badge)
 * @route   GET /api/panier/count
 * @access  Private (CLIENT)
 */
const getCount = async (req, res) => {
    try {
        const clientId = req.user._id;

        const panier = await Panier.findOne({ client: clientId });

        if (!panier || panier.items.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    count: 0,
                    itemsCount: 0
                }
            });
        }

        const count = panier.items.reduce((sum, item) => sum + item.quantite, 0);

        res.status(200).json({
            success: true,
            data: {
                count,
                itemsCount: panier.items.length
            }
        });

    } catch (error) {
        console.error('Erreur getCount:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Ajouter un produit au panier
 * @route   POST /api/panier/items
 * @access  Private (CLIENT)
 */
const addItem = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const clientId = req.user._id;
        const { produitId, quantite = 1 } = req.body;

        // Valider quantite
        if (!quantite || quantite < 1) {
            return res.status(PANIER_ERRORS.QUANTITE_INVALIDE.statusCode).json({
                success: false,
                message: PANIER_ERRORS.QUANTITE_INVALIDE.message,
                error: PANIER_ERRORS.QUANTITE_INVALIDE.code
            });
        }

        // Verifier le produit
        const { produit, error } = await verifyProduit(produitId);
        if (error) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                error: error.code
            });
        }

        // Recuperer ou creer le panier
        let panier = await Panier.findOrCreateByClient(clientId);

        // Calculer la quantite totale (existante + nouvelle)
        const existingItem = panier.getItem(produitId);
        const quantiteTotale = (existingItem?.quantite || 0) + quantite;

        // Verifier le stock
        if (quantiteTotale > produit.stock) {
            return res.status(PANIER_ERRORS.STOCK_INSUFFISANT.statusCode).json({
                success: false,
                message: `Stock insuffisant. Disponible: ${produit.stock}, Demande: ${quantiteTotale}`,
                error: PANIER_ERRORS.STOCK_INSUFFISANT.code,
                data: { stockDisponible: produit.stock, quantiteDemandee: quantiteTotale }
            });
        }

        // Determiner les prix
        const prixUnitaire = produit.prix;
        const prixPromo = produit.enPromo ? produit.prixPromo : null;

        // Ajouter l'item
        panier.addItem(produitId, quantite, prixUnitaire, prixPromo);
        await panier.save();

        // Recuperer le panier mis a jour avec populate
        panier = await Panier.findByClientPopulated(clientId);
        const panierFormatted = formatPanierResponse(panier, baseUrl);

        res.status(200).json({
            success: true,
            message: 'Produit ajoute au panier.',
            data: { panier: panierFormatted }
        });

    } catch (error) {
        console.error('Erreur addItem:', error);

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
 * @desc    Modifier la quantite d'un produit dans le panier
 * @route   PUT /api/panier/items/:produitId
 * @access  Private (CLIENT)
 */
const updateItem = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const clientId = req.user._id;
        const { produitId } = req.params;
        const { quantite } = req.body;

        // Valider quantite
        if (quantite === undefined || quantite < 0) {
            return res.status(PANIER_ERRORS.QUANTITE_INVALIDE.statusCode).json({
                success: false,
                message: 'La quantite doit etre un nombre positif ou zero.',
                error: PANIER_ERRORS.QUANTITE_INVALIDE.code
            });
        }

        // Recuperer le panier
        let panier = await Panier.findOne({ client: clientId });

        if (!panier || !panier.hasItem(produitId)) {
            return res.status(PANIER_ERRORS.ITEM_NOT_IN_CART.statusCode).json({
                success: false,
                message: PANIER_ERRORS.ITEM_NOT_IN_CART.message,
                error: PANIER_ERRORS.ITEM_NOT_IN_CART.code
            });
        }

        // Si quantite = 0, retirer l'item
        if (quantite === 0) {
            panier.removeItem(produitId);
            await panier.save();

            panier = await Panier.findByClientPopulated(clientId);
            const panierFormatted = formatPanierResponse(panier, baseUrl);

            return res.status(200).json({
                success: true,
                message: 'Produit retire du panier.',
                data: { panier: panierFormatted }
            });
        }

        // Verifier le produit
        const { produit, error } = await verifyProduit(produitId);
        if (error) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                error: error.code
            });
        }

        // Verifier le stock
        if (quantite > produit.stock) {
            return res.status(PANIER_ERRORS.STOCK_INSUFFISANT.statusCode).json({
                success: false,
                message: `Stock insuffisant. Disponible: ${produit.stock}`,
                error: PANIER_ERRORS.STOCK_INSUFFISANT.code,
                data: { stockDisponible: produit.stock, quantiteDemandee: quantite }
            });
        }

        // Mettre a jour la quantite et les prix
        const item = panier.getItem(produitId);
        item.quantite = quantite;
        item.prixUnitaire = produit.prix;
        item.prixPromo = produit.enPromo ? produit.prixPromo : null;

        await panier.save();

        // Recuperer le panier mis a jour
        panier = await Panier.findByClientPopulated(clientId);
        const panierFormatted = formatPanierResponse(panier, baseUrl);

        res.status(200).json({
            success: true,
            message: 'Quantite mise a jour.',
            data: { panier: panierFormatted }
        });

    } catch (error) {
        console.error('Erreur updateItem:', error);

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
 * @desc    Retirer un produit du panier
 * @route   DELETE /api/panier/items/:produitId
 * @access  Private (CLIENT)
 */
const removeItem = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const clientId = req.user._id;
        const { produitId } = req.params;

        // Recuperer le panier
        let panier = await Panier.findOne({ client: clientId });

        if (!panier || !panier.hasItem(produitId)) {
            return res.status(PANIER_ERRORS.ITEM_NOT_IN_CART.statusCode).json({
                success: false,
                message: PANIER_ERRORS.ITEM_NOT_IN_CART.message,
                error: PANIER_ERRORS.ITEM_NOT_IN_CART.code
            });
        }

        // Retirer l'item
        panier.removeItem(produitId);
        await panier.save();

        // Recuperer le panier mis a jour
        panier = await Panier.findByClientPopulated(clientId);
        const panierFormatted = formatPanierResponse(panier, baseUrl);

        res.status(200).json({
            success: true,
            message: 'Produit retire du panier.',
            data: { panier: panierFormatted }
        });

    } catch (error) {
        console.error('Erreur removeItem:', error);

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
 * @desc    Vider completement le panier
 * @route   DELETE /api/panier
 * @access  Private (CLIENT)
 */
const clearPanier = async (req, res) => {
    try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const clientId = req.user._id;

        let panier = await Panier.findOne({ client: clientId });

        if (!panier || panier.items.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Le panier est deja vide.',
                data: { panier: formatPanierResponse(null, baseUrl) }
            });
        }

        // Vider le panier
        panier.clear();
        await panier.save();

        res.status(200).json({
            success: true,
            message: 'Panier vide.',
            data: { panier: formatPanierResponse(panier, baseUrl) }
        });

    } catch (error) {
        console.error('Erreur clearPanier:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Verifier la validite du panier (stock, prix, disponibilite)
 * @route   GET /api/panier/verify
 * @access  Private (CLIENT)
 */
const verifyPanier = async (req, res) => {
    try {
        const clientId = req.user._id;

        const panier = await Panier.findByClientPopulated(clientId);

        if (!panier || panier.items.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    valid: true,
                    items: [],
                    itemsInvalides: [],
                    prixModifies: []
                }
            });
        }

        const items = [];
        const itemsInvalides = [];
        const prixModifies = [];
        let isValid = true;

        for (const item of panier.items) {
            const produit = item.produit;

            // Produit supprime
            if (!produit || !produit._id) {
                itemsInvalides.push({
                    produitId: item.produit,
                    raison: 'PRODUIT_SUPPRIME'
                });
                isValid = false;
                continue;
            }

            const itemStatus = {
                produitId: produit._id,
                nom: produit.nom,
                valid: true,
                stockDisponible: produit.stock,
                quantiteDemandee: item.quantite,
                prixActuel: produit.enPromo && produit.prixPromo ? produit.prixPromo : produit.prix,
                prixPanier: item.prixPromo || item.prixUnitaire,
                prixChange: false
            };

            // Verifier si produit actif
            if (!produit.isActive) {
                itemStatus.valid = false;
                itemsInvalides.push({
                    produitId: produit._id,
                    nom: produit.nom,
                    raison: 'PRODUIT_INACTIVE'
                });
                isValid = false;
            }

            // Verifier boutique
            else if (!produit.boutique ||
                !produit.boutique.isActive ||
                !produit.boutique.boutique?.isValidated) {
                itemStatus.valid = false;
                itemsInvalides.push({
                    produitId: produit._id,
                    nom: produit.nom,
                    raison: 'BOUTIQUE_INACTIVE'
                });
                isValid = false;
            }

            // Verifier stock
            else if (item.quantite > produit.stock) {
                itemStatus.valid = false;
                itemsInvalides.push({
                    produitId: produit._id,
                    nom: produit.nom,
                    raison: 'STOCK_INSUFFISANT',
                    stockDisponible: produit.stock,
                    quantiteDemandee: item.quantite
                });
                isValid = false;
            }

            // Verifier changement de prix
            if (itemStatus.prixActuel !== itemStatus.prixPanier) {
                itemStatus.prixChange = true;
                prixModifies.push({
                    produitId: produit._id,
                    nom: produit.nom,
                    ancienPrix: itemStatus.prixPanier,
                    nouveauPrix: itemStatus.prixActuel
                });
            }

            items.push(itemStatus);
        }

        res.status(200).json({
            success: true,
            data: {
                valid: isValid,
                items,
                itemsInvalides,
                prixModifies
            }
        });

    } catch (error) {
        console.error('Erreur verifyPanier:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    getPanier,
    getCount,
    addItem,
    updateItem,
    removeItem,
    clearPanier,
    verifyPanier,
    PANIER_ERRORS
};