const app = require('./src/app');
const connectDB = require('./src/config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Pour Vercel (serverless) : ne pas démarrer le serveur HTTP
// Vercel définit automatiquement la variable VERCEL=1
// La connexion DB est gérée par le middleware dans app.js
if (process.env.VERCEL !== '1') {

    const startServer = async () => {
        try {
            // Attendre MongoDB AVANT d'accepter les requêtes
            // En local/production non-serverless, on pré-connecte au démarrage
            await connectDB();

            const server = app.listen(PORT, () => {
                console.log('='.repeat(50));
                console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
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

        } catch (err) {
            console.error('Failed to start server:', err.message);
            process.exit(1);
        }
    };

    startServer();
}

// Export pour Vercel (serverless functions)
module.exports = app;