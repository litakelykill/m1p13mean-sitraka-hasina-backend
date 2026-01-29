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

// Routes client (a implementer)
// const clientRoutes = require('./client.routes');

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
 * Routes client
 * Prefixe : /api/client
 * Acces : PUBLIC et CLIENT
 */
// router.use('/client', clientRoutes);

/**
 * @route   GET /api
 * @desc    Documentation de l'API - Liste des endpoints disponibles
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Centre Commercial - Documentation',
    version: '1.2.0',
    endpoints: {
      auth: {
        description: 'Authentification et gestion utilisateurs',
        routes: [
          { method: 'POST', path: '/api/auth/register', access: 'Public' },
          { method: 'POST', path: '/api/auth/login', access: 'Public' },
          { method: 'GET', path: '/api/auth/me', access: 'Private' },
          { method: 'PUT', path: '/api/auth/profile', access: 'Private' },
          { method: 'PUT', path: '/api/auth/password', access: 'Private' },
          { method: 'PUT', path: '/api/auth/avatar', access: 'Private' },
          { method: 'DELETE', path: '/api/auth/avatar', access: 'Private' },
          { method: 'POST', path: '/api/auth/logout', access: 'Private' }
        ]
      },
      admin: {
        description: 'Administration (ADMIN only)',
        routes: [
          { method: 'GET', path: '/api/admin/dashboard', description: 'Statistiques globales' },
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
          { method: 'PUT', path: '/api/boutique/logo', description: 'Upload logo' },
          { method: 'DELETE', path: '/api/boutique/logo', description: 'Supprimer logo' },
          { method: 'PUT', path: '/api/boutique/banniere', description: 'Upload banniere' },
          { method: 'DELETE', path: '/api/boutique/banniere', description: 'Supprimer banniere' }
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
          { method: 'PUT', path: '/api/boutique/produits/:id/image', description: 'Upload image principale' },
          { method: 'POST', path: '/api/boutique/produits/:id/images', description: 'Ajouter image galerie' },
          { method: 'DELETE', path: '/api/boutique/produits/:id/images/:filename', description: 'Supprimer image galerie' }
        ]
      },
      client: {
        description: 'Interface client',
        status: 'A implementer',
        routes: [
          { method: 'GET', path: '/api/client/boutiques', description: 'Liste boutiques' },
          { method: 'GET', path: '/api/client/produits', description: 'Catalogue produits' },
          { method: 'GET', path: '/api/client/panier', description: 'Mon panier' },
          { method: 'POST', path: '/api/client/commandes', description: 'Passer commande' }
        ]
      }
    },
    documentation: {
      authentication: 'Header "Authorization: Bearer <token>"',
      roles: ['ADMIN', 'BOUTIQUE', 'CLIENT'],
      uploads: {
        avatar: { endpoint: 'PUT /api/auth/avatar', maxSize: '2 MB' },
        logo: { endpoint: 'PUT /api/boutique/logo', maxSize: '2 MB' },
        banniere: { endpoint: 'PUT /api/boutique/banniere', maxSize: '5 MB' }
      }
    }
  });
});

module.exports = router;