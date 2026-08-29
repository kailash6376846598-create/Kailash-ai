export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "Method not allowed"
    });
  }

  const {
    prompt,
    chatHistory = [],
    imageBase64,
    hasImage,
    pdfText
  } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      reply: "GEMINI_API_KEY नहीं मिली।"
    });
  }

  // Keep request payloads bounded to avoid long processing times
  const MAX_HISTORY = 12;
  const shortHistory = Array.isArray(chatHistory)
    ? chatHistory.slice(-MAX_HISTORY)
    : [];

  // Build request body (preserve the systemInstruction and contents structure)
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
"मेरा काम आपके सवालों के जवाब देना, जानकारी समझाना, फोटो और PDF को समझने में मद..."

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
      ...shortHistory.map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          { text: message.text }
        ]
      })),

      {
        role: "user",
        parts: [
          {
            text: pdfText
              ? `PDF Content:\n${pdfText}\n\nUser Question:\n${prompt}`
              : prompt
          },

          ...(hasImage && imageBase64
            ? [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: imageBase64.split(",")[1]
                  }
                }
              ]
            : [])
        ]
      }
    ]
  };

  // Helper: fetch with timeout and retry on 429
  async function fetchWithTimeoutAndRetries(url, options) {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 500; // ms

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutMs = 25000; // 25s - fail early to avoid platform invocation timeout
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const resp = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (resp.status === 429) {
          // Respect Retry-After header if present
          const retryAfter = resp.headers.get("Retry-After");
          let delay = BASE_DELAY * Math.pow(2, attempt);
          if (retryAfter) {
            const ra = parseInt(retryAfter, 10);
            if (!Number.isNaN(ra)) delay = Math.max(delay, ra * 1000);
          }

          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, delay + Math.random() * 200));
            continue;
          } else {
            // Return the 429 response to be handled by caller
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

        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        throw err;
      }
    }
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await fetchWithTimeoutAndRetries(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    // If we ended with a 429 after retries, send a friendly message
    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const msg = data.error?.message || "Rate limit (429). Please try again shortly.";
      return res.status(429).json({ reply: msg });
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        reply: data.error?.message || "AI से जवाब प्राप्त नहीं हो सका।"
      });
    }

    const data = await response.json();

    console.log("Google Response:", data);

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "मुझे अभी कोई जवाब नहीं मिला।";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("ERROR:", error);

    if (error.code === 'TIMEOUT') {
      return res.status(504).json({ reply: "AI request timed out. Please try again." });
    }

    return res.status(500).json({ reply: error.message || "Server error" });
  }
}
