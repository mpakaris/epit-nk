import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ suggestedValue: null, message: 'Nincs megadott képhivatkozás' });
    }

    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    if (apiKey) {
      // Call Google Cloud Vision API TEXT_DETECTION
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: imageUrl.startsWith('data:')
                  ? { content: imageUrl.split(',')[1] }
                  : { source: { imageUri: imageUrl } },
                features: [{ type: 'TEXT_DETECTION' }]
              }
            ]
          })
        }
      );

      const data = await response.json();
      const fullText = data.responses?.[0]?.fullTextAnnotation?.text;

      if (fullText) {
        // Find numbers with optional space, dot, or comma separators
        // Matches typical HUF formats: 45 000, 45.000, 45000, 15000 Ft
        const matches = fullText.match(/\b\d{1,3}(?:[ .]\d{3})*(?:,\d+)?\b|\b\d{4,8}\b/g) || [];
        const numbers = matches
          .map(m => parseInt(m.replace(/[ .]/g, ''), 10))
          .filter(n => !isNaN(n) && n >= 500 && n <= 50000000); // Filter sensible invoice amounts

        if (numbers.length > 0) {
          const largest = Math.max(...numbers);
          return NextResponse.json({
            suggestedValue: largest,
            rawMatches: numbers.slice(0, 5)
          });
        }
      }
    }

    return NextResponse.json({ suggestedValue: 0, message: 'No sum detected' });
  } catch (err) {
    console.error('OCR Error:', err);
    return NextResponse.json({ suggestedValue: null, error: err.message });
  }
}
