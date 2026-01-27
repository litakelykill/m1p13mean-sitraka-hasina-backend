# Backend - Application Centre Commercial

Backend Express.js pour l'application de gestion de centre commercial.

## Informations du Projet

**Projet** : M1-P13 MEAN Stack  
**Étudiants** : Sitraka & Hasina  
**Promotion** : Master 1 - Promotion 13  
**Période** : Janvier - Mars 2026

## Architecture

### Structure

    src/
    ├── app.js              # Configuration Express + Middlewares

    ├── config/             # Configuration (DB, JWT)

    ├── models/             # Modèles Mongoose

    ├── routes/             # Routes Express (modulaires)

    ├── controllers/        # Contrôleurs (logique métier)

    ├── middlewares/        # Middlewares personnalisés

    └── utils/              # Fonctions utilitaires

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

4. **Lancer le serveur**
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
