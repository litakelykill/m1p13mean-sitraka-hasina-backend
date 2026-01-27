/**
 * Database Seed Script
 * 
 * Script pour initialiser la base de données avec :
 * - Un compte administrateur par défaut
 * 
 * Usage : npm run seed
 * 
 * @module seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

// ============================================
// CONFIGURATION
// ============================================
const ADMIN_DATA = {
    email: process.env.ADMIN_EMAIL || 'admin@centrecommercial.com',
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
    nom: process.env.ADMIN_NOM || 'Système',
    prenom: process.env.ADMIN_PRENOM || 'Admin',
    role: 'ADMIN',
    isActive: true
};

// ============================================
// FONCTION PRINCIPALE
// ============================================
const seedDatabase = async () => {
    try {
        console.log('==========================================');
        console.log('      SEED DATABASE - CENTRE COMMERCIAL   ');
        console.log('==========================================\n');

        // ========================================
        // 1. Connexion à MongoDB
        // ========================================
        console.log('Connexion à MongoDB...');

        await mongoose.connect(process.env.MONGODB_URI, {
            // Options de connexion
        });

        console.log('Connecté à MongoDB\n');

        // ========================================
        // 2. Vérifier si l'admin existe déjà
        // ========================================
        console.log('Vérification de l\'existence de l\'admin...');

        const existingAdmin = await User.findOne({
            $or: [
                { email: ADMIN_DATA.email },
                { role: 'ADMIN' }
            ]
        });

        if (existingAdmin) {
            console.log(' Un administrateur existe déjà :');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Nom: ${existingAdmin.prenom} ${existingAdmin.nom}`);
            console.log(`   Créé le: ${existingAdmin.createdAt}`);
            console.log('\n Aucune modification effectuée.\n');
        } else {
            // ========================================
            // 3. Créer l'administrateur
            // ========================================
            console.log('Création de l\'administrateur...');

            const admin = await User.create(ADMIN_DATA);

            console.log('Administrateur créé avec succès !\n');
            console.log('Informations de connexion :');
            console.log('   ┌───────────────────────────────────────┐');
            console.log(`   │ Email    : ${ADMIN_DATA.email}`);
            console.log(`   │ Password : ${ADMIN_DATA.password}`);
            console.log('   └───────────────────────────────────────┘\n');
            console.log(' IMPORTANT : Changez ce mot de passe en production !\n');
        }

        // ========================================
        // 4. Afficher les statistiques
        // ========================================
        console.log('📊 Statistiques de la base de données :');

        const stats = {
            total: await User.countDocuments(),
            admins: await User.countDocuments({ role: 'ADMIN' }),
            boutiques: await User.countDocuments({ role: 'BOUTIQUE' }),
            clients: await User.countDocuments({ role: 'CLIENT' }),
            boutiquesValidees: await User.countDocuments({
                role: 'BOUTIQUE',
                'boutique.isValidated': true
            }),
            boutiquesEnAttente: await User.countDocuments({
                role: 'BOUTIQUE',
                'boutique.isValidated': false
            })
        };

        console.log(`   Total utilisateurs    : ${stats.total}`);
        console.log(`   Administrateurs       : ${stats.admins}`);
        console.log(`   Boutiques             : ${stats.boutiques}`);
        console.log(`     - Validées          : ${stats.boutiquesValidees}`);
        console.log(`     - En attente        : ${stats.boutiquesEnAttente}`);
        console.log(`   Clients               : ${stats.clients}`);
        console.log('');

        // ========================================
        // 5. Fermer la connexion
        // ========================================
        await mongoose.connection.close();
        console.log('🔌 Connexion MongoDB fermée.');
        console.log('\n==========================================');
        console.log('           SEED TERMINÉ AVEC SUCCÈS       ');
        console.log('==========================================\n');

        process.exit(0);

    } catch (error) {
        console.error('\nERREUR lors du seed :', error.message);

        if (error.code === 11000) {
            console.error('   → Un utilisateur avec cet email existe déjà.');
        }

        if (error.name === 'ValidationError') {
            console.error('   → Erreur de validation :');
            Object.values(error.errors).forEach(err => {
                console.error(`      - ${err.message}`);
            });
        }

        // Fermer la connexion en cas d'erreur
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        process.exit(1);
    }
};

// ============================================
// FONCTION : Reset complet (optionnel)
// ============================================
const resetDatabase = async () => {
    try {
        console.log('ATTENTION : Suppression de tous les utilisateurs...');

        await mongoose.connect(process.env.MONGODB_URI);

        const result = await User.deleteMany({});
        console.log(`${result.deletedCount} utilisateur(s) supprimé(s).`);

        await mongoose.connection.close();

    } catch (error) {
        console.error('Erreur lors du reset :', error.message);
        process.exit(1);
    }
};

// ============================================
// EXÉCUTION
// ============================================

// Vérifier les arguments de ligne de commande
const args = process.argv.slice(2);

if (args.includes('--reset')) {
    console.log('\nMode RESET activé\n');
    resetDatabase().then(() => seedDatabase());
} else {
    seedDatabase();
}