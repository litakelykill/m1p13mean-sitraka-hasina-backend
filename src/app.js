const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware de parsing (intégré à Express)
// Remplace les modules url et querystring du guide routing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware de logging personnalisé
// Concept du guide : modification de l'objet req
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);

    // Ajout de propriété personnalisée (concept du guide middleware)
    req.requestTime = Date.now();

    // IMPORTANT : appel de next() pour passer au middleware suivant
    next();
});

// 4. Middleware pour servir les fichiers statiques (uploads)
app.use('/uploads', express.static('uploads'));

// ROUTE DE TEST (Health Check)
app.get('/', (req, res) => {
    // Utilisation de la propriété ajoutée par le middleware
    const responseTime = Date.now() - req.requestTime;

    res.json({
        success: true,
        message: 'API Centre Commercial - Backend MEAN M1-P13',
        version: '1.0.0',
        authors: ['Sitraka', 'Hasina'],
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
    });
});

// Requete Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Importation et utilisation des routes définies dans ./routes/index.js
app.use('/api', require('./routes'));

// GESTION DES ERREURS
// Middleware 404 - Route non trouvée
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} non trouvée`,
        error: 'NOT_FOUND'
    });
});

// Middleware de gestion d'erreurs globales
// IMPORTANT : 4 paramètres (err, req, res, next)
app.use((err, req, res, next) => {
    console.error('='.repeat(50));
    console.error('ERROR:', err.message);
    console.error('Stack:', err.stack);
    console.error('='.repeat(50));

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erreur serveur',
        error: err.name || 'SERVER_ERROR',
        // Stack trace uniquement en développement
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;