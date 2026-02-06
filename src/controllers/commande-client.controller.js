/**
 * Commande Client Controller
 * 
 * Controleur pour les commandes cote client
 * 
 * @module controllers/commande-client.controller
 */

const Commande = require('../models/Commande');
const Panier = require('../models/Panier');
const Produit = require('../models/Produit');

/**
 * @desc Codes d'erreur pour les commandes client
 */
const COMMANDE_ERRORS = {
    PANIER_EMPTY: {
        code: 'PANIER_EMPTY',
        message: 'Votre panier est vide.',
        statusCode: 400
    },
    PANIER_INVALID: {
        code: 'PANIER_INVALID',
        message: 'Certains produits du panier ne sont plus disponibles.',
        statusCode: 400
    },
    COMMANDE_NOT_FOUND: {
        code: 'COMMANDE_NOT_FOUND',
        message: 'Commande non trouvee.',
        statusCode: 404
    },
    COMMANDE_NOT_OWNER: {
        code: 'COMMANDE_NOT_OWNER',
        message: 'Cette commande ne vous appartient pas.',
        statusCode: 403
    },
    ANNULATION_IMPOSSIBLE: {
        code: 'ANNULATION_IMPOSSIBLE',
        message: 'Cette commande ne peut plus etre annulee.',
        statusCode: 400
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

        // Recuperer le panier avec les produits peuples
        const panier = await Panier.findByClientPopulated(clientId);

        // Verifier que le panier existe et n'est pas vide
        if (!panier || panier.items.length === 0) {
            return res.status(COMMANDE_ERRORS.PANIER_EMPTY.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.PANIER_EMPTY.message,
                error: COMMANDE_ERRORS.PANIER_EMPTY.code
            });
        }

        // Verifier la validite du panier (stock, produits actifs, etc.)
        const problemesValidation = [];
        const itemsValides = [];

        for (const item of panier.items) {
            const produit = item.produit;

            // Verifier que le produit existe
            if (!produit) {
                problemesValidation.push({
                    produitId: item.produit,
                    message: 'Produit non trouve'
                });
                continue;
            }

            // Verifier que le produit est actif
            if (!produit.isActive) {
                problemesValidation.push({
                    produitId: produit._id,
                    nom: produit.nom,
                    message: 'Ce produit n\'est plus disponible'
                });
                continue;
            }

            // Verifier la boutique
            if (!produit.boutique || !produit.boutique.boutique?.isValidated) {
                problemesValidation.push({
                    produitId: produit._id,
                    nom: produit.nom,
                    message: 'La boutique de ce produit n\'est plus disponible'
                });
                continue;
            }

            // Verifier que la boutique est active
            if (!produit.boutique.isActive) {
                problemesValidation.push({
                    produitId: produit._id,
                    nom: produit.nom,
                    message: 'La boutique de ce produit est inactive'
                });
                continue;
            }

            // Verifier le stock
            if (produit.stock < item.quantite) {
                problemesValidation.push({
                    produitId: produit._id,
                    nom: produit.nom,
                    message: `Stock insuffisant (${produit.stock} disponibles)`,
                    stockDisponible: produit.stock
                });
                continue;
            }

            itemsValides.push({
                produit,
                quantite: item.quantite
            });
        }

        // Si des problemes sont detectes, retourner les erreurs
        if (problemesValidation.length > 0) {
            return res.status(COMMANDE_ERRORS.PANIER_INVALID.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.PANIER_INVALID.message,
                error: COMMANDE_ERRORS.PANIER_INVALID.code,
                details: problemesValidation
            });
        }

        // Generer le numero de commande
        const numeroCommande = await Commande.genererNumero();

        // Creer les items de commande avec snapshot des produits
        const itemsCommande = [];
        let sousTotal = 0;
        let total = 0;
        let economies = 0;

        // Regrouper par boutique
        const parBoutiqueMap = new Map();

        for (const { produit, quantite } of itemsValides) {
            const prixUnitaire = produit.prix;
            const prixPromo = (produit.enPromo && produit.prixPromo !== null && produit.prixPromo < produit.prix)
                ? produit.prixPromo
                : null;
            const prixEffectif = prixPromo || prixUnitaire;
            const itemSousTotal = prixEffectif * quantite;

            const itemCommande = {
                produit: produit._id,
                boutique: produit.boutique._id,
                nom: produit.nom,
                slug: produit.slug,
                prix: prixUnitaire,
                prixPromo: prixPromo,
                quantite: quantite,
                sousTotal: itemSousTotal
            };

            itemsCommande.push(itemCommande);
            sousTotal += prixUnitaire * quantite;
            total += itemSousTotal;

            if (prixPromo) {
                economies += (prixUnitaire - prixPromo) * quantite;
            }

            // Regrouper par boutique
            const boutiqueId = produit.boutique._id.toString();
            if (!parBoutiqueMap.has(boutiqueId)) {
                parBoutiqueMap.set(boutiqueId, {
                    boutique: produit.boutique._id,
                    items: [],
                    sousTotal: 0,
                    statut: 'en_attente',
                    historiqueStatuts: [{
                        statut: 'en_attente',
                        date: new Date(),
                        commentaire: 'Commande recue'
                    }],
                    notes: []
                });
            }

            const boutiqueData = parBoutiqueMap.get(boutiqueId);
            boutiqueData.items.push(itemCommande);
            boutiqueData.sousTotal += itemSousTotal;
        }

        // Creer la commande
        const commande = new Commande({
            numero: numeroCommande,
            client: clientId,
            adresseLivraison,
            items: itemsCommande,
            sousTotal,
            total,
            economies,
            modePaiement,
            paiementStatut: 'en_attente',
            statut: 'en_attente',
            historiqueStatuts: [{
                statut: 'en_attente',
                date: new Date(),
                commentaire: 'Commande passee'
            }],
            parBoutique: Array.from(parBoutiqueMap.values())
        });

        await commande.save();

        // Decrementer le stock des produits
        for (const { produit, quantite } of itemsValides) {
            await Produit.findByIdAndUpdate(produit._id, {
                $inc: { stock: -quantite }
            });
        }

        // Vider le panier
        panier.clear();
        await panier.save();

        // Retourner la commande creee
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
                    itemsCount: commande.itemsCount,
                    boutiquesCount: commande.boutiquesCount,
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
const mesCommandes = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { page = 1, limit = 10, statut } = req.query;

        const query = { client: clientId };
        if (statut) {
            query.statut = statut;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [commandes, total] = await Promise.all([
            Commande.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('parBoutique.boutique', 'boutique.nomBoutique')
                .lean(),
            Commande.countDocuments(query)
        ]);

        // Formater les commandes pour la liste
        const commandesFormatees = commandes.map(cmd => ({
            _id: cmd._id,
            numero: cmd.numero,
            statut: cmd.statut,
            total: cmd.total,
            economies: cmd.economies,
            itemsCount: cmd.items.reduce((sum, i) => sum + i.quantite, 0),
            boutiques: cmd.parBoutique.map(pb => pb.boutique?.boutique?.nomBoutique || 'Boutique'),
            createdAt: cmd.createdAt
        }));

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
        console.error('Erreur mesCommandes:', error);
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
const detailsCommande = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { id } = req.params;

        const commande = await Commande.findById(id)
            .populate('client', 'nom prenom email')
            .populate('parBoutique.boutique', 'boutique.nomBoutique boutique.telephone boutique.email')
            .lean();

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        // Verifier que le client est proprietaire
        if (commande.client._id.toString() !== clientId.toString()) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        // Formater les sous-commandes avec les noms des boutiques
        const parBoutiqueFormate = commande.parBoutique.map(sc => ({
            boutique: {
                _id: sc.boutique._id,
                nomBoutique: sc.boutique?.boutique?.nomBoutique || 'Boutique'
            },
            items: sc.items,
            sousTotal: sc.sousTotal,
            statut: sc.statut,
            historiqueStatuts: sc.historiqueStatuts
        }));

        // Retirer les notes internes (reservees aux boutiques)
        const commandeFormatee = {
            ...commande,
            parBoutique: parBoutiqueFormate,
            notes: undefined
        };

        res.status(200).json({
            success: true,
            message: 'Details de la commande recuperes.',
            data: {
                commande: commandeFormatee
            }
        });

    } catch (error) {
        console.error('Erreur detailsCommande:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Suivi de livraison (historique des statuts)
 * @route   GET /api/commandes/:id/suivi
 * @access  Private (CLIENT)
 */
const suiviCommande = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { id } = req.params;

        const commande = await Commande.findById(id)
            .select('numero client statut historiqueStatuts parBoutique')
            .populate('parBoutique.boutique', 'boutique.nomBoutique')
            .lean();

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        // Verifier que le client est proprietaire
        if (commande.client.toString() !== clientId.toString()) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        // Formater le suivi par boutique
        const suiviParBoutique = commande.parBoutique.map(sc => ({
            boutique: {
                _id: sc.boutique._id,
                nomBoutique: sc.boutique?.boutique?.nomBoutique || 'Boutique'
            },
            statut: sc.statut,
            historiqueStatuts: sc.historiqueStatuts.map(h => ({
                statut: h.statut,
                date: h.date,
                commentaire: h.commentaire
            }))
        }));

        res.status(200).json({
            success: true,
            message: 'Suivi de commande recupere.',
            data: {
                numero: commande.numero,
                statutGlobal: commande.statut,
                historiqueGlobal: commande.historiqueStatuts.map(h => ({
                    statut: h.statut,
                    date: h.date,
                    commentaire: h.commentaire
                })),
                parBoutique: suiviParBoutique
            }
        });

    } catch (error) {
        console.error('Erreur suiviCommande:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Annuler une commande
 * @route   PUT /api/commandes/:id/annuler
 * @access  Private (CLIENT)
 */
const annulerCommande = async (req, res) => {
    try {
        const clientId = req.user._id;
        const { id } = req.params;

        const commande = await Commande.findById(id);

        if (!commande) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_FOUND.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_FOUND.code
            });
        }

        // Verifier que le client est proprietaire
        if (commande.client.toString() !== clientId.toString()) {
            return res.status(COMMANDE_ERRORS.COMMANDE_NOT_OWNER.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.message,
                error: COMMANDE_ERRORS.COMMANDE_NOT_OWNER.code
            });
        }

        // Verifier que la commande peut etre annulee (statut en_attente uniquement)
        if (commande.statut !== 'en_attente') {
            return res.status(COMMANDE_ERRORS.ANNULATION_IMPOSSIBLE.statusCode).json({
                success: false,
                message: COMMANDE_ERRORS.ANNULATION_IMPOSSIBLE.message,
                error: COMMANDE_ERRORS.ANNULATION_IMPOSSIBLE.code,
                details: `Le statut actuel est "${commande.statut}". Seules les commandes en attente peuvent etre annulees.`
            });
        }

        // Mettre a jour le statut
        commande.statut = 'annulee';
        commande.historiqueStatuts.push({
            statut: 'annulee',
            date: new Date(),
            commentaire: 'Commande annulee par le client',
            auteur: clientId
        });

        // Mettre a jour les sous-commandes
        for (const sousCommande of commande.parBoutique) {
            sousCommande.statut = 'annulee';
            sousCommande.historiqueStatuts.push({
                statut: 'annulee',
                date: new Date(),
                commentaire: 'Commande annulee par le client',
                auteur: clientId
            });
        }

        await commande.save();

        // Restaurer le stock des produits
        for (const item of commande.items) {
            await Produit.findByIdAndUpdate(item.produit, {
                $inc: { stock: item.quantite }
            });
        }

        res.status(200).json({
            success: true,
            message: 'Commande annulee avec succes.',
            data: {
                commande: {
                    _id: commande._id,
                    numero: commande.numero,
                    statut: commande.statut
                }
            }
        });

    } catch (error) {
        console.error('Erreur annulerCommande:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    passerCommande,
    mesCommandes,
    detailsCommande,
    suiviCommande,
    annulerCommande,
    COMMANDE_ERRORS
};