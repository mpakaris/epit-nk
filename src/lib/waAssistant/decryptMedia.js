import crypto from 'crypto';

const MEDIA_INFO = {
  image:    'WhatsApp Image Keys',
  video:    'WhatsApp Video Keys',
  audio:    'WhatsApp Audio Keys',
  voice:    'WhatsApp Audio Keys',
  document: 'WhatsApp Document Keys',
};

function hkdfExpand(prk, info, length) {
  const n = Math.ceil(length / 32);
  let okm = Buffer.alloc(0);
  let T   = Buffer.alloc(0);
  for (let i = 1; i <= n; i++) {
    T   = crypto.createHmac('sha256', prk).update(Buffer.concat([T, info, Buffer.from([i])])).digest();
    okm = Buffer.concat([okm, T]);
  }
  return okm.slice(0, length);
}

function deriveKeys(mediaKeyBase64, mediaType) {
  const salt      = Buffer.alloc(32);
  const ikm       = Buffer.from(mediaKeyBase64, 'base64');
  const infoStr   = MEDIA_INFO[mediaType] || MEDIA_INFO.image;
  const info      = Buffer.from(infoStr);
  const prk       = crypto.createHmac('sha256', salt).update(ikm).digest();
  const derived   = hkdfExpand(prk, info, 112);
  return { iv: derived.slice(0, 16), cipherKey: derived.slice(16, 48) };
}

/**
 * Download and decrypt a WhatsApp CDN media file.
 * @param {string} encryptedUrl  - mmg.whatsapp.net URL
 * @param {string} mediaKeyBase64 - base64 mediaKey from the message
 * @param {string} mediaType     - 'image' | 'video' | 'audio' | 'document'
 * @returns {Promise<Buffer>}    - decrypted raw bytes
 */
export async function decryptWhatsAppMedia(encryptedUrl, mediaKeyBase64, mediaType = 'image') {
  const { iv, cipherKey } = deriveKeys(mediaKeyBase64, mediaType);

  const res = await fetch(encryptedUrl);
  if (!res.ok) throw new Error(`Media download failed: ${res.status} ${res.statusText}`);

  const encryptedData = Buffer.from(await res.arrayBuffer());
  // WhatsApp appends a 10-byte HMAC to the end — strip it
  const ciphertext    = encryptedData.slice(0, -10);

  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
