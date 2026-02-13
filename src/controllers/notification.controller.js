/**
 * Notification Controller
 * 
 * Contrôleur pour la gestion des notifications
 * 
 * Endpoints :
 * - GET /notifications - Liste des notifications
 * - GET /notifications/count - Nombre de notifications non lues
 * - PUT /notifications/:id/read - Marquer comme lue
 * - PUT /notifications/read-all - Marquer toutes comme lues
 * - DELETE /notifications/:id - Supprimer une notification
 * - DELETE /notifications/read - Supprimer les notifications lues
 * 
 * @module controllers/notification.controller
 */

const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../models/Notification');

/**
 * @desc    Récupérer les notifications de l'utilisateur connecté
 * @route   GET /api/notifications
 * @access  Private
 * @query   page, limit, unreadOnly, type
 */
const getNotifications = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            unreadOnly = 'false',
            type = null
        } = req.query;

        const result = await Notification.pourUtilisateur(req.user._id, {
            page: parseInt(page),
            limit: parseInt(limit),
            nonLuesSeulement: unreadOnly === 'true',
            type: type || null
        });

        res.status(200).json({
            success: true,
            message: 'Notifications récupérées avec succès',
            data: {
                notifications: result.notifications,
                pagination: result.pagination
            }
        });

    } catch (error) {
        console.error('Erreur getNotifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des notifications',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Récupérer le nombre de notifications non lues
 * @route   GET /api/notifications/count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.compterNonLues(req.user._id);

        res.status(200).json({
            success: true,
            message: 'Compteur récupéré',
            data: {
                unreadCount: count
            }
        });

    } catch (error) {
        console.error('Erreur getUnreadCount:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du comptage des notifications',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Récupérer une notification par son ID
 * @route   GET /api/notifications/:id
 * @access  Private
 */
const getNotification = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            destinataire: req.user._id,
            supprime: false
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
                error: 'NOTIFICATION_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification récupérée',
            data: {
                notification
            }
        });

    } catch (error) {
        console.error('Erreur getNotification:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de la notification',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Marquer une notification comme lue
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.marquerCommeLue(
            req.params.id,
            req.user._id
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
                error: 'NOTIFICATION_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification marquée comme lue',
            data: {
                notification
            }
        });

    } catch (error) {
        console.error('Erreur markAsRead:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Marquer toutes les notifications comme lues
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
    try {
        const count = await Notification.marquerToutesCommeLues(req.user._id);

        res.status(200).json({
            success: true,
            message: `${count} notification(s) marquée(s) comme lue(s)`,
            data: {
                modifiedCount: count
            }
        });

    } catch (error) {
        console.error('Erreur markAllAsRead:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Supprimer une notification (soft delete)
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.supprimerNotification(
            req.params.id,
            req.user._id
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification non trouvée',
                error: 'NOTIFICATION_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification supprimée',
            data: null
        });

    } catch (error) {
        console.error('Erreur deleteNotification:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Supprimer toutes les notifications lues
 * @route   DELETE /api/notifications/read
 * @access  Private
 */
const deleteReadNotifications = async (req, res) => {
    try {
        const count = await Notification.supprimerLues(req.user._id);

        res.status(200).json({
            success: true,
            message: `${count} notification(s) lue(s) supprimée(s)`,
            data: {
                deletedCount: count
            }
        });

    } catch (error) {
        console.error('Erreur deleteReadNotifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

/**
 * @desc    Récupérer les types de notifications
 * @route   GET /api/notifications/types
 * @access  Private
 */
const getNotificationTypes = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Types de notifications',
            data: {
                types: NOTIFICATION_TYPES
            }
        });

    } catch (error) {
        console.error('Erreur getNotificationTypes:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: 'INTERNAL_SERVER_ERROR'
        });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    getNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    getNotificationTypes
};