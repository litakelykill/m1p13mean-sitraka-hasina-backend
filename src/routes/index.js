/**
 * Routes Index
 * 
 * Centralisation de toutes les routes API
 * 
 * @module routes/index
 */

const express = require('express');
const router = express.Router();

// ============================================
// IMPORT DES ROUTES MODULES
// ============================================
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const boutiqueRoutes = require('./boutique.routes');
const categorieRoutes = require('./categorie.routes');
const produitRoutes = require('./produit.routes');
const dashboardBoutiqueRoutes = require('./dashboard-boutique.routes');
const catalogueRoutes = require('./catalogue.routes');
const panierRoutes = require('./panier.routes');
const commandeClientRoutes = require('./commande-client.routes');
const commandeBoutiqueRoutes = require('./commande-boutique.routes');
const avisRoutes = require('./avis.routes');
const avisBoutiqueRoutes = require('./avis-boutique.routes');
const avisAdminRoutes = require('./avis-admin.routes');
const notificationRoutes = require('./notification.routes');
const searchRoutes = require('./search.routes');
const chatClientRoutes = require('./chat-client.routes');
const chatBoutiqueRoutes = require('./chat-boutique.routes');

// ============================================
// MONTAGE DES ROUTES
// ============================================

/**
 * Routes d'authentification
 * Prefixe : /api/auth
 */
router.use('/auth', authRoutes);

/**
 * Routes administration
 * Prefixe : /api/admin
 * Acces : ADMIN uniquement
 */
router.use('/admin', adminRoutes);

/**
 * Routes categories
 * Prefixe : /api/admin/categories
 * Acces : ADMIN uniquement
 */
router.use('/admin/categories', categorieRoutes);

/**
 * Routes boutique
 * Prefixe : /api/boutique
 * Acces : BOUTIQUE uniquement
 */
router.use('/boutique', boutiqueRoutes);

/**
 * Routes produits
 * Prefixe : /api/boutique/produits
 * Acces : BOUTIQUE uniquement
 */
router.use('/boutique/produits', produitRoutes);

/**
 * Routes dashboard boutique
 * Prefixe : /api/boutique/dashboard
 * Acces : BOUTIQUE uniquement
 */
router.use('/boutique/dashboard', dashboardBoutiqueRoutes);

/**
 * Routes catalogue
 * Prefixe : /api/catalogue
 * Acces : PUBLIC (pas d'authentification requise)
 */
router.use('/catalogue', catalogueRoutes);

/**
 * Routes panier
 * Prefixe : /api/panier
 * Acces : CLIENT uniquement
 */
router.use('/panier', panierRoutes);

/**
 * Routes commandes client
 * Prefixe : /api/commandes
 * Acces : CLIENT uniquement
 */
router.use('/commandes', commandeClientRoutes);

/**
 * Routes commandes boutique
 * Prefixe : /api/boutique/commandes
 * Acces : BOUTIQUE uniquement
 */
router.use('/boutique/commandes', commandeBoutiqueRoutes);

/**
 * Routes avis (CLIENT + PUBLIC)
 * Prefixe : /api/avis
 * Acces : PUBLIC (lecture) et CLIENT (ecriture)
 */
router.use('/avis', avisRoutes);

/**
 * Routes avis boutique
 * Prefixe : /api/boutique/avis
 * Acces : BOUTIQUE uniquement
 */
router.use('/boutique/avis', avisBoutiqueRoutes);

/**
 * Routes avis admin
 * Prefixe : /api/admin/avis
 * Acces : ADMIN uniquement
 */
router.use('/admin/avis', avisAdminRoutes);

/**
 * Routes notifications
 * Prefixe : /api/notifications
 * Acces : Tous les utilisateurs connectes
 */
router.use('/notifications', notificationRoutes);

/**
 * Routes recherche avancee
 * Prefixe : /api/search
 * Acces : PUBLIC (historique = Private)
 */
router.use('/search', searchRoutes);

/**
 * Routes chat client
 * Prefixe : /api/chat
 * Acces : CLIENT uniquement
 */
router.use('/chat', chatClientRoutes);

/**
 * Routes chat boutique
 * Prefixe : /api/boutique/chat
 * Acces : BOUTIQUE uniquement
 */
router.use('/boutique/chat', chatBoutiqueRoutes);

// ============================================
// ROUTE DE CONFIGURATION (pour frontend)
// ============================================
router.get('/config', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.status(200).json({
    success: true,
    data: {
      api: {
        baseUrl: baseUrl,
        version: '1.8.0'
      },
      uploads: {
        // LOCAL
        local: {
          baseUrl: `${baseUrl}/uploads`,
          paths: {
            avatar: `${baseUrl}/uploads/avatars`,
            logo: `${baseUrl}/uploads/boutiques/logos`,
            banniere: `${baseUrl}/uploads/boutiques/bannieres`,
            produit: `${baseUrl}/uploads/produits`
          }
        },
        // CLOUDINARY
        cloudinary: {
          enabled: !!(process.env.CLOUDINARY_CLOUD_NAME),
          folders: {
            avatar: 'centre-commercial/avatars',
            logo: 'centre-commercial/boutiques/logos',
            banniere: 'centre-commercial/boutiques/bannieres',
            produit: 'centre-commercial/produits'
          }
        },
        maxSizes: {
          avatar: '2 MB',
          logo: '2 MB',
          banniere: '5 MB',
          produit: '2 MB'
        },
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      },
      placeholders: {
        avatar: `${baseUrl}/uploads/placeholders/avatar.png`,
        logo: `${baseUrl}/uploads/placeholders/logo.png`,
        banniere: `${baseUrl}/uploads/placeholders/banniere.png`,
        produit: `${baseUrl}/uploads/placeholders/produit.png`
      },
      chat: {
        pollingInterval: 5000,
        maxMessageLength: 2000
      },
      commandes: {
        statuts: ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'en_livraison', 'livree', 'annulee', 'rupture'],
        paiementStatuts: ['en_attente', 'paye', 'echoue', 'rembourse']
      }
    }
  });
});

/**
 * @route   GET /api
 * @desc    Documentation de l'API
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Centre Commercial - Documentation',
    version: '1.8.0',
    endpoints: {
      auth: {
        description: 'Authentification et gestion utilisateurs',
        routes: [
          { method: 'POST', path: '/api/auth/register', access: 'Public' },
          { method: 'POST', path: '/api/auth/login', access: 'Public' },
          { method: 'GET', path: '/api/auth/me', access: 'Private' },
          { method: 'PUT', path: '/api/auth/profile', access: 'Private' },
          { method: 'PUT', path: '/api/auth/password', access: 'Private' },
          { method: 'PUT', path: '/api/auth/avatar', access: 'Private', description: 'Upload avatar (LOCAL)' },
          { method: 'DELETE', path: '/api/auth/avatar', access: 'Private', description: 'Supprimer avatar (LOCAL)' },
          { method: 'PUT', path: '/api/auth/avatar/cloud', access: 'Private', description: 'Upload avatar (CLOUDINARY)' },
          { method: 'DELETE', path: '/api/auth/avatar/cloud', access: 'Private', description: 'Supprimer avatar (CLOUDINARY)' },
          { method: 'POST', path: '/api/auth/logout', access: 'Private' }
        ]
      },
      admin: {
        description: 'Administration (ADMIN only)',
        routes: [
          { method: 'GET', path: '/api/admin/dashboard', description: 'Statistiques globales' },
          { method: 'GET', path: '/api/admin/dashboard/graphiques', description: 'Donnees pour graphiques' },
          { method: 'GET', path: '/api/admin/boutiques/en-attente', description: 'Boutiques en attente' },
          { method: 'GET', path: '/api/admin/boutiques/validees', description: 'Boutiques validees' },
          { method: 'GET', path: '/api/admin/boutiques/suspendues', description: 'Boutiques suspendues' },
          { method: 'GET', path: '/api/admin/boutiques/rejetees', description: 'Boutiques rejetees' },
          { method: 'GET', path: '/api/admin/boutiques/:id', description: 'Details boutique' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/valider', description: 'Valider' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/suspendre', description: 'Suspendre' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/reactiver', description: 'Reactiver' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/rejeter', description: 'Rejeter' },
          { method: 'DELETE', path: '/api/admin/boutiques/:id', description: 'Supprimer' }
        ]
      },
      categories: {
        description: 'Gestion des categories (ADMIN only)',
        routes: [
          { method: 'POST', path: '/api/admin/categories', description: 'Creer categorie' },
          { method: 'GET', path: '/api/admin/categories', description: 'Liste categories' },
          { method: 'GET', path: '/api/admin/categories/liste', description: 'Liste simple (dropdown)' },
          { method: 'GET', path: '/api/admin/categories/:id', description: 'Details categorie' },
          { method: 'PUT', path: '/api/admin/categories/:id', description: 'Modifier categorie' },
          { method: 'DELETE', path: '/api/admin/categories/:id', description: 'Supprimer categorie' },
          { method: 'PUT', path: '/api/admin/categories/:id/toggle', description: 'Activer/Desactiver' },
          { method: 'PUT', path: '/api/admin/categories/:id/ordre', description: 'Modifier ordre' }
        ]
      },
      boutique: {
        description: 'Gestion profil boutique (BOUTIQUE only)',
        routes: [
          { method: 'GET', path: '/api/boutique/profil', description: 'Profil complet' },
          { method: 'GET', path: '/api/boutique/statut', description: 'Statut validation' },
          { method: 'PUT', path: '/api/boutique/informations', description: 'Modifier infos' },
          { method: 'PUT', path: '/api/boutique/contact', description: 'Modifier contact' },
          { method: 'PUT', path: '/api/boutique/horaires', description: 'Modifier horaires' },
          { method: 'PUT', path: '/api/boutique/reseaux-sociaux', description: 'Modifier reseaux' },
          { method: 'PUT', path: '/api/boutique/logo', description: 'Upload logo (LOCAL)' },
          { method: 'DELETE', path: '/api/boutique/logo', description: 'Supprimer logo (LOCAL)' },
          { method: 'PUT', path: '/api/boutique/logo/cloud', description: 'Upload logo (CLOUDINARY)' },
          { method: 'DELETE', path: '/api/boutique/logo/cloud', description: 'Supprimer logo (CLOUDINARY)' },
          { method: 'PUT', path: '/api/boutique/banniere', description: 'Upload banniere (LOCAL)' },
          { method: 'DELETE', path: '/api/boutique/banniere', description: 'Supprimer banniere (LOCAL)' },
          { method: 'PUT', path: '/api/boutique/banniere/cloud', description: 'Upload banniere (CLOUDINARY)' },
          { method: 'DELETE', path: '/api/boutique/banniere/cloud', description: 'Supprimer banniere (CLOUDINARY)' }
        ]
      },
      produits: {
        description: 'Gestion des produits (BOUTIQUE only)',
        routes: [
          { method: 'POST', path: '/api/boutique/produits', description: 'Creer produit' },
          { method: 'GET', path: '/api/boutique/produits', description: 'Liste produits' },
          { method: 'GET', path: '/api/boutique/produits/stats', description: 'Statistiques' },
          { method: 'GET', path: '/api/boutique/produits/:id', description: 'Details produit' },
          { method: 'PUT', path: '/api/boutique/produits/:id', description: 'Modifier produit' },
          { method: 'DELETE', path: '/api/boutique/produits/:id', description: 'Supprimer produit' },
          { method: 'PUT', path: '/api/boutique/produits/:id/toggle', description: 'Activer/Desactiver' },
          { method: 'PUT', path: '/api/boutique/produits/:id/stock', description: 'Modifier stock' },
          { method: 'PUT', path: '/api/boutique/produits/:id/promo', description: 'Gerer promotion' },
          { method: 'PUT', path: '/api/boutique/produits/:id/image', description: 'Upload image principale (LOCAL)' },
          { method: 'DELETE', path: '/api/boutique/produits/:id/image', description: 'Supprimer image principale (LOCAL)' },
          { method: 'PUT', path: '/api/boutique/produits/:id/image/cloud', description: 'Upload image principale (CLOUDINARY)' },
          { method: 'DELETE', path: '/api/boutique/produits/:id/image/cloud', description: 'Supprimer image principale (CLOUDINARY)' },
          { method: 'POST', path: '/api/boutique/produits/:id/images', description: 'Ajouter image galerie (LOCAL)' },
          { method: 'DELETE', path: '/api/boutique/produits/:id/images/:filename', description: 'Supprimer image galerie (LOCAL)' },
          { method: 'POST', path: '/api/boutique/produits/:id/images/cloud', description: 'Ajouter image galerie (CLOUDINARY)' },
          { method: 'DELETE', path: '/api/boutique/produits/:id/images/cloud/:imageUrl', description: 'Supprimer image galerie (CLOUDINARY)' }
        ]
      },
      dashboardBoutique: {
        description: 'Tableau de bord boutique (BOUTIQUE only)',
        routes: [
          { method: 'GET', path: '/api/boutique/dashboard', description: 'Stats globales' },
          { method: 'GET', path: '/api/boutique/dashboard/resume', description: 'Resume rapide' },
          { method: 'GET', path: '/api/boutique/dashboard/alertes-stock', description: 'Alertes stock' },
          { method: 'GET', path: '/api/boutique/dashboard/produits-par-categorie', description: 'Repartition' },
          { method: 'GET', path: '/api/boutique/dashboard/dernieres-commandes', description: 'Dernieres commandes' },
          { method: 'GET', path: '/api/boutique/dashboard/graphique-ventes', description: 'Graphique ventes' }
        ]
      },
      catalogue: {
        description: 'Catalogue produits et boutiques (PUBLIC)',
        routes: [
          { method: 'GET', path: '/api/catalogue/produits', description: 'Liste produits' },
          { method: 'GET', path: '/api/catalogue/produits/:id', description: 'Details par ID' },
          { method: 'GET', path: '/api/catalogue/produits/slug/:slug', description: 'Details par slug' },
          { method: 'GET', path: '/api/catalogue/categories', description: 'Categories' },
          { method: 'GET', path: '/api/catalogue/boutiques', description: 'Liste boutiques' },
          { method: 'GET', path: '/api/catalogue/boutiques/categories', description: 'Categories boutiques' },
          { method: 'GET', path: '/api/catalogue/boutiques/:id', description: 'Details boutique' },
          { method: 'GET', path: '/api/catalogue/boutiques/:id/produits', description: 'Produits boutique' }
        ]
      },
      panier: {
        description: 'Panier client (CLIENT only)',
        routes: [
          { method: 'GET', path: '/api/panier', description: 'Voir panier' },
          { method: 'GET', path: '/api/panier/count', description: 'Nombre articles' },
          { method: 'GET', path: '/api/panier/verify', description: 'Verifier validite' },
          { method: 'POST', path: '/api/panier/items', description: 'Ajouter produit' },
          { method: 'PUT', path: '/api/panier/items/:produitId', description: 'Modifier quantite' },
          { method: 'DELETE', path: '/api/panier/items/:produitId', description: 'Retirer produit' },
          { method: 'DELETE', path: '/api/panier', description: 'Vider panier' }
        ]
      },
      commandesClient: {
        description: 'Commandes client (CLIENT only)',
        routes: [
          { method: 'POST', path: '/api/commandes', description: 'Passer commande' },
          { method: 'GET', path: '/api/commandes', description: 'Liste commandes' },
          { method: 'GET', path: '/api/commandes/:id', description: 'Details' },
          { method: 'GET', path: '/api/commandes/:id/suivi', description: 'Suivi livraison' },
          { method: 'PUT', path: '/api/commandes/:id/annuler', description: 'Annuler' },
          { method: 'PUT', path: '/api/commandes/:id/confirmer-reception', description: 'Confirmer reception' },
          { method: 'PUT', path: '/api/commandes/:id/payer', description: 'Payer commande' }
        ]
      },
      commandesBoutique: {
        description: 'Commandes boutique (BOUTIQUE only)',
        routes: [
          { method: 'GET', path: '/api/boutique/commandes', description: 'Liste recues' },
          { method: 'GET', path: '/api/boutique/commandes/nouvelles', description: 'En attente' },
          { method: 'GET', path: '/api/boutique/commandes/stats', description: 'Statistiques' },
          { method: 'GET', path: '/api/boutique/commandes/:id', description: 'Details' },
          { method: 'PUT', path: '/api/boutique/commandes/:id/statut', description: 'Changer statut' },
          { method: 'POST', path: '/api/boutique/commandes/:id/notes', description: 'Ajouter note' }
        ]
      },
      avis: {
        description: 'Avis sur les boutiques',
        routes: [
          { method: 'GET', path: '/api/avis/boutique/:boutiqueId', description: 'Liste avis (PUBLIC)' },
          { method: 'POST', path: '/api/avis', description: 'Donner avis (CLIENT)' },
          { method: 'GET', path: '/api/avis/mes-avis', description: 'Mes avis (CLIENT)' },
          { method: 'PUT', path: '/api/avis/:id', description: 'Modifier (CLIENT)' },
          { method: 'DELETE', path: '/api/avis/:id', description: 'Supprimer (CLIENT)' },
          { method: 'POST', path: '/api/avis/:id/utile', description: 'Marquer utile (CLIENT)' }
        ]
      },
      avisBoutique: {
        description: 'Gestion avis recus (BOUTIQUE only)',
        routes: [
          { method: 'GET', path: '/api/boutique/avis', description: 'Liste des avis recus' },
          { method: 'POST', path: '/api/boutique/avis/:id/reponse', description: 'Repondre a un avis' },
          { method: 'PUT', path: '/api/boutique/avis/:id/reponse', description: 'Modifier sa reponse' }
        ]
      },
      avisAdmin: {
        description: 'Moderation avis (ADMIN only)',
        routes: [
          { method: 'GET', path: '/api/admin/avis/signales', description: 'Avis signales' },
          { method: 'PUT', path: '/api/admin/avis/:id/moderer', description: 'Moderer un avis' }
        ]
      },
      notifications: {
        description: 'Notifications utilisateur (Private)',
        routes: [
          { method: 'GET', path: '/api/notifications', description: 'Liste des notifications' },
          { method: 'GET', path: '/api/notifications/count', description: 'Nombre de non lues' },
          { method: 'GET', path: '/api/notifications/types', description: 'Types de notifications' },
          { method: 'GET', path: '/api/notifications/:id', description: 'Detail notification' },
          { method: 'PUT', path: '/api/notifications/:id/read', description: 'Marquer comme lue' },
          { method: 'PUT', path: '/api/notifications/read-all', description: 'Tout marquer comme lu' },
          { method: 'DELETE', path: '/api/notifications/:id', description: 'Supprimer notification' },
          { method: 'DELETE', path: '/api/notifications/read', description: 'Supprimer les lues' }
        ]
      },
      search: {
        description: 'Recherche avancee (PUBLIC + Private pour historique)',
        routes: [
          { method: 'GET', path: '/api/search?q=xxx', description: 'Recherche unifiee produits/boutiques' },
          { method: 'GET', path: '/api/search/suggestions?q=xxx', description: 'Suggestions autocomplete' },
          { method: 'GET', path: '/api/search/trending', description: 'Recherches populaires' },
          { method: 'GET', path: '/api/search/history', description: 'Historique utilisateur (Private)' },
          { method: 'GET', path: '/api/search/recent', description: 'Recherches recentes (Private)' },
          { method: 'DELETE', path: '/api/search/history', description: 'Supprimer historique (Private)' },
          { method: 'DELETE', path: '/api/search/history/:id', description: 'Supprimer une recherche (Private)' }
        ]
      },
      chat: {
        description: 'Chat securise client-boutique (AES-256)',
        routes: [
          { method: 'POST', path: '/api/chat/conversations', description: 'Demarrer conversation (CLIENT)' },
          { method: 'GET', path: '/api/chat/conversations', description: 'Liste conversations (CLIENT)' },
          { method: 'GET', path: '/api/chat/conversations/unread-count', description: 'Non lues (CLIENT)' },
          { method: 'GET', path: '/api/chat/conversations/search', description: 'Rechercher (CLIENT)' },
          { method: 'GET', path: '/api/chat/conversations/:id', description: 'Details + messages (CLIENT)' },
          { method: 'POST', path: '/api/chat/conversations/:id/messages', description: 'Envoyer message (CLIENT)' },
          { method: 'GET', path: '/api/chat/conversations/:id/poll', description: 'Polling (CLIENT)' },
          { method: 'PUT', path: '/api/chat/conversations/:id/read', description: 'Marquer lu (CLIENT)' },
          { method: 'GET', path: '/api/boutique/chat/conversations', description: 'Liste (BOUTIQUE)' },
          { method: 'GET', path: '/api/boutique/chat/conversations/unread-count', description: 'Non lues (BOUTIQUE)' },
          { method: 'GET', path: '/api/boutique/chat/conversations/search', description: 'Rechercher (BOUTIQUE)' },
          { method: 'GET', path: '/api/boutique/chat/conversations/:id', description: 'Details (BOUTIQUE)' },
          { method: 'POST', path: '/api/boutique/chat/conversations/:id/messages', description: 'Repondre (BOUTIQUE)' },
          { method: 'GET', path: '/api/boutique/chat/conversations/:id/poll', description: 'Polling (BOUTIQUE)' },
          { method: 'PUT', path: '/api/boutique/chat/conversations/:id/read', description: 'Marquer lu (BOUTIQUE)' }
        ]
      }
    },
    documentation: {
      authentication: 'Header "Authorization: Bearer <token>"',
      roles: ['ADMIN', 'BOUTIQUE', 'CLIENT'],
      uploads: {
        local: {
          avatar: { endpoint: 'PUT /api/auth/avatar', maxSize: '2 MB' },
          logo: { endpoint: 'PUT /api/boutique/logo', maxSize: '2 MB' },
          banniere: { endpoint: 'PUT /api/boutique/banniere', maxSize: '5 MB' },
          produit: { endpoint: 'PUT /api/boutique/produits/:id/image', maxSize: '2 MB' }
        },
        cloudinary: {
          avatar: { endpoint: 'PUT /api/auth/avatar/cloud', maxSize: '2 MB' },
          logo: { endpoint: 'PUT /api/boutique/logo/cloud', maxSize: '2 MB' },
          banniere: { endpoint: 'PUT /api/boutique/banniere/cloud', maxSize: '5 MB' },
          produit: { endpoint: 'PUT /api/boutique/produits/:id/image/cloud', maxSize: '2 MB' },
          note: 'Utiliser les routes /cloud pour le stockage Cloudinary (production)'
        }
      },
      chat: {
        encryption: 'AES-256-GCM',
        pollingInterval: '5 seconds'
      },
      commandes: {
        statuts: ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'en_livraison', 'livree', 'annulee', 'rupture'],
        flux: 'en_attente → confirmee → en_preparation → expediee → en_livraison → livree',
        paiement: 'Client peut payer apres que toutes les sous-commandes soient livrees'
      }
    }
  });
});

module.exports = router;