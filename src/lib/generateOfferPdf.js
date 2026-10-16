import puppeteer from 'puppeteer';

/**
 * Render the offer print page to PDF using the real Next.js print view.
 * Requires the request cookies so puppeteer can authenticate.
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

    await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 2 });
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for the offer content to be rendered (not the spinner)
    await page.waitForSelector('.print-root', { timeout: 15000 });

    // Hide the action bar (back/print buttons, color picker)
    await page.evaluate(() => {
      document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
