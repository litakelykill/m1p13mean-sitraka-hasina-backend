# Backend - Application Centre Commercial

Backend Express.js pour l'application de gestion de centre commercial.

## Informations du Projet

**Projet** : M1-P13 MEAN Stack  
**Étudiants** : Sitraka & Hasina  
**Promotion** : Master 1 - Promotion 13  
**Période** : Janvier - Mars 2026

## Architecture

### Structure

```
m1p13mean-sitraka-hasina-backend/
├── server.js
├── seed.js
├── vercel.json
├── package.json
│
├── scripts/
│   ├── migrate-notes.js
│   └── seed.js
├── src/
│   ├── app.js
│   │
│   ├── config/
│   │   ├── database.js
│   │   └── multer.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Categorie.js
│   │   ├── Produit.js
│   │   ├── Panier.js
│   │   ├── Commande.js
│   │   ├── Avis.js
│   │   ├── Notification.js
│   │   ├── Conversation.js
│   │   ├── Message.js
│   │   └── SearchHistory.js
│   │
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── avis.controller.js
│   │   ├── boutique.controller.js
│   │   ├── catalogue.controller.js
│   │   ├── categorie.controller.js
│   │   ├── commande-boutique.controller.js
│   │   ├── commande-client.controller.js
│   │   ├── dashboard-boutique.controller.js
│   │   ├── notification.controller.js
│   │   ├── panier.controller.js
│   │   ├── produit.controller.js
│   │   ├── chat.controller.js
│   │   └── search.controller.js
│   │
│   ├── middlewares/
│   │   ├── admin.validation.js
│   │   ├── auth.middleware.js
│   │   ├── avis.validation.js
│   │   ├── boutique.validation.js
│   │   ├── categorie.validation.js
│   │   ├── chat.validation.js
│   │   ├── commande.validation.js
│   │   ├── index.js
│   │   ├── panier.validation.js
│   │   ├── produit.validation.js
│   │   ├── role.middleware.js
│   │   └── validation.middleware.js
│   │
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── auth.routes.js
│   │   ├── avis-admin.routes.js
│   │   ├── avis-boutique.routes.js
│   │   ├── avis.routes.js
│   │   ├── boutique.routes.js
│   │   ├── catalogue.routes.js
│   │   ├── categorie.routes.js
│   │   ├── chat-boutique.routes.js
│   │   ├── chat-client.routes.js
│   │   ├── commande-boutique.routes.js
│   │   ├── commande-client.routes.js
│   │   ├── dashboard-boutique.routes.js
│   │   ├── index.js
│   │   ├── notification.routes.js
│   │   ├── panier.routes.js
│   │   ├── produit.routes.js
│   │   └── search.routes.js
│   │
│   ├── utils/
│   │   └── encryption.js
│   └── services/
│       └── notification.service.js
│
└── uploads/ 
    ├── avatars/                           
    ├── boutiques/
    │   ├── logos/                         
    │   └── bannieres/                     
    └── produits/                        
```

## Technologies

- **Runtime** : Node.js v22.19.0
- **Framework** : Express v4.21.2
- **Base de données** : MongoDB v8.2.3
- **ODM** : Mongoose v8.9.5
- **Authentification** : JWT (jsonwebtoken v9.0.2)
- **Sécurité** : Bcrypt (bcryptjs v2.4.3)

## Installation

### Prérequis

- Node.js v22.19.0
- npm v10.9.4
- MongoDB v8.2.3 (local) ou compte MongoDB Atlas

### Étapes

1. **Installer les dépendances**
```bash
npm install
```

2. **Configurer les variables d'environnement**
```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Puis éditer `.env` avec vos valeurs.

3. **Démarrer MongoDB** (si local)
```bash
mongod
```

4. **Dépendance messages crypté**
```bash
npm install crypto-js
```

5. **Lancer le serveur**
```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

Le serveur démarre sur http://localhost:5000

## Scripts Disponibles
```bash
npm start       # Démarrer en production
npm run dev     # Démarrer en développement (avec nodemon)
npm run seed    # Peupler la base avec des données de test (à créer)
```
