/**
 * Routes Index
 * 
 * Centralisation de toutes les routes API
 * Chaque module de routes est importé et monté sur son préfixe
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

// Routes admin (à implémenter)
// const adminRoutes = require('./admin.routes');

// Routes boutique (à implémenter)
// const boutiqueRoutes = require('./boutique.routes');

// Routes client (à implémenter)
// const clientRoutes = require('./client.routes');

// Routes produits (à implémenter)
// const produitRoutes = require('./produit.routes');

// Routes commandes (à implémenter)
// const commandeRoutes = require('./commande.routes');

// ============================================
// MONTAGE DES ROUTES
// ============================================

/**
 * Routes d'authentification
 * Préfixe : /api/auth
 * 
 * Endpoints :
 * - POST /api/auth/register - Inscription
 * - POST /api/auth/login - Connexion
 * - GET /api/auth/me - Profil utilisateur
 * - PUT /api/auth/profile - Mise à jour profil
 * - PUT /api/auth/password - Changement mot de passe
 * - PUT /api/auth/boutique - Mise à jour boutique
 * - POST /api/auth/logout - Déconnexion
 */
router.use('/auth', authRoutes);

/**
 * Routes administration
 * Préfixe : /api/admin
 * Accès : ADMIN uniquement
 * 
 * À implémenter :
 * - GET /api/admin/dashboard - Statistiques globales
 * - GET /api/admin/users - Liste des utilisateurs
 * - GET /api/admin/boutiques - Liste des boutiques
 * - PUT /api/admin/boutiques/:id/validate - Valider une boutique
 * - PUT /api/admin/boutiques/:id/reject - Rejeter une boutique
 * - PUT /api/admin/users/:id/status - Activer/Désactiver un utilisateur
 */
// router.use('/admin', adminRoutes);

/**
 * Routes boutique
 * Préfixe : /api/boutique
 * Accès : BOUTIQUE (validée) uniquement
 * 
 * À implémenter :
 * - GET /api/boutique/dashboard - Dashboard boutique
 * - GET /api/boutique/produits - Mes produits
 * - POST /api/boutique/produits - Créer un produit
 * - PUT /api/boutique/produits/:id - Modifier un produit
 * - DELETE /api/boutique/produits/:id - Supprimer un produit
 * - GET /api/boutique/commandes - Commandes reçues
 * - PUT /api/boutique/commandes/:id/status - Modifier statut commande
 */
// router.use('/boutique', boutiqueRoutes);

/**
 * Routes client
 * Préfixe : /api/client
 * Accès : CLIENT et ADMIN
 * 
 * À implémenter :
 * - GET /api/client/boutiques - Liste des boutiques
 * - GET /api/client/boutiques/:id - Détails d'une boutique
 * - GET /api/client/produits - Catalogue produits
 * - GET /api/client/produits/:id - Détails d'un produit
 * - GET /api/client/panier - Mon panier
 * - POST /api/client/panier - Ajouter au panier
 * - PUT /api/client/panier/:id - Modifier quantité
 * - DELETE /api/client/panier/:id - Retirer du panier
 * - POST /api/client/commandes - Passer commande
 * - GET /api/client/commandes - Mes commandes
 * - GET /api/client/commandes/:id - Détails d'une commande
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
          { method: 'PUT', path: '/api/auth/profile', description: 'Mise à jour profil', access: 'Private' },
          { method: 'PUT', path: '/api/auth/password', description: 'Changement mot de passe', access: 'Private' },
          { method: 'PUT', path: '/api/auth/boutique', description: 'Mise à jour boutique', access: 'BOUTIQUE' },
          { method: 'POST', path: '/api/auth/logout', description: 'Déconnexion', access: 'Private' }
        ]
      },
      admin: {
        description: 'Administration (ADMIN only)',
        status: 'À implémenter',
        routes: [
          { method: 'GET', path: '/api/admin/dashboard', description: 'Statistiques globales' },
          { method: 'GET', path: '/api/admin/users', description: 'Liste des utilisateurs' },
          { method: 'GET', path: '/api/admin/boutiques', description: 'Liste des boutiques' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/validate', description: 'Valider une boutique' },
          { method: 'PUT', path: '/api/admin/boutiques/:id/reject', description: 'Rejeter une boutique' }
        ]
      },
      boutique: {
        description: 'Gestion boutique (BOUTIQUE only)',
        status: 'À implémenter',
        routes: [
          { method: 'GET', path: '/api/boutique/dashboard', description: 'Dashboard boutique' },
          { method: 'GET', path: '/api/boutique/produits', description: 'Mes produits' },
          { method: 'POST', path: '/api/boutique/produits', description: 'Créer un produit' },
          { method: 'GET', path: '/api/boutique/commandes', description: 'Commandes reçues' }
        ]
      },
      client: {
        description: 'Interface client',
        status: 'À implémenter',
        routes: [
          { method: 'GET', path: '/api/client/boutiques', description: 'Liste des boutiques' },
          { method: 'GET', path: '/api/client/produits', description: 'Catalogue produits' },
          { method: 'GET', path: '/api/client/panier', description: 'Mon panier' },
          { method: 'POST', path: '/api/client/commandes', description: 'Passer commande' }
        ]
      }
    },
    documentation: {
      authentication: 'Ajouter le header "Authorization: Bearer <token>" pour les routes protégées',
      roles: ['ADMIN', 'BOUTIQUE', 'CLIENT'],
      responseFormat: {
        success: 'boolean - Indique si la requête a réussi',
        message: 'string - Message descriptif',
        data: 'object - Données de la réponse (si succès)',
        error: 'string - Code d\'erreur (si échec)',
        errors: 'array - Détails des erreurs de validation (si applicable)'
      }
    }
  });
});

module.exports = router;