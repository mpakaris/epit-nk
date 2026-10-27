import puppeteer from 'puppeteer';

/**
 * Render the offer print page to PDF using the real Next.js print view.
 * Requires the request cookies so puppeteer can authenticate.
 *
 * A4 at 96 dpi = 794 × 1123 px. We set the viewport to exactly that width
 * so there is a 1:1 mapping — no scaling, no clipping.
 *
 * @param {string} quoteId
 * @param {string} cookieHeader  — raw Cookie header string from the incoming request
 * @returns {Promise<Buffer>}
 */
export async function generateOfferPdf(quoteId, cookieHeader) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const printUrl = `${baseUrl}/ajanlatok/${quoteId}/nyomtatas`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Pass auth cookies so the page renders as the logged-in user
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(pair => {
        const [name, ...rest] = pair.trim().split('=');
        return { name: name.trim(), value: rest.join('=').trim(), url: baseUrl };
      }).filter(c => c.name && c.value);
      if (cookies.length) await page.setCookie(...cookies);
    }

    // 794px wide = A4 at 96 dpi — 1:1 mapping, no Puppeteer scaling
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for the offer content to be rendered (not the spinner)
    await page.waitForSelector('.print-root', { timeout: 15000 });

    await page.evaluate(() => {
      // Hide action bar / floating buttons
      document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');

      // Reset mobile scaling wrapper — at 794px viewport docScale=1 so
      // transform is already none, but be explicit for safety
      const wrap = document.querySelector('.pdf-scale-wrap');
      const doc  = document.querySelector('.pdf-scale-doc');
      if (wrap) { wrap.style.cssText = 'width:794px;height:auto;position:static;margin:0 auto;padding:0;'; }
      if (doc)  { doc.style.cssText  = 'width:794px;position:static;transform:none;box-shadow:none;border-radius:0;background:white;'; }

      // White background everywhere
      document.documentElement.style.cssText = 'background:white;height:auto;';
      document.body.style.cssText = 'background:white;height:auto;min-height:0;margin:0;';

      // Remove min-height from wrapper so no blank page
      const root = document.querySelector('.print-root');
      if (root) { root.style.minHeight = '0'; root.style.background = 'white'; root.style.padding = '0'; }
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
