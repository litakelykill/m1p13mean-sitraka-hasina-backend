/**
 * Categorie Controller
 * 
 * Controleur pour la gestion des categories (ADMIN)
 * 
 * @module controllers/categorie.controller
 */

const Categorie = require('../models/Categorie');

/**
 * @desc Codes d'erreur pour la gestion des categories
 */
const CATEGORIE_ERRORS = {
    NOT_FOUND: {
        code: 'CATEGORIE_NOT_FOUND',
        message: 'Categorie non trouvee.',
        statusCode: 404
    },
    ALREADY_EXISTS: {
        code: 'CATEGORIE_ALREADY_EXISTS',
        message: 'Une categorie avec ce nom existe deja.',
        statusCode: 409
    },
    HAS_PRODUCTS: {
        code: 'CATEGORIE_HAS_PRODUCTS',
        message: 'Impossible de supprimer une categorie contenant des produits.',
        statusCode: 400
    },
    ALREADY_ACTIVE: {
        code: 'ALREADY_ACTIVE',
        message: 'La categorie est deja active.',
        statusCode: 400
    },
    ALREADY_INACTIVE: {
        code: 'ALREADY_INACTIVE',
        message: 'La categorie est deja inactive.',
        statusCode: 400
    }
};

// ============================================
// HELPER : Pagination
// ============================================
const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * @desc    Creer une nouvelle categorie
 * @route   POST /api/admin/categories
 * @access  Private (ADMIN)
 */
const createCategorie = async (req, res) => {
    try {
        const { nom, description, ordre } = req.body;

        // Verifier si le nom existe deja
        const existingCategorie = await Categorie.findOne({
            nom: { $regex: new RegExp(`^${nom}$`, 'i') }
        });

        if (existingCategorie) {
            return res.status(CATEGORIE_ERRORS.ALREADY_EXISTS.statusCode).json({
                success: false,
                message: CATEGORIE_ERRORS.ALREADY_EXISTS.message,
                error: CATEGORIE_ERRORS.ALREADY_EXISTS.code
            });
        }

        // Creer la categorie
        const categorie = await Categorie.create({
            nom,
            description: description || null,
            ordre: ordre || 0
        });

        res.status(201).json({
            success: true,
            message: 'Categorie creee avec succes.',
            data: { categorie }
        });

    } catch (error) {
        console.error('Erreur createCategorie:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Une categorie avec ce nom existe deja.',
                error: 'DUPLICATE_ERROR'
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
 * @desc    Recuperer toutes les categories
 * @route   GET /api/admin/categories
 * @access  Private (ADMIN)
 * @query   page, limit, active (true/false), search
 */
const getCategories = async (req, res) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { active, search } = req.query;

        // Construire le filtre
        const filter = {};

        if (active !== undefined) {
            filter.isActive = active === 'true';
        }

        if (search) {
            filter.nom = { $regex: search, $options: 'i' };
        }

        // Executer les requetes
        const [categories, total] = await Promise.all([
            Categorie.find(filter)
                .sort({ ordre: 1, nom: 1 })
                .skip(skip)
                .limit(limit),
            Categorie.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            message: 'Liste des categories recuperee.',
            data: {
                categories,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Erreur getCategories:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Recuperer une categorie par ID
 * @route   GET /api/admin/categories/:id
 * @access  Private (ADMIN)
 */
const getCategorieById = async (req, res) => {
    try {
        const categorie = await Categorie.findById(req.params.id);

        if (!categorie) {
            return res.status(CATEGORIE_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: CATEGORIE_ERRORS.NOT_FOUND.message,
                error: CATEGORIE_ERRORS.NOT_FOUND.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Categorie recuperee.',
            data: { categorie }
        });

    } catch (error) {
        console.error('Erreur getCategorieById:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de categorie invalide.',
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
 * @desc    Modifier une categorie
 * @route   PUT /api/admin/categories/:id
 * @access  Private (ADMIN)
 */
const updateCategorie = async (req, res) => {
    try {
        const { nom, description, ordre } = req.body;

        // Verifier si la categorie existe
        const categorie = await Categorie.findById(req.params.id);

        if (!categorie) {
            return res.status(CATEGORIE_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: CATEGORIE_ERRORS.NOT_FOUND.message,
                error: CATEGORIE_ERRORS.NOT_FOUND.code
            });
        }

        // Si le nom change, verifier qu'il n'existe pas deja
        if (nom && nom !== categorie.nom) {
            const existingCategorie = await Categorie.findOne({
                nom: { $regex: new RegExp(`^${nom}$`, 'i') },
                _id: { $ne: req.params.id }
            });

            if (existingCategorie) {
                return res.status(CATEGORIE_ERRORS.ALREADY_EXISTS.statusCode).json({
                    success: false,
                    message: CATEGORIE_ERRORS.ALREADY_EXISTS.message,
                    error: CATEGORIE_ERRORS.ALREADY_EXISTS.code
                });
            }
        }

        // Mettre a jour
        const updateData = {};
        if (nom !== undefined) updateData.nom = nom;
        if (description !== undefined) updateData.description = description;
        if (ordre !== undefined) updateData.ordre = ordre;

        const updatedCategorie = await Categorie.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Categorie mise a jour.',
            data: { categorie: updatedCategorie }
        });

    } catch (error) {
        console.error('Erreur updateCategorie:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Une categorie avec ce nom existe deja.',
                error: 'DUPLICATE_ERROR'
            });
        }

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de categorie invalide.',
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
 * @desc    Supprimer une categorie
 * @route   DELETE /api/admin/categories/:id
 * @access  Private (ADMIN)
 */
const deleteCategorie = async (req, res) => {
    try {
        const categorie = await Categorie.findById(req.params.id);

        if (!categorie) {
            return res.status(CATEGORIE_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: CATEGORIE_ERRORS.NOT_FOUND.message,
                error: CATEGORIE_ERRORS.NOT_FOUND.code
            });
        }

        // TODO: Verifier si des produits utilisent cette categorie
        // const produitsCount = await Produit.countDocuments({ categorie: req.params.id });
        // if (produitsCount > 0) {
        //   return res.status(CATEGORIE_ERRORS.HAS_PRODUCTS.statusCode).json({
        //     success: false,
        //     message: CATEGORIE_ERRORS.HAS_PRODUCTS.message,
        //     error: CATEGORIE_ERRORS.HAS_PRODUCTS.code
        //   });
        // }

        await Categorie.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Categorie supprimee avec succes.',
            data: { deletedId: req.params.id }
        });

    } catch (error) {
        console.error('Erreur deleteCategorie:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de categorie invalide.',
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
 * @desc    Toggle le statut actif d'une categorie (Activer/Desactiver une categorie)
 * @route   PUT /api/admin/categories/:id/toggle
 * @access  Private (ADMIN)
 */
const toggleCategorie = async (req, res) => {
    try {
        const categorie = await Categorie.findById(req.params.id);

        if (!categorie) {
            return res.status(CATEGORIE_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: CATEGORIE_ERRORS.NOT_FOUND.message,
                error: CATEGORIE_ERRORS.NOT_FOUND.code
            });
        }

        // Inverser le statut
        categorie.isActive = !categorie.isActive;
        await categorie.save();

        const action = categorie.isActive ? 'activee' : 'desactivee';

        res.status(200).json({
            success: true,
            message: `Categorie ${action} avec succes.`,
            data: { categorie }
        });

    } catch (error) {
        console.error('Erreur toggleCategorie:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de categorie invalide.',
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
 * @desc    Modifier l'ordre d'affichage
 * @route   PUT /api/admin/categories/:id/ordre
 * @access  Private (ADMIN)
 */
const updateOrdre = async (req, res) => {
    try {
        const { ordre } = req.body;

        if (ordre === undefined || typeof ordre !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'L\'ordre est requis et doit etre un nombre.',
                error: 'VALIDATION_ERROR'
            });
        }

        const categorie = await Categorie.findByIdAndUpdate(
            req.params.id,
            { $set: { ordre } },
            { new: true }
        );

        if (!categorie) {
            return res.status(CATEGORIE_ERRORS.NOT_FOUND.statusCode).json({
                success: false,
                message: CATEGORIE_ERRORS.NOT_FOUND.message,
                error: CATEGORIE_ERRORS.NOT_FOUND.code
            });
        }

        res.status(200).json({
            success: true,
            message: 'Ordre mis a jour.',
            data: { categorie }
        });

    } catch (error) {
        console.error('Erreur updateOrdre:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'ID de categorie invalide.',
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
 * @desc    Liste des categories actives pour selection - Liste simplifiee (pour select/dropdown)
 * @route   GET /api/admin/categories/liste
 * @access  Private (ADMIN)
 */
const getListeSimple = async (req, res) => {
    try {
        const categories = await Categorie.find({ isActive: true })
            .select('_id nom slug')
            .sort({ ordre: 1, nom: 1 });

        res.status(200).json({
            success: true,
            data: { categories }
        });

    } catch (error) {
        console.error('Erreur getListeSimple:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    createCategorie,
    getCategories,
    getCategorieById,
    updateCategorie,
    deleteCategorie,
    toggleCategorie,
    updateOrdre,
    getListeSimple,
    CATEGORIE_ERRORS
};