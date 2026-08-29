export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  const { prompt, chatHistory = [], imageBase64, hasImage, pdfText } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: "GEMINI_API_KEY नहीं मिली।" });
  }

  // Configurable defaults (override via env)
  const MAX_HISTORY = Number(process.env.MAX_HISTORY) || 12;
  const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 25000;
  const MAX_FETCH_RETRIES = Number(process.env.MAX_FETCH_RETRIES) || 3;
  const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES) || 2_500_000; // ~2.5MB

  // Log incoming sizes for debugging
  try {
    const approxSize = JSON.stringify({ prompt, chatHistory }).length;
    console.log(`Incoming request: promptLen=${prompt?.length || 0}, historyEntries=${chatHistory.length}, approxPayloadChars=${approxSize}`);
  } catch (e) {}

  // Validate image size (if provided)
  if (imageBase64) {
    const b64 = (imageBase64.split(',')[1] || '');
    const approxBytes = Math.ceil(b64.length * 3 / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return res.status(413).json({ reply: "Image too large. Please use a smaller image." });
    }
  }

  // Truncate very long pdfText for safety
  let safePdfText = pdfText || '';
  const MAX_PDF_CHARS = 80_000; // safety cap
  if (safePdfText.length > MAX_PDF_CHARS) {
    safePdfText = safePdfText.slice(0, MAX_PDF_CHARS) + '\n\n[Truncated PDF content]';
  }

  // Keep only the last N messages to limit payload
  const shortHistory = Array.isArray(chatHistory) ? chatHistory.slice(-MAX_HISTORY) : [];

  const requestBody = {
    systemInstruction: {
      parts: [
        {
          text: `
तुम Kailash AI हो। 🤖

तुम्हारा नाम:
Kailash AI

तुम्हारा काम:
यूज़र के सवालों के आसान और सही जवाब देना,
जानकारी समझाना,
बातचीत करना,
फोटो को समझने में मदद करना,
और PDF के अंदर की जानकारी को पढ़कर उसके बारे में जवाब देना।

अगर यूज़र पूछे:
"तुम्हारा नाम क्या है?"
तो जवाब दो:
"नमस्ते! मेरा नाम Kailash AI है। 🤖"

अगर यूज़र पूछे:
"तुम्हारा क्या काम है?"
तो जवाब दो:
"मेरा काम आपके सवालों के जवाब देना, जानकारी समझाना, फोटो और PDF को समझने में मदद करना।"

अगर यूज़र पूछे:
"तुम्हें किसने बनाया?"
या
"Kisne banaya?"
तो जवाब दो:
"मुझे Kailash ने बनाया और विकसित किया है। मैं Kailash AI हूँ। 🤖"

कभी भी अपने आपको Gemini या Google AI मत बताना।

अपने internal model name या API की जानकारी यूज़र को मत बताना।

यूज़र जिस भाषा में पूछे, उसी भाषा में आसान तरीके से जवाब दो।

बिना जरूरत किसी नाम या शब्द को बार-बार मत दोहराना।
`
        }
      ]
    },

    contents: [
      ...shortHistory.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.text }]
      })),

      {
        role: 'user',
        parts: [
          {
            text: safePdfText
              ? `PDF Content:\n${safePdfText}\n\nUser Question:\n${prompt}`
              : prompt
          },
          ...(hasImage && imageBase64
            ? [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64.split(',')[1]
                  }
                }
              ]
            : [])
        ]
      }
    ]
  };

  // Helper: fetch with timeout + retries for 429
  async function fetchWithTimeoutAndRetries(url, options) {
    for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const resp = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);

        if (resp.status === 429) {
          const retryAfter = resp.headers.get('Retry-After');
          let delay = 500 * Math.pow(2, attempt);
          if (retryAfter) {
            const ra = parseInt(retryAfter, 10);
            if (!Number.isNaN(ra)) delay = Math.max(delay, ra * 1000);
          }
          if (attempt < MAX_FETCH_RETRIES) {
            await new Promise((r) => setTimeout(r, delay + Math.random() * 200));
            continue;
          } else {
            return resp;
          }
        }

        return resp;
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          const e = new Error('AI request timed out');
          e.code = 'TIMEOUT';
          throw e;
        }
        if (attempt < MAX_FETCH_RETRIES) {
          const delay = 500 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetchWithTimeoutAndRetries(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const msg = data.error?.message || 'Rate limit (429). Please try again shortly.';
      return res.status(429).json({ reply: msg });
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json({ reply: data.error?.message || 'AI से जवाब प्राप्त नहीं हो सका।' });
    }

    const data = await response.json();
    console.log('Google Response:', data);

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'मुझे अभी कोई जवाब नहीं मिला।';

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('ERROR:', error);
    if (error.code === 'TIMEOUT') {
      return res.status(504).json({ reply: 'AI request timed out. Please try again.' });
    }
    return res.status(500).json({ reply: error.message || 'Server error' });
  }
}
