const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware de parsing (intégré à Express)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware CORS - Configuration pour accepter plusieurs origines
const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:3000',
    'http://localhost:5000',
    process.env.CORS_ORIGIN
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Permettre les requêtes sans origin (Postman, curl, mobile apps)
        if (!origin) {
            return callback(null, true);
        }

        // Vérifier si l'origine est autorisée
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // En production, autoriser les domaines Vercel
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        // Sinon, refuser
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Middleware de logging personnalisé
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);

    // Ajout de propriété personnalisée
    req.requestTime = Date.now();

    next();
});

// Middleware pour servir les fichiers statiques (uploads)
app.use('/uploads', express.static('uploads'));

// ROUTE DE TEST (Health Check)
app.get('/', (req, res) => {
    const responseTime = Date.now() - req.requestTime;

    res.json({
        success: true,
        message: 'API Centre Commercial - Backend MEAN M1-P13',
        version: '1.0.0',
        authors: ['Sitraka', 'Hasina'],
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Route Health Check pour monitoring
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString()
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
app.use((err, req, res, next) => {
    console.error('='.repeat(50));
    console.error('ERROR:', err.message);
    console.error('Stack:', err.stack);
    console.error('='.repeat(50));

    // Gérer les erreurs CORS
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'Accès non autorisé (CORS)',
            error: 'CORS_ERROR'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erreur serveur',
        error: err.name || 'SERVER_ERROR',
        // Stack trace uniquement en développement
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;