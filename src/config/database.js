const mongoose = require('mongoose');

/**
 * Connexion à MongoDB
 * Fonction asynchrone - ne bloque pas le serveur
 */
const connectDB = async () => {
  try {
    // Connexion avec await (non bloquant)
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log('='.repeat(50));
    console.log('MongoDB Connected Successfully');
    console.log(`Host: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Port: ${conn.connection.port}`);
    console.log('='.repeat(50));

    // Gestion des événements de connexion
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('='.repeat(50));
    console.error('MongoDB Connection Error:');
    console.error(`Message: ${error.message}`);
    console.error('='.repeat(50));
    
    // En production, on arrête le processus si la DB n'est pas accessible
    process.exit(1);
  }
};

module.exports = connectDB;