const mongoose = require('mongoose');

/**
 * Cache de connexion MongoDB pour environnement serverless (Vercel)
 * global.mongoose survit aux rechargements de modules entre les requêtes
 * ce qui évite de créer une nouvelle connexion à chaque cold start
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Options de connexion optimisées pour :
 * - Serverless (Vercel) : connexions courtes et réutilisées
 * - Atlas M0 gratuit : max 500 connexions simultanées
 */
const MONGO_OPTIONS = {
  maxPoolSize: 5,          // Max 5 connexions par instance (plan gratuit)
  minPoolSize: 1,          // Garde 1 connexion active en attente
  serverSelectionTimeoutMS: 10000,  // 10s pour trouver un serveur Atlas
  socketTimeoutMS: 45000,           // 45s avant de fermer un socket inactif
  connectTimeoutMS: 10000,          // 10s pour établir la connexion initiale
  heartbeatFrequencyMS: 30000,      // Ping Atlas toutes les 30s
  bufferCommands: true,             // File d'attente des requêtes pendant reconnexion
};

const connectDB = async () => {
  // Réutiliser la connexion existante si disponible (évite le pool overflow)
  if (cached.conn) {
    return cached.conn;
  }

  // Si une promesse de connexion est en cours, l'attendre plutôt qu'en créer une autre
  if (!cached.promise) {
    console.log('Establishing new MongoDB connection...');

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, MONGO_OPTIONS)
      .then((mongooseInstance) => {
        const { host, name, port } = mongooseInstance.connection;
        console.log('='.repeat(50));
        console.log('MongoDB Connected Successfully');
        console.log(`Host: ${host}`);
        console.log(`Database: ${name}`);
        console.log(`Port: ${port}`);
        console.log('='.repeat(50));
        return mongooseInstance;
      })
      .catch((error) => {
        // Reset du cache pour permettre un retry à la prochaine requête
        cached.promise = null;

        console.error('='.repeat(50));
        console.error('MongoDB Connection Error:');
        console.error(`Message: ${error.message}`);
        console.error('='.repeat(50));

        throw error; // Propage l'erreur (gérée dans app.js ou server.js)
      });
  }

  // Gestion des événements (une seule fois grâce au cache)
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err.message);
    // Reset pour forcer une reconnexion au prochain appel
    cached.conn = null;
    cached.promise = null;
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected — reset cache for reconnection');
    cached.conn = null;
    cached.promise = null;
  });

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;