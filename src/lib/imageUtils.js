/**
 * Convert an iPhone HEIF/HEIC image file to JPEG.
 *
 * iOS WebKit decodes HEIF natively. We draw the image to a canvas and export
 * it as JPEG so every browser and the upload pipeline can handle it. If the
 * conversion fails for any reason the original file is returned as a fallback.
 *
 * Max output dimension is capped at 2048 px to keep file sizes manageable on
 * mobile connections while preserving enough quality for construction photos.
 */
export async function convertIfHeif(file) {
  if (!/^image\/(heic|heif)$/i.test(file.type)) return file;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const MAX = 2048;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) { resolve(file); return; }
          const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
          resolve(new File([blob], newName, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
