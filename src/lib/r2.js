import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

export function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

export function r2PublicUrl(key) {
  const base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');
  return `${base}/${key}`;
}

/**
 * Upload a single file buffer to R2.
 * @param {string} key      Full object key, e.g. "{entityId}/images/abc.jpg"
 * @param {Buffer} buffer
 * @param {string} mimeType
 */
export async function uploadToR2(key, buffer, mimeType) {
  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType || 'application/octet-stream',
  }));
}

export async function deleteFromR2(key) {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  }));
}

/**
 * Convert any image buffer to WebP using sharp.
 * Returns { buffer, mimeType } — always 'image/webp'.
 * quality 82 gives good balance for construction/profile photos.
 */
export async function toWebp(inputBuffer, { quality = 82, maxDimension = 2400 } = {}) {
  const webpBuffer = await sharp(inputBuffer)
    .rotate()                         // auto-rotate from EXIF
    .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  return { buffer: webpBuffer, mimeType: 'image/webp' };
}

/** Build the R2 object key for a diary media file. */
export function diaryMediaKey(entityId, mimeType, filename) {
  const isVideo = mimeType?.startsWith('video/');
  const folder = isVideo ? 'videos' : 'images';
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : (isVideo ? 'mp4' : 'jpg');
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${entityId}/${folder}/${unique}.${ext}`;
}
