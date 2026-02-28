/**
 * Database Seed Script
 * 
 * Script pour initialiser la base de donnees avec :
 * - Un compte administrateur par defaut
 * - Les categories de produits
 * - Deux boutiques par defaut avec produits
 * - Trois clients par defaut
 * - Paniers et commandes de simulation
 * 
 * Usage : node scripts/seedTertia.js
 *         node scripts/seedTertia.js --reset (supprime tout avant)
 *         node scripts/seedTertia.js --categories-only (categories seulement)
 *         node scripts/seedTertia.js --full-reset (vide completement la base)
 * 
 * @module seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Categorie = require('../src/models/Categorie');
const Produit = require('../src/models/Produit');
const Panier = require('../src/models/Panier');
const Commande = require('../src/models/Commande');
const Avis = require('../src/models/Avis');
const Notification = require('../src/models/Notification');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const SearchHistory = require('../src/models/SearchHistory');

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
// CONFIGURATION BOUTIQUES
// ============================================
const BOUTIQUES_DATA = [
    {
        email: 'boutique@test.com',
        password: 'Boutique123!',
        nom: 'Rakotomalala',
        prenom: 'Jean',
        telephone: '0341234567',
        role: 'BOUTIQUE',
        isActive: true,
        boutique: {
            nomBoutique: 'TechnoMada',
            description: 'Votre partenaire technologique a Madagascar. Nous proposons une large gamme de produits electroniques, informatiques et telephoniques de qualite. Livraison rapide dans tout Antananarivo.',
            categorie: 'Electronique & Informatique',
            adresse: {
                rue: '23 Avenue de l\'Independance',
                ville: 'Antananarivo',
                codePostal: '101',
                pays: 'Madagascar'
            },
            contact: {
                telephone: '0341234567',
                email: 'contact@technomada.mg',
                siteWeb: 'https://technomada.mg'
            },
            horaires: {
                lundi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
                mardi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
                mercredi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
                jeudi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
                vendredi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
                samedi: { ouverture: '09:00', fermeture: '13:00', ferme: false },
                dimanche: { ouverture: '', fermeture: '', ferme: true }
            },
            reseauxSociaux: {
                facebook: 'https://facebook.com/technomada',
                instagram: 'https://instagram.com/technomada',
                twitter: ''
            },
            // BOUTIQUE 1 : VALIDEE
            isValidated: true,
            validatedAt: new Date(),
            note: 0,
            nombreAvis: 0
        }
    },
    {
        email: 'boutique2@test.com',
        password: 'Boutique123!',
        nom: 'Rasoamanarivo',
        prenom: 'Marie',
        telephone: '0337654321',
        role: 'BOUTIQUE',
        isActive: true,
        boutique: {
            nomBoutique: 'MadaStyle',
            description: 'La mode malgache et internationale a portee de main. Vetements tendance, accessoires de beaute et produits de soins pour hommes et femmes. Qualite et elegance garanties.',
            categorie: 'Mode & Vetements',
            adresse: {
                rue: '45 Rue Rainitovo, Analakely',
                ville: 'Antananarivo',
                codePostal: '101',
                pays: 'Madagascar'
            },
            contact: {
                telephone: '0337654321',
                email: 'contact@madastyle.mg',
                siteWeb: 'https://madastyle.mg'
            },
            horaires: {
                lundi: { ouverture: '09:00', fermeture: '19:00', ferme: false },
                mardi: { ouverture: '09:00', fermeture: '19:00', ferme: false },
                mercredi: { ouverture: '09:00', fermeture: '19:00', ferme: false },
                jeudi: { ouverture: '09:00', fermeture: '19:00', ferme: false },
                vendredi: { ouverture: '09:00', fermeture: '19:00', ferme: false },
                samedi: { ouverture: '09:00', fermeture: '17:00', ferme: false },
                dimanche: { ouverture: '10:00', fermeture: '14:00', ferme: false }
            },
            reseauxSociaux: {
                facebook: 'https://facebook.com/madastyle',
                instagram: 'https://instagram.com/madastyle.mg',
                twitter: 'https://twitter.com/madastyle'
            },
            // BOUTIQUE 2 : EN ATTENTE DE VALIDATION
            isValidated: false,
            validatedAt: null,
            note: 0,
            nombreAvis: 0
        }
    }
];

// ============================================
// CONFIGURATION CLIENTS (3 clients)
// ============================================
const CLIENTS_DATA = [
    {
        email: 'client@test.com',
        password: 'Client123!',
        nom: 'Andriamampianina',
        prenom: 'Patrick',
        telephone: '0321234567',
        role: 'CLIENT',
        isActive: true,
        adresse: {
            rue: '12 Rue Rabearivelo',
            ville: 'Antananarivo',
            codePostal: '101',
            pays: 'Madagascar'
        }
    },
    {
        email: 'client2@test.com',
        password: 'Client123!',
        nom: 'Razafindrabe',
        prenom: 'Sophie',
        telephone: '0331122334',
        role: 'CLIENT',
        isActive: true,
        adresse: {
            rue: '78 Avenue de France',
            ville: 'Antananarivo',
            codePostal: '101',
            pays: 'Madagascar'
        }
    },
    {
        email: 'client3@test.com',
        password: 'Client123!',
        nom: 'Rabemananjara',
        prenom: 'Hery',
        telephone: '0345566778',
        role: 'CLIENT',
        isActive: true,
        adresse: {
            rue: '25 Lot IVG Ambohimanarina',
            ville: 'Antananarivo',
            codePostal: '102',
            pays: 'Madagascar'
        }
    }
];

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
// CONFIGURATION PRODUITS PAR BOUTIQUE
// ============================================
const getProduits = (boutique1Id, boutique2Id, categories) => {
    const getCategorieId = (nom) => {
        const cat = categories.find(c => c.nom === nom);
        return cat ? cat._id : null;
    };

    return [
        // ========== BOUTIQUE 1 : TechnoMada ==========
        {
            nom: 'Laptop HP ProBook 450 G8',
            description: 'Ordinateur portable professionnel HP ProBook 450 G8. Processeur Intel Core i5-1135G7, 8Go RAM, SSD 256Go, ecran 15.6 pouces Full HD.',
            prix: 2500000,
            prixPromo: 2299000,
            stock: 15,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: true
        },
        {
            nom: 'Souris sans fil Logitech M185',
            description: 'Souris sans fil compacte et fiable. Connexion USB plug-and-play, portee de 10 metres.',
            prix: 45000,
            stock: 50,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Clavier mecanique RGB Gaming',
            description: 'Clavier mecanique gaming avec retroeclairage RGB personnalisable.',
            prix: 185000,
            prixPromo: 159000,
            stock: 25,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: true
        },
        {
            nom: 'Ecran Samsung 24 pouces Full HD',
            description: 'Moniteur Samsung 24 pouces Full HD 1920x1080. Dalle IPS.',
            prix: 520000,
            stock: 12,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'iPhone 14 Pro Max 256Go',
            description: 'Apple iPhone 14 Pro Max avec 256Go de stockage. Puce A16 Bionic.',
            prix: 5200000,
            stock: 8,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Samsung Galaxy A54 5G',
            description: 'Smartphone Samsung Galaxy A54 5G. Ecran Super AMOLED 6.4 pouces.',
            prix: 1450000,
            prixPromo: 1350000,
            stock: 20,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: true
        },
        {
            nom: 'Ecouteurs Bluetooth JBL Tune 510BT',
            description: 'Casque sans fil JBL Tune 510BT. Son JBL Pure Bass.',
            prix: 125000,
            stock: 35,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Chargeur rapide USB-C 65W',
            description: 'Chargeur mural USB-C 65W avec technologie GaN.',
            prix: 89000,
            stock: 40,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Coque iPhone 14 Pro silicone',
            description: 'Coque de protection en silicone souple pour iPhone 14 Pro.',
            prix: 25000,
            stock: 100,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Disque dur externe 1To Seagate',
            description: 'Disque dur externe portable Seagate 1To. USB 3.0 haute vitesse.',
            prix: 195000,
            stock: 30,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Webcam Logitech C920 HD Pro',
            description: 'Webcam Full HD 1080p Logitech C920.',
            prix: 280000,
            stock: 18,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Routeur WiFi 6 TP-Link AX1500',
            description: 'Routeur WiFi 6 TP-Link AX1500. Vitesse jusqu\'a 1.5 Gbps.',
            prix: 175000,
            prixPromo: 149000,
            stock: 22,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: true
        },

        // ========== BOUTIQUE 2 : MadaStyle ==========
        {
            nom: 'Robe elegante en soie naturelle',
            description: 'Magnifique robe en soie sauvage malgache.',
            prix: 285000,
            stock: 15,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Chemise homme lin premium',
            description: 'Chemise homme en lin naturel de haute qualite.',
            prix: 125000,
            prixPromo: 99000,
            stock: 40,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true
        },
        {
            nom: 'Jean slim femme taille haute',
            description: 'Jean femme coupe slim taille haute. Denim stretch confortable.',
            prix: 89000,
            stock: 60,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Sac a main cuir veritable',
            description: 'Sac a main femme en cuir veritable.',
            prix: 320000,
            stock: 12,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Baskets sport unisexe',
            description: 'Baskets sport legeres et confortables.',
            prix: 145000,
            prixPromo: 119000,
            stock: 50,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true
        },
        {
            nom: 'Coffret parfum Chanel N5',
            description: 'Coffret cadeau Chanel N5.',
            prix: 450000,
            stock: 8,
            categorie: getCategorieId('Beaute & Soins'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Creme hydratante visage bio',
            description: 'Creme hydratante visage aux ingredients naturels.',
            prix: 68000,
            stock: 45,
            categorie: getCategorieId('Beaute & Soins'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Kit maquillage professionnel',
            description: 'Kit maquillage complet avec palette de fards.',
            prix: 185000,
            prixPromo: 159000,
            stock: 20,
            categorie: getCategorieId('Beaute & Soins'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true
        },
        {
            nom: 'Huile essentielle lavande 30ml',
            description: 'Huile essentielle de lavande vraie 100% pure.',
            prix: 35000,
            stock: 80,
            categorie: getCategorieId('Beaute & Soins'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Lampe de chevet design moderne',
            description: 'Lampe de chevet au design moderne et epure.',
            prix: 95000,
            stock: 25,
            categorie: getCategorieId('Maison & Electromenager'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Parure de lit coton egyptien',
            description: 'Parure de lit en coton egyptien 400 fils.',
            prix: 220000,
            prixPromo: 189000,
            stock: 18,
            categorie: getCategorieId('Maison & Electromenager'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true
        },
        {
            nom: 'Miroir mural decoratif',
            description: 'Miroir mural rond avec cadre en rotin naturel.',
            prix: 145000,
            stock: 10,
            categorie: getCategorieId('Maison & Electromenager'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Bougie parfumee artisanale',
            description: 'Bougie parfumee artisanale a la cire de soja.',
            prix: 42000,
            stock: 60,
            categorie: getCategorieId('Maison & Electromenager'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Montre homme classique cuir',
            description: 'Montre homme elegante avec bracelet en cuir veritable.',
            prix: 195000,
            stock: 15,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Lunettes de soleil polarisees',
            description: 'Lunettes de soleil unisexe avec verres polarises.',
            prix: 78000,
            prixPromo: 65000,
            stock: 35,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true
        }
    ];
};

// ============================================
// FONCTION : Generer un slug
// ============================================
const generateSlug = (nom) => {
    return nom
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

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

    return { created: true, admin };
};

// ============================================
// FONCTION : Creer les boutiques
// ============================================
const seedBoutiques = async (admin) => {
    console.log('\n--- BOUTIQUES ---\n');
    console.log('Creation des boutiques par defaut...');

    const boutiques = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < BOUTIQUES_DATA.length; i++) {
        const boutiqueData = JSON.parse(JSON.stringify(BOUTIQUES_DATA[i]));
        const existing = await User.findOne({ email: boutiqueData.email });

        if (existing) {
            console.log(`[EXISTE] ${boutiqueData.boutique.nomBoutique} (${boutiqueData.email})`);
            boutiques.push(existing);
            skipped++;
        } else {
            if (i === 0 && admin && boutiqueData.boutique.isValidated) {
                boutiqueData.boutique.validatedBy = admin._id;
            }

            const boutique = await User.create(boutiqueData);
            const status = boutiqueData.boutique.isValidated ? true : false;
            console.log(`[CREE]   ${boutiqueData.boutique.nomBoutique} (${boutiqueData.email}) - ${status}`);
            boutiques.push(boutique);
            created++;
        }
    }

    console.log('');
    console.log('   Informations de connexion boutiques :');
    console.log('   +--------------------------------------------------+');
    console.log(`   | Boutique 1 : boutique@test.com / Boutique123!    |`);
    console.log(`   |              TechnoMada - VALIDEE (true)         |`);
    console.log(`   | Boutique 2 : boutique2@test.com / Boutique123!   |`);
    console.log(`   |              MadaStyle - EN ATTENTE  (false)     |`);
    console.log('   +--------------------------------------------------+');
    console.log('');
    console.log(`Resume: ${created} creee(s), ${skipped} existante(s)`);

    return boutiques;
};

// ============================================
// FONCTION : Creer les clients
// ============================================
const seedClients = async () => {
    console.log('\n--- CLIENTS ---\n');
    console.log('Creation des clients par defaut...');

    const clients = [];
    let created = 0;
    let skipped = 0;

    for (const clientData of CLIENTS_DATA) {
        const existing = await User.findOne({ email: clientData.email });

        if (existing) {
            console.log(`[EXISTE] ${clientData.prenom} ${clientData.nom} (${clientData.email})`);
            clients.push(existing);
            skipped++;
        } else {
            const client = await User.create(clientData);
            console.log(`[CREE]   ${clientData.prenom} ${clientData.nom} (${clientData.email})`);
            clients.push(client);
            created++;
        }
    }

    console.log('');
    console.log('   Informations de connexion clients :');
    console.log('   +-----------------------------------------------+');
    console.log(`   | Client 1 : client@test.com / Client123!      |`);
    console.log(`   |            Patrick Andriamampianina          |`);
    console.log(`   | Client 2 : client2@test.com / Client123!     |`);
    console.log(`   |            Sophie Razafindrabe               |`);
    console.log(`   | Client 3 : client3@test.com / Client123!     |`);
    console.log(`   |            Hery Rabemananjara                |`);
    console.log('   +-----------------------------------------------+');
    console.log('');
    console.log(`Resume: ${created} cree(s), ${skipped} existant(s)`);

    return clients;
};

// ============================================
// FONCTION : Creer les categories
// ============================================
const seedCategories = async () => {
    console.log('\n--- CATEGORIES ---\n');
    console.log('Verification des categories existantes...');

    let created = 0;
    let skipped = 0;
    const categories = [];

    for (const catData of CATEGORIES_DATA) {
        let existing = await Categorie.findOne({ nom: catData.nom });

        if (existing) {
            console.log(`[EXISTE] ${catData.nom}`);
            categories.push(existing);
            skipped++;
        } else {
            const cat = await Categorie.create(catData);
            console.log(`[CREE]   ${catData.nom}`);
            categories.push(cat);
            created++;
        }
    }

    console.log('');
    console.log(`Resume: ${created} creee(s), ${skipped} existante(s)`);

    return categories;
};

// ============================================
// FONCTION : Creer les produits
// ============================================
const seedProduits = async (boutiques, categories) => {
    console.log('\n--- PRODUITS ---\n');
    console.log('Creation des produits par defaut...');

    if (boutiques.length < 2) {
        console.log('[ERREUR] Il faut au moins 2 boutiques pour creer les produits');
        return { created: 0, skipped: 0, produits: [] };
    }

    const produitsData = getProduits(boutiques[0]._id, boutiques[1]._id, categories);
    const produits = [];

    let created = 0;
    let skipped = 0;

    for (const produitData of produitsData) {
        const slug = generateSlug(produitData.nom);
        const existing = await Produit.findOne({ slug });

        if (existing) {
            console.log(`[EXISTE] ${produitData.nom}`);
            produits.push(existing);
            skipped++;
        } else {
            const produit = await Produit.create({
                ...produitData,
                slug
            });
            console.log(`[CREE]   ${produitData.nom}`);
            produits.push(produit);
            created++;
        }
    }

    console.log('');
    console.log(`Resume: ${created} cree(s), ${skipped} existant(s)`);

    return { created, skipped, produits };
};

// ============================================
// FONCTION : Creer les paniers et commandes
// ============================================
const seedPaniersEtCommandes = async (clients, boutiques, produits) => {
    console.log('\n--- PANIERS & COMMANDES ---\n');
    console.log('Creation des paniers et commandes de simulation...');

    if (clients.length < 3 || produits.length === 0) {
        console.log('[ERREUR] Il faut 3 clients et des produits pour creer les paniers/commandes');
        return;
    }

    // Filtrer les produits par boutique (seulement boutique 1 validee)
    const produitsBoutique1 = produits.filter(p => p.boutique.toString() === boutiques[0]._id.toString());

    if (produitsBoutique1.length < 12) {
        console.log('[ERREUR] Pas assez de produits dans la boutique 1');
        return;
    }

    // ========== CLIENT 1 : Panier seulement (pas de commande) ==========
    console.log('\n[CLIENT 1] Patrick - Panier uniquement');

    const existingPanier1 = await Panier.findOne({ client: clients[0]._id });
    if (!existingPanier1) {
        const panierItems1 = [
            {
                produit: produitsBoutique1[0]._id,
                quantite: 1,
                prixUnitaire: produitsBoutique1[0].enPromo ? produitsBoutique1[0].prixPromo : produitsBoutique1[0].prix
            },
            {
                produit: produitsBoutique1[1]._id,
                quantite: 2,
                prixUnitaire: produitsBoutique1[1].prix
            },
            {
                produit: produitsBoutique1[6]._id,
                quantite: 1,
                prixUnitaire: produitsBoutique1[6].prix
            }
        ];

        await Panier.create({
            client: clients[0]._id,
            items: panierItems1
        });
        console.log('   [CREE] Panier avec 3 articles (Laptop, Souris x2, Ecouteurs)');
    } else {
        console.log('   [EXISTE] Panier deja existant');
    }

    // ========== CLIENT 2 : Commande livree et payee ==========
    console.log('\n[CLIENT 2] Sophie - Commande livree + payee');

    const existingCommande2 = await Commande.findOne({ client: clients[1]._id });
    if (!existingCommande2) {
        // Generer numero manuellement si la methode n'existe pas
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const random1 = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        const numero2 = `CMD-${dateStr}-${random1}`;

        // Items de la commande (structure correcte)
        const itemsCommande2 = [
            {
                produit: produitsBoutique1[4]._id,
                boutique: boutiques[0]._id,
                nom: produitsBoutique1[4].nom,
                slug: generateSlug(produitsBoutique1[4].nom),
                prix: produitsBoutique1[4].prix,
                quantite: 1,
                sousTotal: produitsBoutique1[4].prix
            },
            {
                produit: produitsBoutique1[8]._id,
                boutique: boutiques[0]._id,
                nom: produitsBoutique1[8].nom,
                slug: generateSlug(produitsBoutique1[8].nom),
                prix: produitsBoutique1[8].prix,
                quantite: 2,
                sousTotal: produitsBoutique1[8].prix * 2
            }
        ];

        const totalCommande2 = itemsCommande2.reduce((sum, item) => sum + item.sousTotal, 0);

        await Commande.create({
            numero: numero2,
            client: clients[1]._id,
            adresseLivraison: {
                nom: 'Razafindrabe',
                prenom: 'Sophie',
                telephone: '0331122334',
                rue: '78 Avenue de France',
                ville: 'Antananarivo',
                codePostal: '101',
                pays: 'Madagascar'
            },
            items: itemsCommande2,
            sousTotal: totalCommande2,
            total: totalCommande2,
            modePaiement: 'en_ligne',
            paiementStatut: 'paye',
            paiementDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            statut: 'livree',
            historiqueStatuts: [
                { statut: 'en_attente', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                { statut: 'confirmee', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
                { statut: 'en_preparation', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
                { statut: 'expediee', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
                { statut: 'en_livraison', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
                { statut: 'livree', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
            ],
            parBoutique: [{
                boutique: boutiques[0]._id,
                nomBoutique: 'TechnoMada',
                items: itemsCommande2,
                sousTotal: totalCommande2,
                total: totalCommande2,
                statut: 'livree',
                historiqueStatuts: [
                    { statut: 'en_attente', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    { statut: 'livree', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
                ]
            }]
        });
        console.log(`   [CREE] Commande livree: iPhone + 2 Coques = ${totalCommande2.toLocaleString()} Ar`);
    } else {
        console.log('   [EXISTE] Commande deja existante');
    }

    // ========== CLIENT 3 : Commande en cours de livraison ==========
    console.log('\n[CLIENT 3] Hery - Commande en cours de livraison');

    const existingCommande3 = await Commande.findOne({ client: clients[2]._id });
    if (!existingCommande3) {
        const random3 = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        const today3 = new Date();
        const dateStr3 = today3.toISOString().slice(0, 10).replace(/-/g, '');
        const numero3 = `CMD-${dateStr3}-${random3}`;

        const prix5 = produitsBoutique1[5].enPromo ? produitsBoutique1[5].prixPromo : produitsBoutique1[5].prix;
        const prix2 = produitsBoutique1[2].enPromo ? produitsBoutique1[2].prixPromo : produitsBoutique1[2].prix;

        const itemsCommande3 = [
            {
                produit: produitsBoutique1[5]._id,
                boutique: boutiques[0]._id,
                nom: produitsBoutique1[5].nom,
                slug: generateSlug(produitsBoutique1[5].nom),
                prix: produitsBoutique1[5].prix,
                prixPromo: produitsBoutique1[5].prixPromo,
                quantite: 1,
                sousTotal: prix5
            },
            {
                produit: produitsBoutique1[7]._id,
                boutique: boutiques[0]._id,
                nom: produitsBoutique1[7].nom,
                slug: generateSlug(produitsBoutique1[7].nom),
                prix: produitsBoutique1[7].prix,
                quantite: 1,
                sousTotal: produitsBoutique1[7].prix
            },
            {
                produit: produitsBoutique1[2]._id,
                boutique: boutiques[0]._id,
                nom: produitsBoutique1[2].nom,
                slug: generateSlug(produitsBoutique1[2].nom),
                prix: produitsBoutique1[2].prix,
                prixPromo: produitsBoutique1[2].prixPromo,
                quantite: 1,
                sousTotal: prix2
            }
        ];

        const totalCommande3 = itemsCommande3.reduce((sum, item) => sum + item.sousTotal, 0);

        await Commande.create({
            numero: numero3,
            client: clients[2]._id,
            adresseLivraison: {
                nom: 'Rabemananjara',
                prenom: 'Hery',
                telephone: '0345566778',
                rue: '25 Lot IVG Ambohimanarina',
                ville: 'Antananarivo',
                codePostal: '102',
                pays: 'Madagascar'
            },
            items: itemsCommande3,
            sousTotal: totalCommande3,
            total: totalCommande3,
            modePaiement: 'livraison',
            paiementStatut: 'en_attente',
            statut: 'en_livraison',
            historiqueStatuts: [
                { statut: 'en_attente', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
                { statut: 'confirmee', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
                { statut: 'en_preparation', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
                { statut: 'expediee', date: new Date(Date.now() - 12 * 60 * 60 * 1000) },
                { statut: 'en_livraison', date: new Date(Date.now() - 2 * 60 * 60 * 1000) }
            ],
            parBoutique: [{
                boutique: boutiques[0]._id,
                nomBoutique: 'TechnoMada',
                items: itemsCommande3,
                sousTotal: totalCommande3,
                total: totalCommande3,
                statut: 'en_livraison',
                historiqueStatuts: [
                    { statut: 'en_attente', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
                    { statut: 'en_livraison', date: new Date(Date.now() - 2 * 60 * 60 * 1000) }
                ]
            }]
        });
        console.log(`   [CREE] Commande en livraison: Galaxy A54 + Chargeur + Clavier = ${totalCommande3.toLocaleString()} Ar`);
    } else {
        console.log('   [EXISTE] Commande deja existante');
    }

    // ========== 2eme commande pour Client 2 (en attente) ==========
    console.log('\n[CLIENT 2] Sophie - 2eme commande en attente');

    const existingCommande2b = await Commande.countDocuments({ client: clients[1]._id });
    if (existingCommande2b < 2) {
        const random2b = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        const today2b = new Date();
        const dateStr2b = today2b.toISOString().slice(0, 10).replace(/-/g, '');
        const numero2b = `CMD-${dateStr2b}-${random2b}`;

        const itemsCommande2b = [
            {
                produit: produitsBoutique1[3]._id,
                boutique: boutiques[0]._id,
                nom: produitsBoutique1[3].nom,
                slug: generateSlug(produitsBoutique1[3].nom),
                prix: produitsBoutique1[3].prix,
                quantite: 1,
                sousTotal: produitsBoutique1[3].prix
            },
            {
                produit: produitsBoutique1[10]._id,
                boutique: boutiques[0]._id,
                nom: produitsBoutique1[10].nom,
                slug: generateSlug(produitsBoutique1[10].nom),
                prix: produitsBoutique1[10].prix,
                quantite: 1,
                sousTotal: produitsBoutique1[10].prix
            }
        ];

        const totalCommande2b = itemsCommande2b.reduce((sum, item) => sum + item.sousTotal, 0);

        await Commande.create({
            numero: numero2b,
            client: clients[1]._id,
            adresseLivraison: {
                nom: 'Razafindrabe',
                prenom: 'Sophie',
                telephone: '0331122334',
                rue: '78 Avenue de France',
                ville: 'Antananarivo',
                codePostal: '101',
                pays: 'Madagascar'
            },
            items: itemsCommande2b,
            sousTotal: totalCommande2b,
            total: totalCommande2b,
            modePaiement: 'en_ligne',
            paiementStatut: 'en_attente',
            statut: 'en_attente',
            historiqueStatuts: [
                { statut: 'en_attente', date: new Date() }
            ],
            parBoutique: [{
                boutique: boutiques[0]._id,
                nomBoutique: 'TechnoMada',
                items: itemsCommande2b,
                sousTotal: totalCommande2b,
                total: totalCommande2b,
                statut: 'en_attente',
                historiqueStatuts: [
                    { statut: 'en_attente', date: new Date() }
                ]
            }]
        });
        console.log(`   [CREE] Commande en attente: Ecran + Webcam = ${totalCommande2b.toLocaleString()} Ar`);
    } else {
        console.log('   [EXISTE] 2eme commande deja existante');
    }

    console.log('');
    console.log('Resume paniers/commandes:');
    console.log('   Client 1 (Patrick)  : 1 panier actif (pas de commande)');
    console.log('   Client 2 (Sophie)   : 2 commandes (1 livree/payee, 1 en attente)');
    console.log('   Client 3 (Hery)     : 1 commande en cours de livraison');
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
        boutiquesValidees: await User.countDocuments({ role: 'BOUTIQUE', 'boutique.isValidated': true }),
        boutiquesEnAttente: await User.countDocuments({ role: 'BOUTIQUE', 'boutique.isValidated': false })
    };

    const categorieStats = {
        total: await Categorie.countDocuments(),
        actives: await Categorie.countDocuments({ isActive: true }),
        inactives: await Categorie.countDocuments({ isActive: false })
    };

    const produitStats = {
        total: await Produit.countDocuments(),
        actifs: await Produit.countDocuments({ isActive: true }),
        enPromo: await Produit.countDocuments({ enPromo: true })
    };

    const panierStats = {
        total: await Panier.countDocuments(),
        avecItems: await Panier.countDocuments({ 'items.0': { $exists: true } })
    };

    const commandeStats = {
        total: await Commande.countDocuments(),
        enAttente: await Commande.countDocuments({ statut: 'en_attente' }),
        enLivraison: await Commande.countDocuments({ statut: 'en_livraison' }),
        livrees: await Commande.countDocuments({ statut: 'livree' })
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
    console.log('');
    console.log('Produits :');
    console.log(`   Total                : ${produitStats.total}`);
    console.log(`   Actifs               : ${produitStats.actifs}`);
    console.log(`   En promotion         : ${produitStats.enPromo}`);
    console.log('');
    console.log('Paniers :');
    console.log(`   Total                : ${panierStats.total}`);
    console.log(`   Avec articles        : ${panierStats.avecItems}`);
    console.log('');
    console.log('Commandes :');
    console.log(`   Total                : ${commandeStats.total}`);
    console.log(`   En attente           : ${commandeStats.enAttente}`);
    console.log(`   En livraison         : ${commandeStats.enLivraison}`);
    console.log(`   Livrees              : ${commandeStats.livrees}`);
};

// ============================================
// FONCTION PRINCIPALE
// ============================================
const seedDatabase = async (options = {}) => {
    try {
        console.log('==========================================');
        console.log('      SEED DATABASE - CENTRE COMMERCIAL   ');
        console.log('==========================================');

        console.log('\nConnexion a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connecte a MongoDB');

        let admin = null;
        let boutiques = [];
        let clients = [];
        let produits = [];

        if (!options.categoriesOnly) {
            const adminResult = await seedAdmin();
            admin = adminResult.admin;
        }

        const categories = await seedCategories();

        if (!options.categoriesOnly) {
            boutiques = await seedBoutiques(admin);
            clients = await seedClients();
            const produitsResult = await seedProduits(boutiques, categories);
            produits = produitsResult.produits;
            await seedPaniersEtCommandes(clients, boutiques, produits);
        }

        await showStats();
        await mongoose.connection.close();
        console.log('\nConnexion MongoDB fermee.');

        console.log('\n==========================================');
        console.log('           SEED TERMINE AVEC SUCCES       ');
        console.log('==========================================\n');

        process.exit(0);

    } catch (error) {
        console.error('\nERREUR lors du seed :', error.message);

        if (error.code === 11000) {
            console.error('   -> Duplication detectee.');
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
// FONCTION : Reset
// ============================================
const resetDatabase = async () => {
    try {
        console.log('\n==========================================');
        console.log('      RESET DATABASE - ATTENTION !        ');
        console.log('==========================================\n');

        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Suppression des commandes...');
        await Commande.deleteMany({});
        console.log('Suppression des paniers...');
        await Panier.deleteMany({});
        console.log('Suppression des produits...');
        await Produit.deleteMany({});
        console.log('Suppression des utilisateurs...');
        await User.deleteMany({});
        console.log('Suppression des categories...');
        await Categorie.deleteMany({});

        await mongoose.connection.close();
        console.log('\nReset termine.');

    } catch (error) {
        console.error('Erreur lors du reset :', error.message);
        process.exit(1);
    }
};

// ============================================
// FONCTION : Full Reset
// ============================================
const fullResetDatabase = async () => {
    try {
        console.log('\n==========================================');
        console.log('   FULL RESET DATABASE - TOUT SUPPRIMER   ');
        console.log('==========================================\n');

        await mongoose.connect(process.env.MONGODB_URI);

        await Message.deleteMany({});
        await Conversation.deleteMany({});
        await Notification.deleteMany({});
        await Avis.deleteMany({});
        await Commande.deleteMany({});
        await Panier.deleteMany({});
        await Produit.deleteMany({});
        await Categorie.deleteMany({});
        await SearchHistory.deleteMany({});
        await User.deleteMany({});

        await mongoose.connection.close();
        console.log('\nBase de donnees videe.');

    } catch (error) {
        console.error('Erreur lors du full reset :', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

// ============================================
// EXECUTION
// ============================================
const args = process.argv.slice(2);

if (args.includes('--full-reset')) {
    fullResetDatabase().then(() => {
        if (!args.includes('--no-seed')) {
            seedDatabase();
        } else {
            process.exit(0);
        }
    });
} else if (args.includes('--reset')) {
    resetDatabase().then(() => seedDatabase());
} else if (args.includes('--categories-only')) {
    seedDatabase({ categoriesOnly: true });
} else {
    seedDatabase();
}