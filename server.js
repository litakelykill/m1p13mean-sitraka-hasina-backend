const app = require('./src/app');
const connectDB = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Connexion à MongoDB (opération asynchrone - code non bloquant)
connectDB();

// Démarrer le serveur HTTP
const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`Server running in ${process.env.NODE_ENV} mode`);
    console.log(`Port: ${PORT}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('='.repeat(50));
});

// Gestion propre de l'arrêt du serveur
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});