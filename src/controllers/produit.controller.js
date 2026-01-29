/**
 * Produit Controller
 * 
 * Controleur pour la gestion des produits (BOUTIQUE)
 * 
 * @module controllers/produit.controller
 */

const Produit = require('../models/Produit');
const Categorie = require('../models/Categorie');
const { deleteLocalFile } = require('../config/multer');

// ============================================
// CONSTANTES
// ============================================
const UPLOAD_DIR = './uploads/produits';

/**
 * @desc Codes d'erreur pour les operations sur les produits
 */
const PRODUIT_ERRORS = {
    NOT_FOUND: {
        code: 'PRODUIT_NOT_FOUND',
        message: 'Produit non trouve.',
        statusCode: 404
    },
    NOT_OWNER: {
        code: 'NOT_OWNER',
        message: 'Vous n\'etes pas proprietaire de ce produit.',
        statusCode: 403
    },
    CATEGORIE_NOT_FOUND: {
        code: 'CATEGORIE_NOT_FOUND',
        message: 'Categorie non trouvee.',
        statusCode: 404
    },
    CATEGORIE_INACTIVE: {
        code: 'CATEGORIE_INACTIVE',
        message: 'Cette categorie est inactive.',
        statusCode: 400
    },
    NO_IMAGE: {
        code: 'NO_IMAGE',
        message: 'Aucune image fournie.',
        statusCode: 400
    },
    MAX_IMAGES: {
        code: 'MAX_IMAGES_REACHED',
        message: 'Nombre maximum d\'images atteint (5).',
        statusCode: 400
    },
    INVALID_PROMO: {
        code: 'INVALID_PROMO',
        message: 'Le prix promo doit etre inferieur au prix normal.',
        statusCode: 400
    }
};

/**
 * @desc Obtenir les parametres de pagination depuis la requete - HELPER Pagination
 * @param {Object} query - Objet de requete Express
 * @return {Object} Parametres de pagination { page, limit, skip }
 */
const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * @desc Verifier si le produit appartient a l'utilisateur - HELPER Ownership
 * @param {Object} produit - Document Produit Mongoose
 * @param {String} userId - ID de l'utilisateur
 * @return {Boolean} True si proprietaire, sinon false
 */
const checkOwnership = (produit, userId) => {
    return produit.boutique.toString() === userId.toString();
};

/**
 * @desc Formater le produit avec URLs completes pour les images - HELPER Formatage
 * @param {Object} produit - Document Produit Mongoose
 * @param {Object} req - Requete Express pour obtenir le host
 * @return {Object} Produit formate avec URLs
 */
const formatProduitResponse = (produit, req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const produitObj = produit.toObject();

    // URLs images
    produitObj.imagePrincipaleUrl = produitObj.imagePrincipale
        ? `${baseUrl}/uploads/produits/${produitObj.imagePrincipale}`
        : null;

    produitObj.imagesUrls = (produitObj.images || []).map(
        img => `${baseUrl}/uploads/produits/${img}`
    );

    return produitObj;
};

/**
 * @desc    Creer un nouveau produit
 * @route   POST /api/boutique/produits
 * @access  Private (BOUTIQUE)
 */
const createProduit = async (req, res) => {
    try {
        const { nom, description, prix, stock, categorie, seuilAlerte } = req.body;

        // Verifier la categorie si fournie
        if (categorie) {
            const cat = await Categorie.findById(categorie);
            if (!cat) {
                return res.status(PRODUIT_ERRORS.CATEGORIE_NOT_FOUND.statusCode).json({
                    success: false,
                    message: PRODUIT_ERRORS.CATEGORIE_NOT_FOUND.message,
                    error: PRODUIT_ERRORS.CATEGORIE_NOT_FOUND.code
                });
            }
            if (!cat.isActive) {
                return res.status(PRODUIT_ERRORS.CATEGORIE_INACTIVE.statusCode).json({
                    success: false,
                    message: PRODUIT_ERRORS.CATEGORIE_INACTIVE.message,
                    error: PRODUIT_ERRORS.CATEGORIE_INACTIVE.code
                });
            }
        }

        // Creer le produit
        const produit = await Produit.create({
            nom,
            description: description || null,
            prix,
            stock: stock || 0,
            seuilAlerte: seuilAlerte || 5,
            categorie: categorie || null,
            boutique: req.user._id
        });

        // Populate categorie pour la reponse
        await produit.populate('categorie', 'nom slug');

        res.status(201).json({
            success: true,
            message: 'Produit cree avec succes.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur createProduit:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation.',
                error: 'VALIDATION_ERROR',
                errors: messages
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
 * @desc    Recuperer les produits de la boutique connectee
 * @route   GET /api/boutique/produits
 * @access  Private (BOUTIQUE)
 */
const getMesProduits = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { active, categorie, search, stockFaible, enPromo } = req.query;

        // Construire le filtre
        const filter = { boutique: req.user._id };

        if (active !== undefined) {
            filter.isActive = active === 'true';
        }

        if (categorie) {
            filter.categorie = categorie;
        }

        if (search) {
            filter.$or = [
                { nom: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (stockFaible === 'true') {
            filter.$expr = { $lte: ['$stock', '$seuilAlerte'] };
        }

        if (enPromo === 'true') {
            filter.enPromo = true;
        }

        // Executer les requetes
        const [produits, total] = await Promise.all([
            Produit.find(filter)
                .populate('categorie', 'nom slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Produit.countDocuments(filter)
        ]);

        // Formater avec URLs
        const produitsFormatted = produits.map(p => formatProduitResponse(p, req));

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
                }
            }
        });

    } catch (error) {
        console.error('Erreur getMesProduits:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Recuperer un produit par ID
 * @route   GET /api/boutique/produits/:id
 * @access  Private (BOUTIQUE)
 */
const getProduitById = async (req, res) => {
    try {
        const produit = await Produit.findById(req.params.id)
            .populate('categorie', 'nom slug');

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Produit recupere.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur getProduitById:', error);

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
 * @desc    Modifier un produit
 * @route   PUT /api/boutique/produits/:id
 * @access  Private (BOUTIQUE)
 */
const updateProduit = async (req, res) => {
    try {
        const { nom, description, prix, categorie } = req.body;

        // Verifier que le produit existe
        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Verifier la categorie si fournie
        if (categorie) {
            const cat = await Categorie.findById(categorie);
            if (!cat) {
                return res.status(PRODUIT_ERRORS.CATEGORIE_NOT_FOUND.statusCode).json({
                    success: false,
                    message: PRODUIT_ERRORS.CATEGORIE_NOT_FOUND.message,
                    error: PRODUIT_ERRORS.CATEGORIE_NOT_FOUND.code
                });
            }
        }

        // Mettre a jour
        const updateData = {};
        if (nom !== undefined) updateData.nom = nom;
        if (description !== undefined) updateData.description = description;
        if (prix !== undefined) updateData.prix = prix;
        if (categorie !== undefined) updateData.categorie = categorie || null;

        const updatedProduit = await Produit.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Produit mis a jour.',
            data: { produit: formatProduitResponse(updatedProduit, req) }
        });

    } catch (error) {
        console.error('Erreur updateProduit:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID invalide.',
                error: 'INVALID_ID'
            });
        }

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation.',
                error: 'VALIDATION_ERROR',
                errors: messages
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
 * @desc    Supprimer un produit
 * @route   DELETE /api/boutique/produits/:id
 * @access  Private (BOUTIQUE)
 */
const deleteProduit = async (req, res) => {
    try {
        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Supprimer les images
        if (produit.imagePrincipale) {
            try {
                await deleteLocalFile(`${UPLOAD_DIR}/${produit.imagePrincipale}`);
            } catch (e) {
                console.error('Erreur suppression image principale:', e);
            }
        }

        if (produit.images && produit.images.length > 0) {
            for (const img of produit.images) {
                try {
                    await deleteLocalFile(`${UPLOAD_DIR}/${img}`);
                } catch (e) {
                    console.error('Erreur suppression image:', e);
                }
            }
        }

        await Produit.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Produit supprime avec succes.',
            data: { deletedId: req.params.id }
        });

    } catch (error) {
        console.error('Erreur deleteProduit:', error);

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
 * @desc    Activer/Desactiver un produit
 * @route   PUT /api/boutique/produits/:id/toggle
 * @access  Private (BOUTIQUE)
 */
const toggleProduit = async (req, res) => {
    try {
        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        produit.isActive = !produit.isActive;
        await produit.save();

        await produit.populate('categorie', 'nom slug');

        const action = produit.isActive ? 'active' : 'desactive';

        res.status(200).json({
            success: true,
            message: `Produit ${action} avec succes.`,
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur toggleProduit:', error);

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
 * @desc    Modifier le stock d'un produit
 * @route   PUT /api/boutique/produits/:id/stock
 * @access  Private (BOUTIQUE)
 */
const updateStock = async (req, res) => {
    try {
        const { stock, seuilAlerte } = req.body;

        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Mettre a jour
        if (stock !== undefined) produit.stock = stock;
        if (seuilAlerte !== undefined) produit.seuilAlerte = seuilAlerte;

        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Stock mis a jour.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur updateStock:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Erreur de validation.',
                error: 'VALIDATION_ERROR',
                errors: messages
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
 * @desc    Definir ou retirer une promotion
 * @route   PUT /api/boutique/produits/:id/promo
 * @access  Private (BOUTIQUE)
 */
const updatePromo = async (req, res) => {
    try {
        const { prixPromo, enPromo } = req.body;

        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Valider le prix promo
        if (prixPromo !== undefined && prixPromo !== null) {
            if (prixPromo >= produit.prix) {
                return res.status(PRODUIT_ERRORS.INVALID_PROMO.statusCode).json({
                    success: false,
                    message: PRODUIT_ERRORS.INVALID_PROMO.message,
                    error: PRODUIT_ERRORS.INVALID_PROMO.code
                });
            }
            produit.prixPromo = prixPromo;
        }

        // Activer/desactiver la promo
        if (enPromo !== undefined) {
            if (enPromo && (produit.prixPromo === null || produit.prixPromo >= produit.prix)) {
                return res.status(400).json({
                    success: false,
                    message: 'Definissez d\'abord un prix promo valide.',
                    error: 'NO_PROMO_PRICE'
                });
            }
            produit.enPromo = enPromo;
        }

        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: produit.enPromo ? 'Promotion activee.' : 'Promotion desactivee.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur updatePromo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Upload ou remplacer l'image principale
 * @route   PUT /api/boutique/produits/:id/image
 * @access  Private (BOUTIQUE)
 */
const uploadImagePrincipale = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(PRODUIT_ERRORS.NO_IMAGE.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NO_IMAGE.message,
                error: PRODUIT_ERRORS.NO_IMAGE.code
            });
        }

        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            // Supprimer l'image uploadee
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Supprimer l'ancienne image
        if (produit.imagePrincipale) {
            try {
                await deleteLocalFile(`${UPLOAD_DIR}/${produit.imagePrincipale}`);
            } catch (e) {
                console.error('Erreur suppression ancienne image:', e);
            }
        }

        // Mettre a jour
        produit.imagePrincipale = req.file.filename;
        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Image principale mise a jour.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur uploadImagePrincipale:', error);

        if (req.file) {
            try {
                await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            } catch (e) {
                console.error('Erreur suppression fichier:', e);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Ajouter une image a la galerie
 * @route   POST /api/boutique/produits/:id/images
 * @access  Private (BOUTIQUE)
 */
const addImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(PRODUIT_ERRORS.NO_IMAGE.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NO_IMAGE.message,
                error: PRODUIT_ERRORS.NO_IMAGE.code
            });
        }

        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Verifier limite d'images (5 max)
        if (produit.images && produit.images.length >= 5) {
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.MAX_IMAGES.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.MAX_IMAGES.message,
                error: PRODUIT_ERRORS.MAX_IMAGES.code
            });
        }

        // Ajouter l'image
        produit.images = produit.images || [];
        produit.images.push(req.file.filename);
        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Image ajoutee a la galerie.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur addImage:', error);

        if (req.file) {
            try {
                await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            } catch (e) {
                console.error('Erreur suppression fichier:', e);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Supprimer une image de la galerie
 * @route   DELETE /api/boutique/produits/:id/images/:filename
 * @access  Private (BOUTIQUE)
 */
const deleteImage = async (req, res) => {
    try {
        const { filename } = req.params;

        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        // Verifier proprietaire
        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Verifier que l'image existe dans la galerie
        if (!produit.images || !produit.images.includes(filename)) {
            return res.status(404).json({
                success: false,
                message: 'Image non trouvee dans la galerie.',
                error: 'IMAGE_NOT_FOUND'
            });
        }

        // Supprimer l'image
        try {
            await deleteLocalFile(`${UPLOAD_DIR}/${filename}`);
        } catch (e) {
            console.error('Erreur suppression fichier:', e);
        }

        // Retirer de la liste
        produit.images = produit.images.filter(img => img !== filename);
        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Image supprimee de la galerie.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur deleteImage:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Statistiques des produits de la boutique
 * @route   GET /api/boutique/produits/stats
 * @access  Private (BOUTIQUE)
 */
const getStats = async (req, res) => {
    try {
        const boutiqueId = req.user._id;

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

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    total: totalProduits,
                    actifs: produitsActifs,
                    inactifs: produitsInactifs,
                    enPromo: produitsEnPromo,
                    stockFaible: produitsStockFaible,
                    enRupture: produitsEnRupture
                }
            }
        });

    } catch (error) {
        console.error('Erreur getStats:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    createProduit,
    getMesProduits,
    getProduitById,
    updateProduit,
    deleteProduit,
    toggleProduit,
    updateStock,
    updatePromo,
    uploadImagePrincipale,
    addImage,
    deleteImage,
    getStats,
    PRODUIT_ERRORS
};