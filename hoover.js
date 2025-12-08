// crypto-utils.js
// Node 18+ recommended. Install: npm i argon2 jsonwebtoken
const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

/////////////////////
// Configuration
/////////////////////
const AES_KEY_LEN = 32; // 256-bit AES
const AES_IV_LEN = 12;  // 96-bit recommended for GCM
const RSA_OAEP_HASH = 'sha256';
const JWT_ALGO = 'RS256'; // uses RSA keypair for JWT signing

/////////////////////
// Helpers
/////////////////////
function secureRandom(bytes) {
  return crypto.randomBytes(bytes);
}

// constant-time compare wrapper
function safeEqual(a, b) {
  if (!Buffer.isBuffer(a)) a = Buffer.from(a);
  if (!Buffer.isBuffer(b)) b = Buffer.from(b);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/////////////////////
// Password hashing (Argon2id)
/////////////////////
async function hashPassword(password) {
  // Argon2id with safe defaults; tune memory/time/parallelism as needed
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 17, // ~128 MB (tune for your infra)
    timeCost: 3,
    parallelism: 1,
  });
}

async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    return false;
  }
}

/////////////////////
// Symmetric encryption: AES-256-GCM (authenticated)
/////////////////////
function aesGcmEncrypt(plaintextBuffer, key) {
  // key: Buffer(32)
  if (!Buffer.isBuffer(key) || key.length !== AES_KEY_LEN) {
    throw new Error('Key must be 32-byte Buffer for AES-256-GCM');
  }
  const iv = secureRandom(AES_IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  // return iv|tag|ciphertext (base64-friendly)
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function aesGcmDecrypt(payloadBase64, key) {
  const payload = Buffer.from(payloadBase64, 'base64');
  if (payload.length < AES_IV_LEN + 16) throw new Error('Invalid payload');
  const iv = payload.slice(0, AES_IV_LEN);
  const tag = payload.slice(AES_IV_LEN, AES_IV_LEN + 16);
  const ciphertext = payload.slice(AES_IV_LEN + 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext; // Buffer
}

/////////////////////
// Asymmetric keypair (RSA) generation and usage (for key wrapping & JWT)
/////////////////////
function generateRsaKeyPairSync(bits = 4096) {
  // Returns PEM strings
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: bits,
    publicExponent: 0x10001,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

function rsaOaepWrapKey(publicKeyPem, keyBuffer) {
  // Wrap (encrypt) symmetric key with RSA-OAEP
  return crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: RSA_OAEP_HASH,
    },
    keyBuffer
  ).toString('base64');
}

function rsaOaepUnwrapKey(privateKeyPem, wrappedBase64) {
