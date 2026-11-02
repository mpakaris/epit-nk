let _pdfjs = null;

async function getPdfJs() {
  if (_pdfjs) return _pdfjs;
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  _pdfjs = pdfjs;
  return pdfjs;
}

/**
 * Render up to `maxPages` pages of a PDF File to JPEG data URLs.
 * Returns an empty array on failure — caller handles gracefully (manual entry).
 */
export async function pdfToImageDataUrls(file, maxPages = 3) {
  try {
    const pdfjs = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    const results = [];
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      results.push(canvas.toDataURL('image/jpeg', 0.85));
      canvas.width = 0;
    }
    return results;
  } catch (err) {
    console.warn('PDF to image conversion failed:', err);
    return [];
  }
}
