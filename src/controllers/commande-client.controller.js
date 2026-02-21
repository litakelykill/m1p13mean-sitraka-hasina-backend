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
const NotificationService = require('../services/notification.service');

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
    },
    PAIEMENT_IMPOSSIBLE: {
        code: 'PAIEMENT_IMPOSSIBLE',
        message: 'Cette commande ne peut pas etre payee.',
        statusCode: 400
    },
    DEJA_PAYEE: {
        code: 'DEJA_PAYEE',
        message: 'Cette commande a deja ete payee.',
        statusCode: 400
    },
    RECEPTION_IMPOSSIBLE: {
        code: 'RECEPTION_IMPOSSIBLE',
        message: 'Vous ne pouvez pas encore confirmer la reception de cette commande.',
        statusCode: 400
    },
    RECEPTION_DEJA_CONFIRMEE: {
        code: 'RECEPTION_DEJA_CONFIRMEE',
        message: 'La reception a deja ete confirmee.',
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

        // Regrouper par boutique
        const parBoutique = regrouperParBoutique(itemsValides);

        // Calculer totaux
        const totaux = calculerTotaux(itemsValides);

        // Creer la commande
        const commande = await Commande.create({
            numero,
            client: clientId,
            adresseLivraison,
            items: itemsValides,
            sousTotal: totaux.sousTotal,
            total: totaux.total,
            economies: totaux.economies,
            modePaiement,
            paiementStatut: 'en_attente',
            statut: 'en_attente',
            historiqueStatuts: [{
                statut: 'en_attente',
                date: new Date(),
                commentaire: 'Commande passee'
            }],
            parBoutique
        });

        // Decrementer le stock
        await decrementerStock(itemsValides);

        // Vider le panier
        await Panier.findOneAndUpdate(
            { client: clientId },
            { items: [], updatedAt: new Date() }
        );

        // Envoyer notifications aux boutiques
        for (const sousCommande of parBoutique) {
            try {
                await NotificationService.notifierNouvelleCommande(
                    sousCommande.boutique,
                    commande,
                    sousCommande
                );
            } catch (notifError) {
                console.error('Erreur notification boutique:', notifError);
                // Ne pas bloquer la commande si notification echoue
            }
        }

        res.status(201).json({
            success: true,
            message: 'Commande passee avec succes.',
            data: {
                commande: {
                    _id: commande._id,
                    numero: commande.numero,
                    statut: commande.statut,
                    total: commande.total,
                    economies: commande.economies,
                    itemsCount: commande.items.reduce((sum, item) => sum + item.quantite, 0),
                    boutiquesCount: commande.parBoutique.length,
                    paiementStatut: commande.paiementStatut,
                    createdAt: commande.createdAt
                }
            }
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
 * @desc    Liste des commandes du client
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
                .select('numero statut total items createdAt parBoutique paiementStatut receptionConfirmeeLe')
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
            paiementStatut: c.paiementStatut,
            receptionConfirmeeLe: c.receptionConfirmeeLe,
            itemsCount: c.items.reduce((sum, item) => sum + item.quantite, 0),
            boutiquesCount: c.parBoutique.length,
            boutiques: c.parBoutique.map(b => ({
                nomBoutique: b.nomBoutique,
                statut: b.statut
            })),
            peutConfirmerReception: !c.receptionConfirmeeLe && c.parBoutique.some(sc => sc.statut === 'en_livraison' || sc.statut === 'livree'),
            peutPayer: c.paiementStatut !== 'paye' && c.parBoutique.every(sc => sc.statut === 'livree'),
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

        // Ajouter les flags d'action
        commandeObj.peutConfirmerReception = !commande.receptionConfirmeeLe &&
            commande.parBoutique.some(sc => sc.statut === 'en_livraison' || sc.statut === 'livree');
        commandeObj.peutPayer = commande.paiementStatut !== 'paye' &&
            commande.parBoutique.every(sc => sc.statut === 'livree');

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
            .select('numero statut historiqueStatuts parBoutique client paiementStatut receptionConfirmeeLe');

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
                paiementStatut: commande.paiementStatut,
                receptionConfirmeeLe: commande.receptionConfirmeeLe,
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

/**
 * @desc    Confirmer la reception de la commande par le client
 * @route   PUT /api/commandes/:id/confirmer-reception
 * @access  Private (CLIENT)
 */
const confirmerReception = async (req, res) => {
    try {
        const clientId = req.user._id;

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

        // Verifier si deja confirmee
        if (commande.receptionConfirmeeLe) {
            return res.status(COMMANDE_ERRORS.RECEPTION_DEJA_CONFIRMEE.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.RECEPTION_DEJA_CONFIRMEE.message,
                error: COMMANDE_ERRORS.RECEPTION_DEJA_CONFIRMEE.code
            });
        }

        // Verifier que la commande est en livraison ou livree
        const peutConfirmer = commande.parBoutique.some(
            sc => sc.statut === 'en_livraison' || sc.statut === 'livree'
        );

        if (!peutConfirmer) {
            return res.status(COMMANDE_ERRORS.RECEPTION_IMPOSSIBLE.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.RECEPTION_IMPOSSIBLE.message,
                error: COMMANDE_ERRORS.RECEPTION_IMPOSSIBLE.code,
                data: {
                    statut: commande.statut,
                    message: 'La commande doit etre en livraison ou livree pour confirmer la reception.'
                }
            });
        }

        // Confirmer la reception
        commande.confirmerReception();

        // Mettre a jour les sous-commandes en "livree" si elles sont "en_livraison"
        for (const sousCommande of commande.parBoutique) {
            if (sousCommande.statut === 'en_livraison') {
                sousCommande.historiqueStatuts.push({
                    statut: 'livree',
                    date: new Date(),
                    commentaire: 'Reception confirmee par le client',
                    auteur: clientId
                });
                sousCommande.statut = 'livree';
            }
        }

        // Mettre a jour le statut global
        commande.mettreAJourStatutGlobal();

        await commande.save();

        // Notifier les boutiques
        for (const sousCommande of commande.parBoutique) {
            try {
                const { NOTIFICATION_TYPES } = require('../models/Notification');
                await NotificationService.notify(
                    NOTIFICATION_TYPES.ANNONCE,
                    sousCommande.boutique,
                    {
                        titre: 'Reception confirmee',
                        message: `Le client a confirme la reception de la commande #${commande.numero}.`,
                        lien: `/boutique/commandes/${commande._id}`
                    },
                    { entiteType: 'commande', entiteId: commande._id }
                );
            } catch (notifError) {
                console.error('Erreur notification boutique:', notifError);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Reception confirmee avec succes.',
            data: {
                numero: commande.numero,
                statut: commande.statut,
                receptionConfirmeeLe: commande.receptionConfirmeeLe,
                peutPayer: commande.paiementStatut !== 'paye' &&
                    commande.parBoutique.every(sc => sc.statut === 'livree')
            }
        });

    } catch (error) {
        console.error('Erreur confirmerReception:', error);

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
 * @desc    Payer une commande (simulation)
 * @route   PUT /api/commandes/:id/payer
 * @access  Private (CLIENT)
 */
const payerCommande = async (req, res) => {
    try {
        const clientId = req.user._id;

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

        // Verifier si deja payee
        if (commande.paiementStatut === 'paye') {
            return res.status(COMMANDE_ERRORS.DEJA_PAYEE.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.DEJA_PAYEE.message,
                error: COMMANDE_ERRORS.DEJA_PAYEE.code
            });
        }

        // Verifier que toutes les sous-commandes sont livrees
        const toutesLivrees = commande.parBoutique.every(sc => sc.statut === 'livree');

        if (!toutesLivrees) {
            return res.status(COMMANDE_ERRORS.PAIEMENT_IMPOSSIBLE.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.PAIEMENT_IMPOSSIBLE.message,
                error: COMMANDE_ERRORS.PAIEMENT_IMPOSSIBLE.code,
                data: {
                    statut: commande.statut,
                    boutiques: commande.parBoutique.map(b => ({
                        nomBoutique: b.nomBoutique,
                        statut: b.statut
                    })),
                    message: 'Toutes les sous-commandes doivent etre livrees avant le paiement.'
                }
            });
        }

        // Marquer comme paye
        commande.marquerCommePaye();
        await commande.save();

        // Notifier les boutiques
        for (const sousCommande of commande.parBoutique) {
            try {
                const { NOTIFICATION_TYPES } = require('../models/Notification');
                await NotificationService.notify(
                    NOTIFICATION_TYPES.ANNONCE,
                    sousCommande.boutique,
                    {
                        titre: 'Paiement recu',
                        message: `Le paiement de la commande #${commande.numero} a ete effectue (${sousCommande.total.toLocaleString()} Ar).`,
                        lien: `/boutique/commandes/${commande._id}`
                    },
                    { entiteType: 'commande', entiteId: commande._id }
                );
            } catch (notifError) {
                console.error('Erreur notification boutique:', notifError);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Paiement effectue avec succes.',
            data: {
                numero: commande.numero,
                total: commande.total,
                paiementStatut: commande.paiementStatut,
                paiementDate: commande.paiementDate
            }
        });

    } catch (error) {
        console.error('Erreur payerCommande:', error);

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
    confirmerReception,
    payerCommande,
    COMMANDE_ERRORS
};