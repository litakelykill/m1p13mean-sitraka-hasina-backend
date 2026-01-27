const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares globaux
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration CORS
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Route de test
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API Centre Commercial - Backend MEAN M1-P13',
        version: '1.0.0',
        authors: ['Sitraka', 'Hasina']
    });
});

// Routes API (à ajouter plus tard)
// app.use('/api/auth', require('./routes/auth.routes'));

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route non trouvée'
    });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

module.exports = app;