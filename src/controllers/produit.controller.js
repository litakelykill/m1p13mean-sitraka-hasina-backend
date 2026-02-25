/**
 * Produit Controller
 * 
 * Controleur pour la gestion des produits (BOUTIQUE)
 * 
 * CLOUDINARY : uploadImagePrincipaleCloudinary, deleteImagePrincipaleCloudinary,
 *              addImageCloudinary, deleteImageCloudinary
 * 
 * @module controllers/produit.controller
 */

const Produit = require('../models/Produit');
const Categorie = require('../models/Categorie');
const { deleteLocalFile } = require('../config/multer');

// ============================================
// CLOUDINARY IMPORTS
// ============================================
const { deleteFromCloudinary, extractPublicId } = require('../config/multer-cloudinary');

// ============================================
// CONSTANTES
// ============================================
const UPLOAD_DIR = './uploads/produits';

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

// ============================================
// HELPERS
// ============================================

const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

const checkOwnership = (produit, userId) => {
    return produit.boutique.toString() === userId.toString();
};

const formatProduitResponse = (produit, req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const produitObj = produit.toObject();

    // URLs images (pour LOCAL)
    if (produitObj.imagePrincipale && !produitObj.imagePrincipale.includes('cloudinary.com')) {
        produitObj.imagePrincipaleUrl = `${baseUrl}/uploads/produits/${produitObj.imagePrincipale}`;
    } else {
        produitObj.imagePrincipaleUrl = produitObj.imagePrincipale || null;
    }

    produitObj.imagesUrls = (produitObj.images || []).map(img => {
        if (img.includes('cloudinary.com')) {
            return img;
        }
        return `${baseUrl}/uploads/produits/${img}`;
    });

    return produitObj;
};

// ============================================
// CRUD OPERATIONS
// ============================================

const createProduit = async (req, res) => {
    try {
        const { nom, description, prix, stock, categorie, seuilAlerte } = req.body;

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

        const produit = await Produit.create({
            nom,
            description: description || null,
            prix,
            stock: stock || 0,
            seuilAlerte: seuilAlerte || 5,
            categorie: categorie || null,
            boutique: req.user._id
        });

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

const getMesProduits = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { active, categorie, search, stockFaible, enPromo } = req.query;

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

        const [produits, total] = await Promise.all([
            Produit.find(filter)
                .populate('categorie', 'nom slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Produit.countDocuments(filter)
        ]);

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

const updateProduit = async (req, res) => {
    try {
        const { nom, description, prix, categorie, isActive } = req.body;

        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

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

        if (nom !== undefined) produit.nom = nom;
        if (description !== undefined) produit.description = description;
        if (prix !== undefined) produit.prix = prix;
        if (categorie !== undefined) produit.categorie = categorie || null;
        if (isActive !== undefined) produit.isActive = isActive;

        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Produit mis a jour.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur updateProduit:', error);

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

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Supprimer les images locales
        if (produit.imagePrincipale && !produit.imagePrincipale.includes('cloudinary.com')) {
            try {
                await deleteLocalFile(`${UPLOAD_DIR}/${produit.imagePrincipale}`);
            } catch (e) {
                console.error('Erreur suppression image principale:', e);
            }
        }

        if (produit.images && produit.images.length > 0) {
            for (const img of produit.images) {
                if (!img.includes('cloudinary.com')) {
                    try {
                        await deleteLocalFile(`${UPLOAD_DIR}/${img}`);
                    } catch (e) {
                        console.error('Erreur suppression image galerie:', e);
                    }
                }
            }
        }

        await produit.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Produit supprime.',
            data: null
        });

    } catch (error) {
        console.error('Erreur deleteProduit:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

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

        res.status(200).json({
            success: true,
            message: `Produit ${produit.isActive ? 'active' : 'desactive'}.`,
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur toggleProduit:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

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

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

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
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

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

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        if (enPromo === false) {
            produit.enPromo = false;
            produit.prixPromo = null;
            await produit.save();
            await produit.populate('categorie', 'nom slug');

            return res.status(200).json({
                success: true,
                message: 'Promotion desactivee.',
                data: { produit: formatProduitResponse(produit, req) }
            });
        }

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

        if (enPromo === true) {
            if (produit.prixPromo === null || produit.prixPromo >= produit.prix) {
                return res.status(400).json({
                    success: false,
                    message: 'Definissez d\'abord un prix promo valide.',
                    error: 'NO_PROMO_PRICE'
                });
            }
            produit.enPromo = true;
        }

        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: produit.enPromo ? 'Promotion activee.' : 'Prix promo mis a jour.',
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

// ============================================
// LOCAL - IMAGE FUNCTIONS
// ============================================

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
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        if (!checkOwnership(produit, req.user._id)) {
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        if (produit.imagePrincipale) {
            try {
                await deleteLocalFile(`${UPLOAD_DIR}/${produit.imagePrincipale}`);
            } catch (e) {
                console.error('Erreur suppression ancienne image:', e);
            }
        }

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

const deleteImagePrincipale = async (req, res) => {
    try {
        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        if (!produit.imagePrincipale) {
            return res.status(PRODUIT_ERRORS.NO_IMAGE.statusCode).json({
                success: false,
                message: 'Aucune image principale a supprimer.',
                error: 'NO_MAIN_IMAGE'
            });
        }

        try {
            await deleteLocalFile(`${UPLOAD_DIR}/${produit.imagePrincipale}`);
        } catch (e) {
            console.error('Erreur suppression fichier:', e);
        }

        produit.imagePrincipale = null;
        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Image principale supprimee.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur deleteImagePrincipale:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

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

        if (!checkOwnership(produit, req.user._id)) {
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        if (produit.images && produit.images.length >= 5) {
            await deleteLocalFile(`${UPLOAD_DIR}/${req.file.filename}`);
            return res.status(PRODUIT_ERRORS.MAX_IMAGES.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.MAX_IMAGES.message,
                error: PRODUIT_ERRORS.MAX_IMAGES.code
            });
        }

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

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        if (!produit.images || !produit.images.includes(filename)) {
            return res.status(404).json({
                success: false,
                message: 'Image non trouvee dans la galerie.',
                error: 'IMAGE_NOT_FOUND'
            });
        }

        try {
            await deleteLocalFile(`${UPLOAD_DIR}/${filename}`);
        } catch (e) {
            console.error('Erreur suppression fichier:', e);
        }

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

// ============================================
// CLOUDINARY - IMAGE FUNCTIONS
// ============================================

/**
 * @desc    Upload/remplacer image principale (CLOUDINARY)
 * @route   PUT /api/boutique/produits/:id/image/cloud
 * @access  Private (BOUTIQUE)
 */
const uploadImagePrincipaleCloudinary = async (req, res) => {
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
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Supprimer l'ancienne image de Cloudinary si elle existe
        if (produit.imagePrincipale && produit.imagePrincipale.includes('cloudinary.com')) {
            try {
                const publicId = extractPublicId(produit.imagePrincipale);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            } catch (e) {
                console.error('Erreur suppression ancienne image Cloudinary:', e);
            }
        }

        // Avec multer-storage-cloudinary, l'URL est dans req.file.path
        produit.imagePrincipale = req.file.path;
        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Image principale mise a jour.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur uploadImagePrincipaleCloudinary:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Supprimer image principale (CLOUDINARY)
 * @route   DELETE /api/boutique/produits/:id/image/cloud
 * @access  Private (BOUTIQUE)
 */
const deleteImagePrincipaleCloudinary = async (req, res) => {
    try {
        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        if (!produit.imagePrincipale) {
            return res.status(PRODUIT_ERRORS.NO_IMAGE.statusCode).json({
                success: false,
                message: 'Aucune image principale a supprimer.',
                error: 'NO_MAIN_IMAGE'
            });
        }

        // Supprimer de Cloudinary
        if (produit.imagePrincipale.includes('cloudinary.com')) {
            try {
                const publicId = extractPublicId(produit.imagePrincipale);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            } catch (e) {
                console.error('Erreur suppression Cloudinary:', e);
            }
        }

        produit.imagePrincipale = null;
        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Image principale supprimee.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur deleteImagePrincipaleCloudinary:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Ajouter image galerie (CLOUDINARY)
 * @route   POST /api/boutique/produits/:id/images/cloud
 * @access  Private (BOUTIQUE)
 */
const addImageCloudinary = async (req, res) => {
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
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        if (produit.images && produit.images.length >= 5) {
            return res.status(PRODUIT_ERRORS.MAX_IMAGES.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.MAX_IMAGES.message,
                error: PRODUIT_ERRORS.MAX_IMAGES.code
            });
        }

        // Avec multer-storage-cloudinary, l'URL est dans req.file.path
        produit.images = produit.images || [];
        produit.images.push(req.file.path);
        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Image ajoutee a la galerie.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur addImageCloudinary:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Supprimer image galerie (CLOUDINARY)
 * @route   DELETE /api/boutique/produits/:id/images/cloud/:imageUrl
 * @access  Private (BOUTIQUE)
 * 
 * Note: imageUrl doit etre encode en base64 pour eviter les problemes d'URL
 */
const deleteImageCloudinary = async (req, res) => {
    try {
        // Decoder l'URL de l'image (encodee en base64)
        let imageUrl;
        try {
            imageUrl = Buffer.from(req.params.imageUrl, 'base64').toString('utf-8');
        } catch (e) {
            imageUrl = req.params.imageUrl;
        }

        const produit = await Produit.findById(req.params.id);

        if (!produit) {
            return res.status(PRODUIT_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_FOUND.message,
                error: PRODUIT_ERRORS.NOT_FOUND.code
            });
        }

        if (!checkOwnership(produit, req.user._id)) {
            return res.status(PRODUIT_ERRORS.NOT_OWNER.statusCode).json({
                success: false,
                message: PRODUIT_ERRORS.NOT_OWNER.message,
                error: PRODUIT_ERRORS.NOT_OWNER.code
            });
        }

        // Trouver l'image dans la galerie
        const imageIndex = produit.images.findIndex(img => img === imageUrl);

        if (imageIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Image non trouvee dans la galerie.',
                error: 'IMAGE_NOT_FOUND'
            });
        }

        // Supprimer de Cloudinary
        if (imageUrl.includes('cloudinary.com')) {
            try {
                const publicId = extractPublicId(imageUrl);
                if (publicId) {
                    await deleteFromCloudinary(publicId);
                }
            } catch (e) {
                console.error('Erreur suppression Cloudinary:', e);
            }
        }

        produit.images.splice(imageIndex, 1);
        await produit.save();
        await produit.populate('categorie', 'nom slug');

        res.status(200).json({
            success: true,
            message: 'Image supprimee de la galerie.',
            data: { produit: formatProduitResponse(produit, req) }
        });

    } catch (error) {
        console.error('Erreur deleteImageCloudinary:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// ============================================
// STATS
// ============================================

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
    deleteImagePrincipale,
    addImage,
    deleteImage,
    getStats,
    // CLOUDINARY
    uploadImagePrincipaleCloudinary,
    deleteImagePrincipaleCloudinary,
    addImageCloudinary,
    deleteImageCloudinary,
    PRODUIT_ERRORS
};