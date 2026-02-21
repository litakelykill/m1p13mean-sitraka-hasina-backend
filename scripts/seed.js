/**
 * Database Seed Script
 * 
 * Script pour initialiser la base de donnees avec :
 * - Un compte administrateur par defaut
 * - Les categories de produits
 * 
 * Usage : node scripts/seed.js
 *         node scripts/seed.js --reset (supprime tout avant)
 *         node scripts/seed.js --categories-only (categories seulement)
 * 
 * @module seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Categorie = require('../src/models/Categorie');

// ============================================
// CONFIGURATION ADMIN
// ============================================
const ADMIN_DATA = {
    email: process.env.ADMIN_EMAIL || 'admin@centrecommercial.com',
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
    nom: process.env.ADMIN_NOM || 'Systeme',
    prenom: process.env.ADMIN_PRENOM || 'Admin',
    role: 'ADMIN',
    isActive: true
};

// ============================================
// CONFIGURATION CATEGORIES
// ============================================
const CATEGORIES_DATA = [
    {
        nom: 'Electronique & Informatique',
        description: 'Materiel electromenager indispensable pour les fans des appareils intelligents et connectes',
        ordre: 1,
        isActive: true
    },
    {
        nom: 'Telephonie & Accessoires',
        description: 'Materiel electronique de poche et pratique',
        ordre: 2,
        isActive: true
    },
    {
        nom: 'Mode & Vetements',
        description: 'Affirmez votre style',
        ordre: 3,
        isActive: true
    },
    {
        nom: 'Beaute & Soins',
        description: 'Aimez prendre soin de vous, nos produits beaute et soins sont la pour vous',
        ordre: 4,
        isActive: true
    },
    {
        nom: 'Maison & Electromenager',
        description: 'Materiel pour toutes les maisons et equipements de qualite',
        ordre: 5,
        isActive: true
    },
    {
        nom: 'Alimentation & Boissons',
        description: 'Venez vous restaurer chez nous',
        ordre: 6,
        isActive: true
    },
    {
        nom: 'Bricolage & Jardin',
        description: 'Materiel de qualite pour tous vos projets',
        ordre: 7,
        isActive: true
    },
    {
        nom: 'Auto & Moto',
        description: 'Pieces et accessoires automobiles de qualite',
        ordre: 8,
        isActive: true
    },
    {
        nom: 'Loisirs & Divertissement',
        description: 'Petits et grands seront bien servis',
        ordre: 9,
        isActive: true
    },
    {
        nom: 'Sante & Bien-etre',
        description: 'Produits pour votre sante et votre bien-etre',
        ordre: 10,
        isActive: true
    },
    {
        nom: 'Fournitures professionnelles',
        description: 'Relevez tous les defis',
        ordre: 11,
        isActive: true
    }
];

// ============================================
// FONCTION : Creer l'administrateur
// ============================================
const seedAdmin = async () => {
    console.log('\n--- ADMINISTRATEUR ---\n');
    console.log('Verification de l\'existence de l\'admin...');

    const existingAdmin = await User.findOne({
        $or: [
            { email: ADMIN_DATA.email },
            { role: 'ADMIN' }
        ]
    });

    if (existingAdmin) {
        console.log('[EXISTE] Un administrateur existe deja :');
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Nom: ${existingAdmin.prenom} ${existingAdmin.nom}`);
        return { created: false, admin: existingAdmin };
    }

    const admin = await User.create(ADMIN_DATA);

    console.log('[CREE] Administrateur cree avec succes !');
    console.log('');
    console.log('   Informations de connexion :');
    console.log('   +---------------------------------------+');
    console.log(`   | Email    : ${ADMIN_DATA.email}`);
    console.log(`   | Password : ${ADMIN_DATA.password}`);
    console.log('   +---------------------------------------+');
    console.log('');
    console.log('   IMPORTANT : Changez ce mot de passe en production !');

    return { created: true, admin };
};

// ============================================
// FONCTION : Creer les categories
// ============================================
const seedCategories = async () => {
    console.log('\n--- CATEGORIES ---\n');
    console.log('Verification des categories existantes...');

    let created = 0;
    let skipped = 0;

    for (const catData of CATEGORIES_DATA) {
        // Verifier si la categorie existe deja (par nom)
        const existing = await Categorie.findOne({ nom: catData.nom });

        if (existing) {
            console.log(`[EXISTE] ${catData.nom}`);
            skipped++;
        } else {
            await Categorie.create(catData);
            console.log(`[CREE]   ${catData.nom}`);
            created++;
        }
    }

    console.log('');
    console.log(`Resume: ${created} creee(s), ${skipped} existante(s)`);

    return { created, skipped };
};

// ============================================
// FONCTION : Afficher les statistiques
// ============================================
const showStats = async () => {
    console.log('\n--- STATISTIQUES ---\n');

    const userStats = {
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

    const categorieStats = {
        total: await Categorie.countDocuments(),
        actives: await Categorie.countDocuments({ isActive: true }),
        inactives: await Categorie.countDocuments({ isActive: false })
    };

    console.log('Utilisateurs :');
    console.log(`   Total                : ${userStats.total}`);
    console.log(`   Administrateurs      : ${userStats.admins}`);
    console.log(`   Boutiques            : ${userStats.boutiques}`);
    console.log(`     - Validees         : ${userStats.boutiquesValidees}`);
    console.log(`     - En attente       : ${userStats.boutiquesEnAttente}`);
    console.log(`   Clients              : ${userStats.clients}`);
    console.log('');
    console.log('Categories :');
    console.log(`   Total                : ${categorieStats.total}`);
    console.log(`   Actives              : ${categorieStats.actives}`);
    console.log(`   Inactives            : ${categorieStats.inactives}`);
};

// ============================================
// FONCTION PRINCIPALE
// ============================================
const seedDatabase = async (options = {}) => {
    try {
        console.log('==========================================');
        console.log('      SEED DATABASE - CENTRE COMMERCIAL   ');
        console.log('==========================================');

        // Connexion MongoDB
        console.log('\nConnexion a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connecte a MongoDB');

        // Seed admin (sauf si categories-only)
        if (!options.categoriesOnly) {
            await seedAdmin();
        }

        // Seed categories
        await seedCategories();

        // Afficher les stats
        await showStats();

        // Fermer la connexion
        await mongoose.connection.close();
        console.log('\nConnexion MongoDB fermee.');

        console.log('\n==========================================');
        console.log('           SEED TERMINE AVEC SUCCES       ');
        console.log('==========================================\n');

        process.exit(0);

    } catch (error) {
        console.error('\nERREUR lors du seed :', error.message);

        if (error.code === 11000) {
            console.error('   -> Duplication detectee (email ou slug existe deja).');
        }

        if (error.name === 'ValidationError') {
            console.error('   -> Erreur de validation :');
            Object.values(error.errors).forEach(err => {
                console.error(`      - ${err.message}`);
            });
        }

        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        process.exit(1);
    }
};

// ============================================
// FONCTION : Reset complet
// ============================================
const resetDatabase = async () => {
    try {
        console.log('\n==========================================');
        console.log('      RESET DATABASE - ATTENTION !        ');
        console.log('==========================================\n');

        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Suppression des utilisateurs...');
        const usersResult = await User.deleteMany({});
        console.log(`   ${usersResult.deletedCount} utilisateur(s) supprime(s)`);

        console.log('Suppression des categories...');
        const categoriesResult = await Categorie.deleteMany({});
        console.log(`   ${categoriesResult.deletedCount} categorie(s) supprimee(s)`);

        await mongoose.connection.close();
        console.log('\nReset termine.');

    } catch (error) {
        console.error('Erreur lors du reset :', error.message);
        process.exit(1);
    }
};

// ============================================
// EXECUTION
// ============================================
const args = process.argv.slice(2);

if (args.includes('--reset')) {
    console.log('\nMode RESET active\n');
    resetDatabase().then(() => seedDatabase());
} else if (args.includes('--categories-only')) {
    console.log('\nMode CATEGORIES ONLY active\n');
    seedDatabase({ categoriesOnly: true });
} else {
    seedDatabase();
}