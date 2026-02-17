/**
 * Script de migration - Calculer les notes de toutes les boutiques
 * 
 * Utilisation:
 * 1. En local: node scripts/migrate-notes.js
 * 2. Ou ajouter une route temporaire dans l'API
 * 
 * Ce script parcourt toutes les boutiques et recalcule leur note
 * moyenne basee sur les avis approuves.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connexion MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connecte');
    } catch (error) {
        console.error('Erreur connexion MongoDB:', error);
        process.exit(1);
    }
};

// Fonction principale
const migrateNotes = async () => {
    await connectDB();

    const User = require('../src/models/User');
    const Avis = require('../src/models/Avis');

    console.log('Debut de la migration des notes...');

    // Recuperer toutes les boutiques
    const boutiques = await User.find({ role: 'BOUTIQUE' }).select('_id boutique.nomBoutique');
    console.log(`${boutiques.length} boutiques trouvees`);

    let updated = 0;
    let errors = 0;

    for (const boutique of boutiques) {
        try {
            // Calculer la note moyenne
            const result = await Avis.aggregate([
                {
                    $match: {
                        boutique: boutique._id,
                        statut: 'approuve'
                    }
                },
                {
                    $group: {
                        _id: '$boutique',
                        noteMoyenne: { $avg: '$note' },
                        totalAvis: { $sum: 1 }
                    }
                }
            ]);

            let note = 0;
            let nombreAvis = 0;

            if (result.length > 0) {
                note = Math.round(result[0].noteMoyenne * 10) / 10;
                nombreAvis = result[0].totalAvis;
            }

            // Mettre a jour
            await User.findByIdAndUpdate(boutique._id, {
                'boutique.note': note,
                'boutique.nombreAvis': nombreAvis
            });

            console.log(`[OK] ${boutique.boutique?.nomBoutique || boutique._id}: note=${note}, avis=${nombreAvis}`);
            updated++;

        } catch (error) {
            console.error(`[ERREUR] ${boutique._id}:`, error.message);
            errors++;
        }
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('Migration terminee');
    console.log(`Boutiques mises a jour: ${updated}`);
    console.log(`Erreurs: ${errors}`);
    console.log('='.repeat(50));

    await mongoose.connection.close();
    console.log('Connexion MongoDB fermee');
    process.exit(0);
};

// Executer
migrateNotes().catch(error => {
    console.error('Erreur migration:', error);
    process.exit(1);
});