/**
 * Database Seed Script
 * 
 * Script pour initialiser la base de donnees avec :
 * - Un compte administrateur par defaut
 * - Les categories de produits
 * - Deux boutiques par defaut avec produits
 * - Un client par defaut
 * 
 * Usage : node scripts/seed.js
 *         node scripts/seed.js --reset (supprime tout avant)
 *         node scripts/seed.js --categories-only (categories seulement)
 *         node scripts/seed.js --full-reset (vide completement la base)
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
            isValidated: true,
            validatedAt: new Date(),
            note: 4.5,
            nombreAvis: 12
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
            isValidated: true,
            validatedAt: new Date(),
            note: 4.8,
            nombreAvis: 25
        }
    }
];

// ============================================
// CONFIGURATION CLIENT
// ============================================
const CLIENT_DATA = {
    email: 'client@test.com',
    password: 'Client123!',
    nom: 'Andriamampianina',
    prenom: 'Patrick',
    telephone: '0321234567',
    role: 'CLIENT',
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
// CONFIGURATION PRODUITS PAR BOUTIQUE
// ============================================
const getProduits = (boutique1Id, boutique2Id, categories) => {
    const getCategorieId = (nom) => {
        const cat = categories.find(c => c.nom === nom);
        return cat ? cat._id : null;
    };

    return [
        // ========== BOUTIQUE 1 : TechnoMada (Electronique, Telephonie, Informatique) ==========
        {
            nom: 'Laptop HP ProBook 450 G8',
            description: 'Ordinateur portable professionnel HP ProBook 450 G8. Processeur Intel Core i5-1135G7, 8Go RAM, SSD 256Go, ecran 15.6 pouces Full HD. Ideal pour le travail et les etudes.',
            prix: 2500000,
            prixPromo: 2299000,
            stock: 15,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        {
            nom: 'Souris sans fil Logitech M185',
            description: 'Souris sans fil compacte et fiable. Connexion USB plug-and-play, portee de 10 metres. Autonomie jusqu\'a 12 mois. Compatible Windows, Mac et Chrome OS.',
            prix: 45000,
            stock: 50,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Clavier mecanique RGB Gaming',
            description: 'Clavier mecanique gaming avec retroeclairage RGB personnalisable. Switches Blue, anti-ghosting, repose-poignet magnetique inclus. Parfait pour les gamers exigeants.',
            prix: 185000,
            prixPromo: 159000,
            stock: 25,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        },
        {
            nom: 'Ecran Samsung 24 pouces Full HD',
            description: 'Moniteur Samsung 24 pouces Full HD 1920x1080. Dalle IPS, temps de reponse 5ms, ports HDMI et VGA. Design elegant avec bordures fines.',
            prix: 520000,
            stock: 12,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'iPhone 14 Pro Max 256Go',
            description: 'Apple iPhone 14 Pro Max avec 256Go de stockage. Puce A16 Bionic, ecran Super Retina XDR 6.7 pouces, camera 48MP. Couleur Violet Intense.',
            prix: 5200000,
            stock: 8,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Samsung Galaxy A54 5G',
            description: 'Smartphone Samsung Galaxy A54 5G. Ecran Super AMOLED 6.4 pouces, 128Go stockage, 8Go RAM. Triple camera 50MP. Batterie 5000mAh avec charge rapide.',
            prix: 1450000,
            prixPromo: 1350000,
            stock: 20,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
        },
        {
            nom: 'Ecouteurs Bluetooth JBL Tune 510BT',
            description: 'Casque sans fil JBL Tune 510BT. Son JBL Pure Bass, autonomie 40 heures, connexion Bluetooth 5.0. Pliable et leger pour un transport facile.',
            prix: 125000,
            stock: 35,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Chargeur rapide USB-C 65W',
            description: 'Chargeur mural USB-C 65W avec technologie GaN. Compatible avec laptops, tablettes et smartphones. Compact et portable, ideal pour les voyages.',
            prix: 89000,
            stock: 40,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Coque iPhone 14 Pro silicone',
            description: 'Coque de protection en silicone souple pour iPhone 14 Pro. Toucher doux, protection contre les chocs et rayures. Plusieurs coloris disponibles.',
            prix: 25000,
            stock: 100,
            categorie: getCategorieId('Telephonie & Accessoires'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Disque dur externe 1To Seagate',
            description: 'Disque dur externe portable Seagate 1To. USB 3.0 haute vitesse, compatible Windows et Mac. Design compact et resistant pour transporter vos donnees partout.',
            prix: 195000,
            stock: 30,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Webcam Logitech C920 HD Pro',
            description: 'Webcam Full HD 1080p Logitech C920. Mise au point automatique, correction d\'eclairage HD, deux microphones stereo integres. Parfait pour le teletravail.',
            prix: 280000,
            stock: 18,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Routeur WiFi 6 TP-Link AX1500',
            description: 'Routeur WiFi 6 TP-Link AX1500. Vitesse jusqu\'a 1.5 Gbps, couverture etendue, technologie OFDMA. Configuration facile via application mobile.',
            prix: 175000,
            prixPromo: 149000,
            stock: 22,
            categorie: getCategorieId('Electronique & Informatique'),
            boutique: boutique1Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
        },

        // ========== BOUTIQUE 2 : MadaStyle (Mode, Beaute, Maison) ==========
        {
            nom: 'Robe elegante en soie naturelle',
            description: 'Magnifique robe en soie sauvage malgache. Coupe fluide et elegante, parfaite pour les occasions speciales. Tailles S a XL disponibles. Couleur bordeaux.',
            prix: 285000,
            stock: 15,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Chemise homme lin premium',
            description: 'Chemise homme en lin naturel de haute qualite. Coupe slim fit, col italien. Ideale pour un look decontracte chic. Disponible en blanc, bleu ciel et beige.',
            prix: 125000,
            prixPromo: 99000,
            stock: 40,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        },
        {
            nom: 'Jean slim femme taille haute',
            description: 'Jean femme coupe slim taille haute. Denim stretch confortable, finition soignee. Parfait pour un look moderne et tendance. Tailles 34 a 44.',
            prix: 89000,
            stock: 60,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Sac a main cuir veritable',
            description: 'Sac a main femme en cuir veritable. Design intemporel, compartiments multiples, bandouliere ajustable. Artisanat malgache de qualite.',
            prix: 320000,
            stock: 12,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Baskets sport unisexe',
            description: 'Baskets sport legeres et confortables. Semelle amortissante, mesh respirant. Parfaites pour le sport ou un usage quotidien. Pointures 36 a 45.',
            prix: 145000,
            prixPromo: 119000,
            stock: 50,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        {
            nom: 'Coffret parfum Chanel N5',
            description: 'Coffret cadeau Chanel N5 comprenant eau de parfum 50ml et lait pour le corps 100ml. Le parfum iconique dans un ecrin luxueux.',
            prix: 450000,
            stock: 8,
            categorie: getCategorieId('Beaute & Soins'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Creme hydratante visage bio',
            description: 'Creme hydratante visage aux ingredients naturels et biologiques. Enrichie en aloe vera et huile d\'argan. Convient a tous types de peau.',
            prix: 68000,
            stock: 45,
            categorie: getCategorieId('Beaute & Soins'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Kit maquillage professionnel',
            description: 'Kit maquillage complet avec palette de fards, mascara, rouge a levres et pinceaux. Couleurs tendance, longue tenue. Trousse de rangement incluse.',
            prix: 185000,
            prixPromo: 159000,
            stock: 20,
            categorie: getCategorieId('Beaute & Soins'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        },
        {
            nom: 'Huile essentielle lavande 30ml',
            description: 'Huile essentielle de lavande vraie 100% pure et naturelle. Proprietes relaxantes et apaisantes. Utilisable en aromatherapie ou soins de la peau.',
            prix: 35000,
            stock: 80,
            categorie: getCategorieId('Beaute & Soins'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Lampe de chevet design moderne',
            description: 'Lampe de chevet au design moderne et epure. Abat-jour en tissu, base en metal brosse. Eclairage doux et chaleureux pour votre chambre.',
            prix: 95000,
            stock: 25,
            categorie: getCategorieId('Maison & Electromenager'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Parure de lit coton egyptien',
            description: 'Parure de lit en coton egyptien 400 fils. Comprend housse de couette et deux taies d\'oreiller. Douceur et elegance pour vos nuits.',
            prix: 220000,
            prixPromo: 189000,
            stock: 18,
            categorie: getCategorieId('Maison & Electromenager'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
        },
        {
            nom: 'Miroir mural decoratif',
            description: 'Miroir mural rond avec cadre en rotin naturel. Diametre 60cm. Apporte une touche boheme et naturelle a votre decoration interieure.',
            prix: 145000,
            stock: 10,
            categorie: getCategorieId('Maison & Electromenager'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Bougie parfumee artisanale',
            description: 'Bougie parfumee artisanale a la cire de soja. Parfum vanille et bois de santal. Duree de combustion 45 heures. Fabrication malgache.',
            prix: 42000,
            stock: 60,
            categorie: getCategorieId('Maison & Electromenager'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Montre homme classique cuir',
            description: 'Montre homme elegante avec bracelet en cuir veritable. Cadran minimaliste, mouvement quartz japonais. Etanche 30 metres.',
            prix: 195000,
            stock: 15,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: false
        },
        {
            nom: 'Lunettes de soleil polarisees',
            description: 'Lunettes de soleil unisexe avec verres polarises. Protection UV400. Monture legere et resistante. Style aviateur intemporel.',
            prix: 78000,
            prixPromo: 65000,
            stock: 35,
            categorie: getCategorieId('Mode & Vetements'),
            boutique: boutique2Id,
            isActive: true,
            enPromo: true,
            dateDebutPromo: new Date(),
            dateFinPromo: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
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
    console.log('');
    console.log('   IMPORTANT : Changez ce mot de passe en production !');

    return { created: true, admin };
};

// ============================================
// FONCTION : Creer les boutiques
// ============================================
const seedBoutiques = async () => {
    console.log('\n--- BOUTIQUES ---\n');
    console.log('Creation des boutiques par defaut...');

    const boutiques = [];
    let created = 0;
    let skipped = 0;

    for (const boutiqueData of BOUTIQUES_DATA) {
        const existing = await User.findOne({ email: boutiqueData.email });

        if (existing) {
            console.log(`[EXISTE] ${boutiqueData.boutique.nomBoutique} (${boutiqueData.email})`);
            boutiques.push(existing);
            skipped++;
        } else {
            const boutique = await User.create(boutiqueData);
            console.log(`[CREE]   ${boutiqueData.boutique.nomBoutique} (${boutiqueData.email})`);
            boutiques.push(boutique);
            created++;
        }
    }

    console.log('');
    console.log('   Informations de connexion boutiques :');
    console.log('   +-----------------------------------------------+');
    console.log(`   | Boutique 1 : boutique@test.com / Boutique123! |`);
    console.log(`   | Boutique 2 : boutique2@test.com / Boutique123!|`);
    console.log('   +-----------------------------------------------+');
    console.log('');
    console.log(`Resume: ${created} creee(s), ${skipped} existante(s)`);

    return boutiques;
};

// ============================================
// FONCTION : Creer le client
// ============================================
const seedClient = async () => {
    console.log('\n--- CLIENT ---\n');
    console.log('Creation du client par defaut...');

    const existing = await User.findOne({ email: CLIENT_DATA.email });

    if (existing) {
        console.log(`[EXISTE] ${CLIENT_DATA.prenom} ${CLIENT_DATA.nom} (${CLIENT_DATA.email})`);
        return { created: false, client: existing };
    }

    const client = await User.create(CLIENT_DATA);

    console.log(`[CREE]   ${CLIENT_DATA.prenom} ${CLIENT_DATA.nom} (${CLIENT_DATA.email})`);
    console.log('');
    console.log('   Informations de connexion client :');
    console.log('   +---------------------------------------+');
    console.log(`   | Email    : ${CLIENT_DATA.email}`);
    console.log(`   | Password : ${CLIENT_DATA.password}`);
    console.log('   +---------------------------------------+');

    return { created: true, client };
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
        return { created: 0, skipped: 0 };
    }

    const produitsData = getProduits(boutiques[0]._id, boutiques[1]._id, categories);

    let created = 0;
    let skipped = 0;

    for (const produitData of produitsData) {
        const slug = generateSlug(produitData.nom);
        const existing = await Produit.findOne({ slug });

        if (existing) {
            console.log(`[EXISTE] ${produitData.nom}`);
            skipped++;
        } else {
            await Produit.create({
                ...produitData,
                slug
            });
            console.log(`[CREE]   ${produitData.nom}`);
            created++;
        }
    }

    console.log('');
    console.log(`Resume: ${created} cree(s), ${skipped} existant(s)`);

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

    const produitStats = {
        total: await Produit.countDocuments(),
        actifs: await Produit.countDocuments({ isActive: true }),
        enPromo: await Produit.countDocuments({ enPromo: true })
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
    console.log('');
    console.log('Produits :');
    console.log(`   Total                : ${produitStats.total}`);
    console.log(`   Actifs               : ${produitStats.actifs}`);
    console.log(`   En promotion         : ${produitStats.enPromo}`);
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
        const categories = await seedCategories();

        // Seed boutiques et client (sauf si categories-only)
        if (!options.categoriesOnly) {
            const boutiques = await seedBoutiques();
            await seedClient();

            // Seed produits
            await seedProduits(boutiques, categories);
        }

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
// FONCTION : Reset complet (utilisateurs et categories)
// ============================================
const resetDatabase = async () => {
    try {
        console.log('\n==========================================');
        console.log('      RESET DATABASE - ATTENTION !        ');
        console.log('==========================================\n');

        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Suppression des produits...');
        const produitsResult = await Produit.deleteMany({});
        console.log(`   ${produitsResult.deletedCount} produit(s) supprime(s)`);

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
// FONCTION : Reset complet de TOUTE la base
// ============================================
const fullResetDatabase = async () => {
    try {
        console.log('\n==========================================');
        console.log('   FULL RESET DATABASE - TOUT SUPPRIMER   ');
        console.log('==========================================\n');

        await mongoose.connect(process.env.MONGODB_URI);

        console.log('Suppression de toutes les collections...\n');

        // Supprimer toutes les collections
        console.log('Suppression des messages...');
        const messagesResult = await Message.deleteMany({});
        console.log(`   ${messagesResult.deletedCount} message(s) supprime(s)`);

        console.log('Suppression des conversations...');
        const conversationsResult = await Conversation.deleteMany({});
        console.log(`   ${conversationsResult.deletedCount} conversation(s) supprimee(s)`);

        console.log('Suppression des notifications...');
        const notificationsResult = await Notification.deleteMany({});
        console.log(`   ${notificationsResult.deletedCount} notification(s) supprimee(s)`);

        console.log('Suppression des avis...');
        const avisResult = await Avis.deleteMany({});
        console.log(`   ${avisResult.deletedCount} avis supprime(s)`);

        console.log('Suppression des commandes...');
        const commandesResult = await Commande.deleteMany({});
        console.log(`   ${commandesResult.deletedCount} commande(s) supprimee(s)`);

        console.log('Suppression des paniers...');
        const paniersResult = await Panier.deleteMany({});
        console.log(`   ${paniersResult.deletedCount} panier(s) supprime(s)`);

        console.log('Suppression des produits...');
        const produitsResult = await Produit.deleteMany({});
        console.log(`   ${produitsResult.deletedCount} produit(s) supprime(s)`);

        console.log('Suppression des categories...');
        const categoriesResult = await Categorie.deleteMany({});
        console.log(`   ${categoriesResult.deletedCount} categorie(s) supprimee(s)`);

        console.log('Suppression de l\'historique de recherche...');
        const searchResult = await SearchHistory.deleteMany({});
        console.log(`   ${searchResult.deletedCount} recherche(s) supprimee(s)`);

        console.log('Suppression des utilisateurs...');
        const usersResult = await User.deleteMany({});
        console.log(`   ${usersResult.deletedCount} utilisateur(s) supprime(s)`);

        await mongoose.connection.close();
        console.log('\n==========================================');
        console.log('       BASE DE DONNEES VIDEE AVEC SUCCES  ');
        console.log('==========================================\n');

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
    console.log('\nMode FULL RESET active - Suppression de TOUTES les donnees\n');
    fullResetDatabase().then(() => {
        if (!args.includes('--no-seed')) {
            seedDatabase();
        } else {
            process.exit(0);
        }
    });
} else if (args.includes('--reset')) {
    console.log('\nMode RESET active\n');
    resetDatabase().then(() => seedDatabase());
} else if (args.includes('--categories-only')) {
    console.log('\nMode CATEGORIES ONLY active\n');
    seedDatabase({ categoriesOnly: true });
} else {
    seedDatabase();
}