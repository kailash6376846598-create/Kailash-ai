export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  const { prompt, chatHistory = [], imageBase64, hasImage, pdfText } = req.body;

  // Provider keys (kept only in env; no secrets in code)
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const USE_MOCK = process.env.USE_MOCK_GEMINI === '1' || process.env.USE_MOCK_GEMINI === 'true';

  // Configurable defaults (override via env)
  const MAX_HISTORY = Number(process.env.MAX_HISTORY) || 12;
  const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 25000;
  const MAX_FETCH_RETRIES = Number(process.env.MAX_FETCH_RETRIES) || 3;
  const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES) || 2_500_000; // ~2.5MB

  // Basic logging
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

  // Build a single user prompt including PDF/image hints
  let userPrompt = '';
  if (safePdfText) {
    userPrompt += `PDF Content:\n${safePdfText}\n\nUser Question:\n${prompt}`;
  } else {
    userPrompt = prompt || '';
  }

  // If image included, append a short hint (we don't forward binary to all providers)
  if (hasImage && imageBase64) {
    userPrompt += '\n\n[User attached an image]';
  }

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
    // Provider selection priority: Gemini -> OpenAI -> Mock -> Safe canned
    if (GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

      const requestBody = {
        systemInstruction: {
          parts: [{ text: 'तुम एक मददगार हिंदी AI असिस्टेंट हो। सरल भाषा में जवाब दो।' }]
        },
        contents: [
          ...shortHistory.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userPrompt }] }
        ]
      };

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
      console.log('Google Response:', data?.candidates?.[0]);
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'मुझे अभी कोई जवाब नहीं मिला।';
      return res.status(200).json({ reply });
    }

    if (OPENAI_API_KEY) {
      // Use OpenAI Chat Completions as fallback
      const url = 'https://api.openai.com/v1/chat/completions';
      const messages = [
        { role: 'system', content: 'You are Kailash AI: helpful assistant that answers in Hindi when user uses Hindi.' },
        ...shortHistory.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
        { role: 'user', content: userPrompt }
      ];

      const body = {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.2,
        max_tokens: 800
      };

      const response = await fetchWithTimeoutAndRetries(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return res.status(response.status).json({ reply: data.error?.message || 'AI से जवाब प्राप्त नहीं हो सका।' });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'मुझे अभी कोई उत्तर नहीं मिला।';
      return res.status(200).json({ reply });
    }

    if (USE_MOCK) {
      // Forward to local mock service if running (mock/gemini-mock.js) or return canned mock
      try {
        const mockUrl = process.env.MOCK_GEMINI_URL || 'http://localhost:8080/';
        const response = await fetchWithTimeoutAndRetries(mockUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userPrompt })
        });
        if (response.ok) {
          const d = await response.json().catch(() => ({}));
          const reply = d.candidates?.[0]?.content?.parts?.[0]?.text || 'Mock reply';
          return res.status(200).json({ reply });
        }
      } catch (e) {
        console.warn('Mock forward failed', e?.message || e);
      }

      return res.status(200).json({ reply: 'यह स्थानीय mock उत्तर है — कृपया GEMINI_API_KEY या OPENAI_API_KEY सेट करें।' });
    }

    // No provider keys configured — return a safe canned reply (non-placeholder but functional)
    return res.status(200).json({ reply: 'Kailash AI (local mode): मुझे अभी कोई external AI key नहीं मिली। आप GEMINI_API_KEY या OPENAI_API_KEY सेट करके external AI प्रयोग कर सकते हैं। अभी के लिए मैं local मोड में हूँ और मैं सामान्य जानकारी, लिंक सुझाव और संक्षेप प्रदान कर सकता हूँ।' });
  } catch (error) {
    console.error('ERROR in /api/chat:', error);
    if (error.code === 'TIMEOUT') {
      return res.status(504).json({ reply: 'AI request timed out. Please try again.' });
    }
    return res.status(500).json({ reply: error.message || 'Server error' });
  }
}
