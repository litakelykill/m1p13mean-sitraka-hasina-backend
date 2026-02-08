/**
 * Commande Client Controller
 * 
 * Controleur pour la gestion des commandes cote client
 * 
 * @module controllers/commande-client.controller
 */

const Commande = require('../models/Commande');
const Panier = require('../models/Panier');
const Produit = require('../models/Produit');
const User = require('../models/User');

/**
 * @desc Codes d'erreur standardises pour les operations de commande client
 */
const COMMANDE_ERRORS = {
    PANIER_EMPTY: {
        code: 'PANIER_EMPTY',
        message: 'Votre panier est vide.',
        statusCode: 400
    },
    PANIER_INVALID: {
        code: 'PANIER_INVALID',
        message: 'Certains produits de votre panier ne sont plus disponibles.',
        statusCode: 400
    },
    COMMANDE_NOT_FOUND: {
        code: 'COMMANDE_NOT_FOUND',
        message: 'Commande non trouvee.',
        statusCode: 404
    },
    COMMANDE_NOT_OWNER: {
        code: 'COMMANDE_NOT_OWNER',
        message: 'Vous n\'etes pas autorise a acceder a cette commande.',
        statusCode: 403
    },
    ANNULATION_IMPOSSIBLE: {
        code: 'ANNULATION_IMPOSSIBLE',
        message: 'Cette commande ne peut plus etre annulee.',
        statusCode: 400
    },
    ADRESSE_REQUIRED: {
        code: 'ADRESSE_REQUIRED',
        message: 'L\'adresse de livraison est requise.',
        statusCode: 400
    },
    STOCK_INSUFFISANT: {
        code: 'STOCK_INSUFFISANT',
        message: 'Stock insuffisant pour certains produits.',
        statusCode: 400
    }
};

/**
 * @desc Verifier le panier du client et preparer les items valides pour la commande - HELPER
 * @param {String} clientId - L'ID du client pour lequel on verifie le panier
 * @return {Object} - Un objet contenant le panier, les items valides et les erreurs eventuelles
 */
const verifierPanier = async (clientId) => {
    const panier = await Panier.findByClientPopulated(clientId);

    if (!panier || panier.items.length === 0) {
        return { error: COMMANDE_ERRORS.PANIER_EMPTY };
    }

    const itemsValides = [];
    const itemsInvalides = [];

    for (const item of panier.items) {
        const produit = item.produit;

        // Verifier produit existe et actif
        if (!produit || !produit._id || !produit.isActive) {
            itemsInvalides.push({ produitId: item.produit, raison: 'PRODUIT_INACTIVE' });
            continue;
        }

        // Verifier boutique validee
        if (!produit.boutique ||
            !produit.boutique.isActive ||
            !produit.boutique.boutique?.isValidated) {
            itemsInvalides.push({ produitId: produit._id, nom: produit.nom, raison: 'BOUTIQUE_INACTIVE' });
            continue;
        }

        // Verifier stock
        if (item.quantite > produit.stock) {
            itemsInvalides.push({
                produitId: produit._id,
                nom: produit.nom,
                raison: 'STOCK_INSUFFISANT',
                stockDisponible: produit.stock,
                quantiteDemandee: item.quantite
            });
            continue;
        }

        itemsValides.push({
            produit: produit._id,
            boutique: produit.boutique._id,
            nomBoutique: produit.boutique.boutique.nomBoutique,
            nom: produit.nom,
            slug: produit.slug,
            imagePrincipale: produit.imagePrincipale,
            prix: produit.prix,
            prixPromo: produit.enPromo ? produit.prixPromo : null,
            quantite: item.quantite,
            sousTotal: (produit.enPromo && produit.prixPromo ? produit.prixPromo : produit.prix) * item.quantite
        });
    }

    if (itemsInvalides.length > 0) {
        return {
            error: { ...COMMANDE_ERRORS.PANIER_INVALID, data: { itemsInvalides } }
        };
    }

    return { panier, itemsValides };
};

/**
 * @desc Regrouper les items d'une commande par boutique pour creer les sous-commandes boutique - HELPER
 * @param {Array} items - Les items de la commande a regrouper (doivent contenir boutique, nomBoutique, prix, quantite et sousTotal)
 * @return {Array} - Un tableau de sous-commandes boutique contenant les items regroupes par boutique avec les totaux calcules
 */
const regrouperParBoutique = (items) => {
    const boutiquesMap = new Map();

    for (const item of items) {
        const boutiqueId = item.boutique.toString();

        if (!boutiquesMap.has(boutiqueId)) {
            boutiquesMap.set(boutiqueId, {
                boutique: item.boutique,
                nomBoutique: item.nomBoutique,
                items: [],
                sousTotal: 0,
                total: 0
            });
        }

        const boutique = boutiquesMap.get(boutiqueId);
        boutique.items.push(item);
        boutique.sousTotal += item.prix * item.quantite;
        boutique.total += item.sousTotal;
    }

    return Array.from(boutiquesMap.values()).map(b => ({
        ...b,
        statut: 'en_attente',
        historiqueStatuts: [{
            statut: 'en_attente',
            date: new Date(),
            commentaire: 'Commande recue'
        }],
        notes: []
    }));
};

/**
 * @desc Calculer les totaux d'une commande a partir de ses items - HELPER
 * @param {Array} items - Les items de la commande a calculer (doivent contenir prix, quantite et sousTotal)
 * @return {Object} - Un objet contenant le sousTotal, total et economies de la commande
 */
const calculerTotaux = (items) => {
    let sousTotal = 0;
    let total = 0;

    for (const item of items) {
        sousTotal += item.prix * item.quantite;
        total += item.sousTotal;
    }

    return {
        sousTotal,
        total,
        economies: sousTotal - total
    };
};

/**
 * @desc Decrementer le stock des produits d'une commande (utilise apres passage de commande) - HELPER
 * @param {Array} items - Les items de la commande a traiter (doivent contenir produit et quantite)
 * @return {Promise} - Une promesse qui se resolve lorsque le stock est decremente pour tous les produits
 */
const decrementerStock = async (items) => {
    for (const item of items) {
        await Produit.findByIdAndUpdate(item.produit, {
            $inc: { stock: -item.quantite }
        });
    }
};

/**
 * @desc Restaurer le stock des produits d'une commande (utilise lors de l'annulation) - HELPER
 * @param {Array} items - Les items de la commande a restaurer (doivent contenir produit et quantite)
 * @return {Promise} - Une promesse qui se resolve lorsque le stock est restaure pour tous les produits
 */
const restaurerStock = async (items) => {
    for (const item of items) {
        await Produit.findByIdAndUpdate(item.produit, {
            $inc: { stock: item.quantite }
        });
    }
};

/**
 * @desc    Passer une commande depuis le panier
 * @route   POST /api/commandes
 * @access  Private (CLIENT)
 */
const passerCommande = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { adresseLivraison, modePaiement = 'livraison' } = req.body;

        // Verifier adresse
        if (!adresseLivraison || !adresseLivraison.nom || !adresseLivraison.rue || !adresseLivraison.ville) {
            return res.status(COMMANDE_ERRORS.ADRESSE_REQUIRED.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.ADRESSE_REQUIRED.message,
                error: COMMANDE_ERRORS.ADRESSE_REQUIRED.code
            });
        }

        // Verifier et preparer le panier
        const { panier, itemsValides, error } = await verifierPanier(clientId);

        if (error) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                error: error.code,
                data: error.data
            });
        }

        // Generer numero de commande
        const numero = await Commande.genererNumero();

        // Calculer totaux
        const totaux = calculerTotaux(itemsValides);

        // Regrouper par boutique
        const parBoutique = regrouperParBoutique(itemsValides);

        // Creer la commande
        const commande = await Commande.create({
            numero,
            client: clientId,
            adresseLivraison: {
                nom: adresseLivraison.nom,
                prenom: adresseLivraison.prenom || '',
                telephone: adresseLivraison.telephone || req.user.telephone || '',
                rue: adresseLivraison.rue,
                ville: adresseLivraison.ville,
                codePostal: adresseLivraison.codePostal || '',
                pays: adresseLivraison.pays || 'Madagascar',
                instructions: adresseLivraison.instructions || ''
            },
            items: itemsValides,
            sousTotal: totaux.sousTotal,
            total: totaux.total,
            economies: totaux.economies,
            modePaiement,
            paiementStatut: modePaiement === 'livraison' ? 'en_attente' : 'en_attente',
            statut: 'en_attente',
            historiqueStatuts: [{
                statut: 'en_attente',
                date: new Date(),
                commentaire: 'Commande passee'
            }],
            parBoutique
        });

        // Decrementer stock
        await decrementerStock(itemsValides);

        // Vider le panier
        panier.clear();
        await panier.save();

        // Populer pour la reponse
        await commande.populate('client', 'nom prenom email telephone');

        res.status(201).json({
            success: true,
            message: 'Commande passee avec succes.',
            data: { commande }
        });

    } catch (error) {
        console.error('Erreur passerCommande:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Liste des commandes du client connecte
 * @route   GET /api/commandes
 * @access  Private (CLIENT)
 */
const getMesCommandes = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { page = 1, limit = 10, statut } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
        const skip = (pageNum - 1) * limitNum;

        const filter = { client: clientId };
        if (statut) filter.statut = statut;

        const [commandes, total] = await Promise.all([
            Commande.find(filter)
                .select('numero statut total items parBoutique createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Commande.countDocuments(filter)
        ]);

        // Formatter les commandes
        const commandesFormatted = commandes.map(c => ({
            _id: c._id,
            numero: c.numero,
            statut: c.statut,
            total: c.total,
            itemsCount: c.items.reduce((sum, item) => sum + item.quantite, 0),
            boutiquesCount: c.parBoutique.length,
            boutiques: c.parBoutique.map(b => b.nomBoutique),
            createdAt: c.createdAt
        }));

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
        console.error('Erreur getMesCommandes:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Details d'une commande
 * @route   GET /api/commandes/:id
 * @access  Private (CLIENT)
 */
const getCommande = async (req, res) => {
    try {
        const clientId = req.user._id;
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const commande = await Commande.findById(req.params.id)
            .populate('client', 'nom prenom email telephone');

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        // Verifier que c'est la commande du client
        if (commande.client._id.toString() !== clientId.toString()) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        // Formatter avec URLs images
        const commandeObj = commande.toObject();
        commandeObj.items = commandeObj.items.map(item => ({
            ...item,
            imagePrincipaleUrl: item.imagePrincipale
                ? `${baseUrl}/uploads/produits/${item.imagePrincipale}`
                : null
        }));

        commandeObj.parBoutique = commandeObj.parBoutique.map(b => ({
            ...b,
            items: b.items.map(item => ({
                ...item,
                imagePrincipaleUrl: item.imagePrincipale
                    ? `${baseUrl}/uploads/produits/${item.imagePrincipale}`
                    : null
            }))
        }));

        // Ne pas exposer les notes internes au client
        delete commandeObj.notes;
        commandeObj.parBoutique.forEach(b => delete b.notes);

        res.status(200).json({
            success: true,
            message: 'Details de la commande recuperes.',
            data: { commande: commandeObj }
        });

    } catch (error) {
        console.error('Erreur getCommande:', error);

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
 * @desc    Suivi de livraison (historique statuts)
 * @route   GET /api/commandes/:id/suivi
 * @access  Private (CLIENT)
 */
const getSuiviCommande = async (req, res) => {
    try {
        const clientId = req.user._id;

        const commande = await Commande.findById(req.params.id)
            .select('numero statut historiqueStatuts parBoutique client');

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        if (commande.client.toString() !== clientId.toString()) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Suivi de commande recupere.',
            data: {
                numero: commande.numero,
                statut: commande.statut,
                historiqueStatuts: commande.historiqueStatuts,
                parBoutique: commande.parBoutique.map(b => ({
                    nomBoutique: b.nomBoutique,
                    statut: b.statut,
                    historiqueStatuts: b.historiqueStatuts
                }))
            }
        });

    } catch (error) {
        console.error('Erreur getSuiviCommande:', error);

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
 * @desc    Annuler une commande (si en_attente)
 * @route   PUT /api/commandes/:id/annuler
 * @access  Private (CLIENT)
 */
const annulerCommande = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { raison } = req.body;

        const commande = await Commande.findById(req.params.id);

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        if (commande.client.toString() !== clientId.toString()) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        // Verifier que la commande peut etre annulee
        if (commande.statut !== 'en_attente') {
            return res.status(COMMANDE_ERRORS.ANNULATION_IMPOSSIBLE.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.ANNULATION_IMPOSSIBLE.message,
                error: COMMANDE_ERRORS.ANNULATION_IMPOSSIBLE.code
            });
        }

        // Annuler la commande
        commande.ajouterHistoriqueStatut('annulee', clientId, raison || 'Annulee par le client');

        // Annuler toutes les sous-commandes
        for (const sousCommande of commande.parBoutique) {
            sousCommande.historiqueStatuts.push({
                statut: 'annulee',
                date: new Date(),
                commentaire: raison || 'Annulee par le client',
                auteur: clientId
            });
            sousCommande.statut = 'annulee';
        }

        await commande.save();

        // Restaurer le stock
        await restaurerStock(commande.items);

        res.status(200).json({
            success: true,
            message: 'Commande annulee avec succes.',
            data: {
                numero: commande.numero,
                statut: commande.statut
            }
        });

    } catch (error) {
        console.error('Erreur annulerCommande:', error);

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
    passerCommande,
    getMesCommandes,
    getCommande,
    getSuiviCommande,
    annulerCommande,
    COMMANDE_ERRORS
};