const express = require('express');
const router = express.Router();

// ============================================
// IMPORT DES ROUTES (commentés car pas encore créés)
// ============================================

// const authRoutes = require('./auth.routes');
// const adminRoutes = require('./admin.routes');
// const boutiqueRoutes = require('./boutique.routes');
// const clientRoutes = require('./client.routes');

// ============================================
// ROUTE DE DOCUMENTATION API
// ============================================

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Centre Commercial - Documentation',
    version: '1.0.0',
    baseUrl: '/api',
    routes: {
      status: 'Routes seront ajoutées progressivement',
      authentication: {
        base: '/api/auth',
        status: 'À créer',
        endpoints: [
          'POST   /api/auth/register         - Inscription',
          'POST   /api/auth/login            - Connexion',
          'GET    /api/auth/me               - Utilisateur connecté'
        ]
      },
      admin: {
        base: '/api/admin',
        status: 'À créer',
        role: 'ADMIN'
      },
      boutique: {
        base: '/api/boutique',
        status: 'À créer',
        role: 'BOUTIQUE'
      },
      client: {
        base: '/api/client',
        status: 'À créer',
        role: 'CLIENT'
      }
    }
  });
});

// ============================================
// MONTAGE DES ROUTES (commentés car pas encore créés)
// ============================================

// Décommenter au fur et à mesure que vous créez les fichiers
// router.use('/auth', authRoutes);
// router.use('/admin', adminRoutes);
// router.use('/boutique', boutiqueRoutes);
// router.use('/client', clientRoutes);

module.exports = router;