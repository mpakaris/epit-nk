const MAX_INPUT_IMAGE_BYTES = 20 * 1024 * 1024;  // 20 MB raw input (camera RAW, etc.)
const MAX_INPUT_VIDEO_BYTES = 10 * 1024 * 1024;  // 10 MB video hard limit
const TARGET_OUTPUT_BYTES   = 400 * 1024;         // 400 KB target output
const MAX_OUTPUT_BYTES      = 800 * 1024;         // 800 KB absolute max output
const MAX_DIM = 1920;

/**
 * Central media gate — call this on every file before uploading to R2.
 *
 * Images (any format: JPEG, PNG, HEIF, WebP, …):
 *   → resized to max 1920 px, converted to WebP, compressed to ~400 KB
 *
 * Videos:
 *   → validated ≤ 10 MB, passed through unchanged (browser can't compress video)
 *
 * Everything else:
 *   → passed through unchanged
 */
export async function processMediaFile(file) {
  if (file.type.startsWith('video/')) {
    if (file.size > MAX_INPUT_VIDEO_BYTES) {
      throw new Error(`„${file.name}" videó túl nagy. Maximum ${MAX_INPUT_VIDEO_BYTES / 1024 / 1024} MB megengedett.`);
    }
    return file;
  }

  if (file.type.startsWith('image/')) {
    if (file.size > MAX_INPUT_IMAGE_BYTES) {
      throw new Error(`„${file.name}" kép túl nagy. Maximum ${MAX_INPUT_IMAGE_BYTES / 1024 / 1024} MB megengedett.`);
    }
    return compressToWebP(file);
  }

  return file;
}

export async function processMediaFiles(files) {
  return Promise.all(files.map(processMediaFile));
}

// ── internal ──────────────────────────────────────────────────────────────────

function compressToWebP(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth  * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      const outName = file.name.replace(/\.[^.]+$/, '.webp');

      const tryAt = (quality) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return; }

          if (blob.size <= MAX_OUTPUT_BYTES || quality <= 0.30) {
            resolve(new File([blob], outName, { type: 'image/webp' }));
          } else {
            // Step down by 0.08 until we hit target, then fine-tune by 0.04
            const step = blob.size > TARGET_OUTPUT_BYTES * 3 ? 0.12 : 0.06;
            tryAt(Math.max(0.30, Math.round((quality - step) * 100) / 100));
          }
        }, 'image/webp', quality);
      };

      // Start lower for large inputs to converge faster
      const startQuality = file.size > 5 * 1024 * 1024 ? 0.72 : 0.82;
      tryAt(startQuality);
    };

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
