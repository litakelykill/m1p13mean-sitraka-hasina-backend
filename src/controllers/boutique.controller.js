/**
 * Boutique Controller
 * 
 * Controleur pour la gestion du profil boutique
 * - Consulter le profil boutique
 * - Modifier les informations
 * - Upload logo et banniere
 * - Gerer les horaires
 * - Gerer les reseaux sociaux
 * 
 * @module controllers/boutique.controller
 */

const User = require('../models/User');
const { deleteLocalFile, UPLOAD_DIRS } = require('../config/multer');

// CODES D'ERREUR
const BOUTIQUE_ERRORS = {
    NOT_A_BOUTIQUE: {
        code: 'NOT_A_BOUTIQUE',
        message: 'Votre compte n\'est pas une boutique.',
        statusCode: 403
    },
    BOUTIQUE_NOT_VALIDATED: {
        code: 'BOUTIQUE_NOT_VALIDATED',
        message: 'Votre boutique n\'est pas encore validee.',
        statusCode: 403
    },
    NO_FILE_UPLOADED: {
        code: 'NO_FILE_UPLOADED',
        message: 'Aucun fichier n\'a ete envoye.',
        statusCode: 400
    },
    NO_LOGO: {
        code: 'NO_LOGO',
        message: 'Aucun logo a supprimer.',
        statusCode: 400
    },
    NO_BANNIERE: {
        code: 'NO_BANNIERE',
        message: 'Aucune banniere a supprimer.',
        statusCode: 400
    },
    NO_UPDATE_DATA: {
        code: 'NO_UPDATE_DATA',
        message: 'Aucune donnee a mettre a jour.',
        statusCode: 400
    }
};

// HELPER : Verifier que c'est une boutique
const checkIsBoutique = (user, res) => {
    if (user.role !== 'BOUTIQUE') {
        res.status(BOUTIQUE_ERRORS.NOT_A_BOUTIQUE.statusCode).json({
            success: false,
            message: BOUTIQUE_ERRORS.NOT_A_BOUTIQUE.message,
            error: BOUTIQUE_ERRORS.NOT_A_BOUTIQUE.code
        });
        return false;
    }
    return true;
};

/**
 * @desc    Recuperer le profil complet de la boutique
 * @route   GET /api/boutique/profil
 * @access  Private (BOUTIQUE)
 */
const getProfilBoutique = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        const user = await User.findById(req.user._id)
            .populate('boutique.validatedBy', 'nom prenom email');

        res.status(200).json({
            success: true,
            message: 'Profil boutique recupere avec succes.',
            data: {
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur getProfilBoutique:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Recuperer le statut de validation de la boutique
 * @route   GET /api/boutique/statut
 * @access  Private (BOUTIQUE)
 */
const getStatutValidation = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        const boutique = req.user.boutique;

        res.status(200).json({
            success: true,
            message: 'Statut de validation recupere.',
            data: {
                statut: {
                    isValidated: boutique.isValidated,
                    validatedAt: boutique.validatedAt,
                    rejectedReason: boutique.rejectedReason,
                    isActive: req.user.isActive
                }
            }
        });

    } catch (error) {
        console.error('Erreur getStatutValidation:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Modifier les informations de la boutique (nom, description, categorie)
 * @route   PUT /api/boutique/informations
 * @access  Private (BOUTIQUE)
 */
const updateInformations = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        const { nomBoutique, description, categorie, siret } = req.body;

        const updateData = {};

        if (nomBoutique !== undefined) updateData['boutique.nomBoutique'] = nomBoutique;
        if (description !== undefined) updateData['boutique.description'] = description;
        if (categorie !== undefined) updateData['boutique.categorie'] = categorie;
        if (siret !== undefined) updateData['boutique.siret'] = siret;

        if (Object.keys(updateData).length === 0) {
            return res.status(BOUTIQUE_ERRORS.NO_UPDATE_DATA.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_UPDATE_DATA.message,
                error: BOUTIQUE_ERRORS.NO_UPDATE_DATA.code
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Informations de la boutique mises a jour.',
            data: {
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur updateInformations:', error);

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
 * @desc    Modifier les informations de contact (email, telephone, siteWeb)
 * @route   PUT /api/boutique/contact
 * @access  Private (BOUTIQUE)
 */
const updateContact = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        const { email, telephone, siteWeb, adresse } = req.body;

        const updateData = {};

        if (email !== undefined) updateData['boutique.email'] = email;
        if (telephone !== undefined) updateData['boutique.telephone'] = telephone;
        if (siteWeb !== undefined) updateData['boutique.siteWeb'] = siteWeb;

        if (adresse !== undefined) {
            if (adresse.rue !== undefined) updateData['boutique.adresse.rue'] = adresse.rue;
            if (adresse.ville !== undefined) updateData['boutique.adresse.ville'] = adresse.ville;
            if (adresse.codePostal !== undefined) updateData['boutique.adresse.codePostal'] = adresse.codePostal;
            if (adresse.pays !== undefined) updateData['boutique.adresse.pays'] = adresse.pays;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(BOUTIQUE_ERRORS.NO_UPDATE_DATA.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_UPDATE_DATA.message,
                error: BOUTIQUE_ERRORS.NO_UPDATE_DATA.code
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Informations de contact mises a jour.',
            data: {
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur updateContact:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Modifier les horaires d'ouverture
 * @route   PUT /api/boutique/horaires
 * @access  Private (BOUTIQUE)
 */
const updateHoraires = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        const { horaires, horairesTexte } = req.body;

        const updateData = {};

        if (horaires !== undefined) {
            updateData['boutique.horaires'] = horaires;
        }

        if (horairesTexte !== undefined) {
            updateData['boutique.horairesTexte'] = horairesTexte;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(BOUTIQUE_ERRORS.NO_UPDATE_DATA.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_UPDATE_DATA.message,
                error: BOUTIQUE_ERRORS.NO_UPDATE_DATA.code
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Horaires mis a jour.',
            data: {
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur updateHoraires:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Modifier les reseaux sociaux
 * @route   PUT /api/boutique/reseaux-sociaux
 * @access  Private (BOUTIQUE)
 */
const updateReseauxSociaux = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        const { reseauxSociaux } = req.body;

        if (!reseauxSociaux) {
            return res.status(BOUTIQUE_ERRORS.NO_UPDATE_DATA.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_UPDATE_DATA.message,
                error: BOUTIQUE_ERRORS.NO_UPDATE_DATA.code
            });
        }

        const updateData = {};
        const allowedNetworks = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'youtube'];

        allowedNetworks.forEach(network => {
            if (reseauxSociaux[network] !== undefined) {
                updateData[`boutique.reseauxSociaux.${network}`] = reseauxSociaux[network];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return res.status(BOUTIQUE_ERRORS.NO_UPDATE_DATA.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_UPDATE_DATA.message,
                error: BOUTIQUE_ERRORS.NO_UPDATE_DATA.code
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Reseaux sociaux mis a jour.',
            data: {
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur updateReseauxSociaux:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Upload ou remplacer le logo de la boutique
 * @route   PUT /api/boutique/logo
 * @access  Private (BOUTIQUE)
 */
const uploadLogo = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        if (!req.file) {
            return res.status(BOUTIQUE_ERRORS.NO_FILE_UPLOADED.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_FILE_UPLOADED.message,
                error: BOUTIQUE_ERRORS.NO_FILE_UPLOADED.code
            });
        }

        const user = await User.findById(req.user._id);

        // Supprimer l'ancien logo s'il existe
        if (user.boutique && user.boutique.logo) {
            try {
                await deleteLocalFile(`${UPLOAD_DIRS.logos}/${user.boutique.logo}`);
            } catch (deleteError) {
                console.error('Erreur suppression ancien logo:', deleteError);
            }
        }

        // Mettre a jour le logo
        user.boutique.logo = req.file.filename;
        await user.save({ validateBeforeSave: false });

        const logoUrl = `${req.protocol}://${req.get('host')}/uploads/boutiques/logos/${user.boutique.logo}`;

        res.status(200).json({
            success: true,
            message: 'Logo mis a jour avec succes.',
            data: {
                logo: user.boutique.logo,
                logoUrl: logoUrl,
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur uploadLogo:', error);

        if (req.file) {
            try {
                await deleteLocalFile(`${UPLOAD_DIRS.logos}/${req.file.filename}`);
            } catch (deleteError) {
                console.error('Erreur suppression fichier apres erreur:', deleteError);
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
 * @desc    Supprimer le logo de la boutique
 * @route   DELETE /api/boutique/logo
 * @access  Private (BOUTIQUE)
 */
const deleteLogo = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        const user = await User.findById(req.user._id);

        if (!user.boutique || !user.boutique.logo) {
            return res.status(BOUTIQUE_ERRORS.NO_LOGO.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_LOGO.message,
                error: BOUTIQUE_ERRORS.NO_LOGO.code
            });
        }

        // Supprimer le fichier
        try {
            await deleteLocalFile(`${UPLOAD_DIRS.logos}/${user.boutique.logo}`);
        } catch (deleteError) {
            console.error('Erreur suppression fichier logo:', deleteError);
        }

        // Mettre a jour la base
        user.boutique.logo = null;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Logo supprime avec succes.',
            data: {
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur deleteLogo:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Upload ou remplacer la banniere de la boutique
 * @route   PUT /api/boutique/banniere
 * @access  Private (BOUTIQUE)
 */
const uploadBanniere = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        if (!req.file) {
            return res.status(BOUTIQUE_ERRORS.NO_FILE_UPLOADED.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_FILE_UPLOADED.message,
                error: BOUTIQUE_ERRORS.NO_FILE_UPLOADED.code
            });
        }

        const user = await User.findById(req.user._id);

        // Supprimer l'ancienne banniere si elle existe
        if (user.boutique && user.boutique.banniere) {
            try {
                await deleteLocalFile(`${UPLOAD_DIRS.bannieres}/${user.boutique.banniere}`);
            } catch (deleteError) {
                console.error('Erreur suppression ancienne banniere:', deleteError);
            }
        }

        // Mettre a jour la banniere
        user.boutique.banniere = req.file.filename;
        await user.save({ validateBeforeSave: false });

        const banniereUrl = `${req.protocol}://${req.get('host')}/uploads/boutiques/bannieres/${user.boutique.banniere}`;

        res.status(200).json({
            success: true,
            message: 'Banniere mise a jour avec succes.',
            data: {
                banniere: user.boutique.banniere,
                banniereUrl: banniereUrl,
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur uploadBanniere:', error);

        if (req.file) {
            try {
                await deleteLocalFile(`${UPLOAD_DIRS.bannieres}/${req.file.filename}`);
            } catch (deleteError) {
                console.error('Erreur suppression fichier apres erreur:', deleteError);
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
 * @desc    Supprimer la banniere de la boutique
 * @route   DELETE /api/boutique/banniere
 * @access  Private (BOUTIQUE)
 */
const deleteBanniere = async (req, res) => {
    try {
        if (!checkIsBoutique(req.user, res)) return;

        const user = await User.findById(req.user._id);

        if (!user.boutique || !user.boutique.banniere) {
            return res.status(BOUTIQUE_ERRORS.NO_BANNIERE.statusCode).json({
                success: false,
                message: BOUTIQUE_ERRORS.NO_BANNIERE.message,
                error: BOUTIQUE_ERRORS.NO_BANNIERE.code
            });
        }

        // Supprimer le fichier
        try {
            await deleteLocalFile(`${UPLOAD_DIRS.bannieres}/${user.boutique.banniere}`);
        } catch (deleteError) {
            console.error('Erreur suppression fichier banniere:', deleteError);
        }

        // Mettre a jour la base
        user.boutique.banniere = null;
        await user.save({ validateBeforeSave: false });

        res.status(200).json({
            success: true,
            message: 'Banniere supprimee avec succes.',
            data: {
                boutique: user.toSafeObjectWithUrls(req)
            }
        });

    } catch (error) {
        console.error('Erreur deleteBanniere:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    getProfilBoutique,
    getStatutValidation,
    updateInformations,
    updateContact,
    updateHoraires,
    updateReseauxSociaux,
    uploadLogo,
    deleteLogo,
    uploadBanniere,
    deleteBanniere,
    BOUTIQUE_ERRORS
};