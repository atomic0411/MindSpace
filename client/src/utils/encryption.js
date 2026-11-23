import { argon2id } from 'hash-wasm';

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function deriveKEK(passphrase, saltHex) {
  const salt = Uint8Array.from(saltHex.match(/.{1,2}/g) || [], byte => parseInt(byte, 16));
  const derivedHex = await argon2id({
    password: passphrase,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'hex'
  });
  const raw = Uint8Array.from(derivedHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function createEncryptionEnvelope(passphrase) {
  const saltBytes = randomBytes(16);
  const salt = Array.from(saltBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const kek = await deriveKEK(passphrase, salt);
  const dek = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const wrappedDekIv = randomBytes(12);
  const rawDek = await crypto.subtle.exportKey('raw', dek);
  const wrappedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: wrappedDekIv }, kek, rawDek);
  return {
    metadata: {
      algorithm: 'AES-256-GCM',
      version: 1,
      salt,
      wrappedDek: toBase64(new Uint8Array(wrappedBuffer)),
      wrappedDekIv: toBase64(wrappedDekIv)
    },
    dek
  };
}

export async function unwrapEncryptionKey(passphrase, metadata) {
  const kek = await deriveKEK(passphrase, metadata.salt);
  let rawDek;
  try {
    rawDek = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(metadata.wrappedDekIv) },
      kek,
      fromBase64(metadata.wrappedDek)
    );
  } catch {
    throw new Error('The encryption passphrase is incorrect.');
  }
  return crypto.subtle.importKey('raw', rawDek, 'AES-GCM', true, ['encrypt', 'decrypt']);
}

export async function encryptPayload(dek, value) {
  const iv = randomBytes(12);
  const plaintext = TEXT_ENCODER.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, plaintext);
  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    encryptionVersion: 1
  };
}

export async function decryptPayload(dek, envelope) {
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
      dek,
      fromBase64(envelope.ciphertext)
    );
    return JSON.parse(TEXT_DECODER.decode(plaintext));
  } catch {
    throw new Error('This content could not be decrypted. The journal key may be locked or incorrect.');
  }
}
