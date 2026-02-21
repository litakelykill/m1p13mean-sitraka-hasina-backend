/**
 * Encryption Utility
 * 
 * Chiffrement/déchiffrement AES-256-GCM pour les messages du chat
 * Utilise le module crypto natif de Node.js
 * 
 * @module utils/encryption
 */

const crypto = require('crypto');

// Algorithme de chiffrement
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes pour AES
const AUTH_TAG_LENGTH = 16; // 16 bytes pour GCM

/**
 * Récupère la clé de chiffrement depuis les variables d'environnement
 * @returns {Buffer} - Clé de 32 bytes pour AES-256
 */
const getEncryptionKey = () => {
    const key = process.env.CHAT_ENCRYPTION_KEY;

    if (!key) {
        throw new Error('CHAT_ENCRYPTION_KEY non définie dans les variables d\'environnement');
    }

    // Hash la clé pour obtenir exactement 32 bytes
    return crypto.createHash('sha256').update(key).digest();
};

/**
 * Chiffre un texte avec AES-256-GCM
 * @param {string} text - Texte à chiffrer
 * @returns {Object} - { encrypted, iv, authTag } en base64
 */
const encrypt = (text) => {
    if (!text || typeof text !== 'string') {
        throw new Error('Le texte à chiffrer doit être une chaîne non vide');
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64')
    };
};

/**
 * Déchiffre un texte chiffré avec AES-256-GCM
 * @param {string} encrypted - Texte chiffré en base64
 * @param {string} iv - Vecteur d'initialisation en base64
 * @param {string} authTag - Tag d'authentification en base64
 * @returns {string} - Texte déchiffré
 */
const decrypt = (encrypted, iv, authTag) => {
    if (!encrypted || !iv || !authTag) {
        throw new Error('Données de déchiffrement incomplètes');
    }

    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

/**
 * Génère une clé de chiffrement aléatoire (pour setup initial)
 * @returns {string} - Clé en hexadécimal (64 caractères)
 */
const generateKey = () => {
    return crypto.randomBytes(32).toString('hex');
};

module.exports = {
    encrypt,
    decrypt,
    generateKey,
    ALGORITHM
};