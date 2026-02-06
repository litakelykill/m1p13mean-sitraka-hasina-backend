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

// ============================================
// MONTAGE DES ROUTES
// ============================================

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/categories', categorieRoutes);
router.use('/boutique', boutiqueRoutes);
router.use('/boutique/produits', produitRoutes);
router.use('/boutique/dashboard', dashboardBoutiqueRoutes);
router.use('/boutique/commandes', commandeBoutiqueRoutes);
router.use('/catalogue', catalogueRoutes);
router.use('/panier', panierRoutes);
router.use('/commandes', commandeClientRoutes);

// ============================================
// ROUTE DE CONFIGURATION (pour frontend)
// ============================================
router.get('/config', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.status(200).json({
    success: true,
    data: {
      api: { baseUrl, version: '1.3.0' },
      uploads: {
        baseUrl: `${baseUrl}/uploads`,
        paths: {
          avatar: `${baseUrl}/uploads/avatars`,
          logo: `${baseUrl}/uploads/boutiques/logos`,
          banniere: `${baseUrl}/uploads/boutiques/bannieres`,
          produit: `${baseUrl}/uploads/produits`
        },
        maxSizes: { avatar: '2 MB', logo: '2 MB', banniere: '5 MB', produit: '2 MB' },
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      },
      placeholders: {
        avatar: `${baseUrl}/uploads/placeholders/avatar.png`,
        logo: `${baseUrl}/uploads/placeholders/logo.png`,
        banniere: `${baseUrl}/uploads/placeholders/banniere.png`,
        produit: `${baseUrl}/uploads/placeholders/produit.png`
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
    version: '1.3.0',
    totalRoutes: 81,
    endpoints: {
      auth: {
        description: 'Authentification (9 routes)',
        base: '/api/auth',
        routes: ['POST /register', 'POST /login', 'GET /me', 'PUT /profile', 'PUT /password', 'PUT /avatar', 'DELETE /avatar', 'POST /logout']
      },
      admin: {
        description: 'Administration boutiques (11 routes)',
        base: '/api/admin',
        routes: ['GET /dashboard', 'GET /boutiques/en-attente', 'GET /boutiques/validees', 'GET /boutiques/suspendues', 'GET /boutiques/rejetees', 'GET /boutiques/:id', 'PUT /boutiques/:id/valider', 'PUT /boutiques/:id/suspendre', 'PUT /boutiques/:id/reactiver', 'PUT /boutiques/:id/rejeter', 'DELETE /boutiques/:id']
      },
      categories: {
        description: 'Gestion categories (8 routes)',
        base: '/api/admin/categories',
        routes: ['POST /', 'GET /', 'GET /liste', 'GET /:id', 'PUT /:id', 'DELETE /:id', 'PUT /:id/toggle', 'PUT /:id/ordre']
      },
      boutique: {
        description: 'Profil boutique (10 routes)',
        base: '/api/boutique',
        routes: ['GET /profil', 'GET /statut', 'PUT /informations', 'PUT /contact', 'PUT /horaires', 'PUT /reseaux-sociaux', 'PUT /logo', 'DELETE /logo', 'PUT /banniere', 'DELETE /banniere']
      },
      produits: {
        description: 'Gestion produits (13 routes)',
        base: '/api/boutique/produits',
        routes: ['POST /', 'GET /', 'GET /stats', 'GET /:id', 'PUT /:id', 'DELETE /:id', 'PUT /:id/toggle', 'PUT /:id/stock', 'PUT /:id/promo', 'PUT /:id/image', 'DELETE /:id/image', 'POST /:id/images', 'DELETE /:id/images/:filename']
      },
      dashboardBoutique: {
        description: 'Dashboard boutique (5 routes)',
        base: '/api/boutique/dashboard',
        routes: ['GET /', 'GET /resume', 'GET /alertes-stock', 'GET /produits-par-categorie', 'GET /dernieres-commandes']
      },
      commandesBoutique: {
        description: 'Commandes boutique (6 routes)',
        base: '/api/boutique/commandes',
        routes: ['GET /', 'GET /nouvelles', 'GET /stats', 'GET /:id', 'PUT /:id/statut', 'POST /:id/notes']
      },
      catalogue: {
        description: 'Catalogue public (8 routes)',
        base: '/api/catalogue',
        routes: ['GET /produits', 'GET /produits/:id', 'GET /produits/slug/:slug', 'GET /categories', 'GET /boutiques', 'GET /boutiques/categories', 'GET /boutiques/:id', 'GET /boutiques/:id/produits']
      },
      panier: {
        description: 'Panier client (7 routes)',
        base: '/api/panier',
        routes: ['GET /', 'GET /count', 'GET /verify', 'POST /items', 'PUT /items/:produitId', 'DELETE /items/:produitId', 'DELETE /']
      },
      commandes: {
        description: 'Commandes client (5 routes)',
        base: '/api/commandes',
        routes: ['POST /', 'GET /', 'GET /:id', 'GET /:id/suivi', 'PUT /:id/annuler']
      }
    },
    statuts: {
      commande: {
        description: 'Statuts possibles pour les commandes',
        values: ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree', 'annulee', 'rupture'],
        transitions: {
          en_attente: ['confirmee', 'annulee', 'rupture'],
          confirmee: ['en_preparation', 'annulee'],
          en_preparation: ['expediee', 'annulee'],
          expediee: ['livree'],
          livree: [],
          annulee: [],
          rupture: []
        }
      }
    },
    documentation: {
      authentication: 'Header "Authorization: Bearer <token>"',
      roles: ['ADMIN', 'BOUTIQUE', 'CLIENT']
    }
  });
});

module.exports = router;