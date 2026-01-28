/**
 * Routes Index
 * 
 * Centralisation de toutes les routes API
 * Chaque module de routes est importe et monte sur son prefixe
 * 
 * @module routes/index
 */

const express = require('express');
const router = express.Router();

// ============================================
// IMPORT DES ROUTES MODULES
// ============================================

// Routes d'authentification
const authRoutes = require('./auth.routes');

// Routes admin (a implementer)
// const adminRoutes = require('./admin.routes');

// Routes boutique (a implementer)
// const boutiqueRoutes = require('./boutique.routes');

// Routes client (a implementer)
// const clientRoutes = require('./client.routes');

// Routes produits (a implementer)
// const produitRoutes = require('./produit.routes');

// Routes commandes (a implementer)
// const commandeRoutes = require('./commande.routes');

// ============================================
// MONTAGE DES ROUTES
// ============================================

/**
 * Routes d'authentification
 * Prefixe : /api/auth
 * 
 * Endpoints :
 * - POST /api/auth/register - Inscription
 * - POST /api/auth/login - Connexion
 * - GET /api/auth/me - Profil utilisateur
 * - PUT /api/auth/profile - Mise a jour profil
 * - PUT /api/auth/password - Changement mot de passe
 * - PUT /api/auth/avatar - Upload photo de profil
 * - DELETE /api/auth/avatar - Supprimer photo de profil
 * - PUT /api/auth/boutique - Mise a jour boutique
 * - POST /api/auth/logout - Deconnexion
 */
router.use('/auth', authRoutes);

/**
 * Routes administration
 * Prefixe : /api/admin
 * Acces : ADMIN uniquement
 * 
 * A implementer :
 * - GET /api/admin/dashboard - Statistiques globales
 * - GET /api/admin/users - Liste des utilisateurs
 * - GET /api/admin/boutiques - Liste des boutiques
 * - PUT /api/admin/boutiques/:id/validate - Valider une boutique
 * - PUT /api/admin/boutiques/:id/reject - Rejeter une boutique
 * - PUT /api/admin/users/:id/status - Activer/Desactiver un utilisateur
 */
// router.use('/admin', adminRoutes);

/**
 * Routes boutique
 * Prefixe : /api/boutique
 * Acces : BOUTIQUE (validee) uniquement
 * 
 * A implementer :
 * - GET /api/boutique/dashboard - Dashboard boutique
 * - GET /api/boutique/produits - Mes produits
 * - POST /api/boutique/produits - Creer un produit
 * - PUT /api/boutique/produits/:id - Modifier un produit
 * - DELETE /api/boutique/produits/:id - Supprimer un produit
 * - GET /api/boutique/commandes - Commandes recues
 * - PUT /api/boutique/commandes/:id/status - Modifier statut commande
 */
// router.use('/boutique', boutiqueRoutes);

/**
 * Routes client
 * Prefixe : /api/client
 * Acces : CLIENT et ADMIN
 * 
 * A implementer :
 * - GET /api/client/boutiques - Liste des boutiques
 * - GET /api/client/boutiques/:id - Details d'une boutique
 * - GET /api/client/produits - Catalogue produits
 * - GET /api/client/produits/:id - Details d'un produit
 * - GET /api/client/panier - Mon panier
 * - POST /api/client/panier - Ajouter au panier
 * - PUT /api/client/panier/:id - Modifier quantite
 * - DELETE /api/client/panier/:id - Retirer du panier
 * - POST /api/client/commandes - Passer commande
 * - GET /api/client/commandes - Mes commandes
 * - GET /api/client/commandes/:id - Details d'une commande
 */
// router.use('/client', clientRoutes);

// ============================================
// ROUTE DE DOCUMENTATION API
// ============================================

/**
 * @route   GET /api
 * @desc    Documentation de l'API - Liste des endpoints disponibles
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Centre Commercial - Documentation',
    version: '1.0.0',
    endpoints: {
      auth: {
        description: 'Authentification et gestion utilisateurs',
        routes: [
          { method: 'POST', path: '/api/auth/register', description: 'Inscription', access: 'Public' },
          { method: 'POST', path: '/api/auth/login', description: 'Connexion', access: 'Public' },
          { method: 'GET', path: '/api/auth/me', description: 'Profil utilisateur', access: 'Private' },
          { method: 'PUT', path: '/api/auth/profile', description: 'Mise a jour profil', access: 'Private' },
          { method: 'PUT', path: '/api/auth/password', description: 'Changement mot de passe', access: 'Private' },
          { method: 'PUT', path: '/api/auth/avatar', description: 'Upload photo de profil', access: 'Private' },
          { method: 'DELETE', path: '/api/auth/avatar', description: 'Supprimer photo de profil', access: 'Private' },
          { method: 'PUT', path: '/api/auth/boutique', description: 'Mise a jour boutique', access: 'BOUTIQUE' },
          { method: 'POST', path: '/api/auth/logout', description: 'Deconnexion', access: 'Private' }
        ]
      },
      admin: {
        description: 'Administration (ADMIN only)',
        status: 'A implementer',
        routes: [
          { method: 'GET', path: '/api/admin/dashboard', description: 'Statistiques globales' },
          { method: 'GET', path: '/api/admin/users', description: 'Liste des utilisateurs' },
          { method: 'GET', path: '/api/admin/boutiques', description: 'Liste des boutiques' },
          { method: 'GET', path: '/api/admin/boutiques/en-attente', description: 'Boutiques en attente' },
          { method: 'GET', path: '/api/admin/boutiques/validees', description: 'Boutiques validees' },
          { method: 'GET', path: '/api/admin/boutiques/suspendues', description: 'Boutiques suspendues' },
          { method: 'GET', path: '/api/admin/boutiques/:id', description: 'Details boutique' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/valider', description: 'Valider une boutique' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/suspendre', description: 'Suspendre une boutique' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/reactiver', description: 'Reactiver une boutique' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/rejeter', description: 'Rejeter une boutique' },
          { method: 'DELETE', path: '/api/admin/boutiques/:id', description: 'Supprimer une boutique' }
        ]
      },
      boutique: {
        description: 'Gestion boutique (BOUTIQUE only)',
        status: 'A implementer',
        routes: [
          { method: 'GET', path: '/api/boutique/dashboard', description: 'Dashboard boutique' },
          { method: 'GET', path: '/api/boutique/produits', description: 'Mes produits' },
          { method: 'POST', path: '/api/boutique/produits', description: 'Creer un produit' },
          { method: 'GET', path: '/api/boutique/commandes', description: 'Commandes recues' }
        ]
      },
      client: {
        description: 'Interface client',
        status: 'A implementer',
        routes: [
          { method: 'GET', path: '/api/client/boutiques', description: 'Liste des boutiques' },
          { method: 'GET', path: '/api/client/produits', description: 'Catalogue produits' },
          { method: 'GET', path: '/api/client/panier', description: 'Mon panier' },
          { method: 'POST', path: '/api/client/commandes', description: 'Passer commande' }
        ]
      }
    },
    documentation: {
      authentication: 'Ajouter le header "Authorization: Bearer <token>" pour les routes protegees',
      roles: ['ADMIN', 'BOUTIQUE', 'CLIENT'],
      avatarUpload: {
        endpoint: 'PUT /api/auth/avatar',
        contentType: 'multipart/form-data',
        fieldName: 'avatar',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        maxSize: '2 MB'
      },
      responseFormat: {
        success: 'boolean - Indique si la requete a reussi',
        message: 'string - Message descriptif',
        data: 'object - Donnees de la reponse (si succes)',
        error: 'string - Code d\'erreur (si echec)',
        errors: 'array - Details des erreurs de validation (si applicable)'
      }
    }
  });
});

module.exports = router;