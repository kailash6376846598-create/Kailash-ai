export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  const { prompt, chatHistory, imageBase64, hasImage, pdfText } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
         systemInstruction: {
  parts: [
    {
      text: "You are Kailash AI. Never say you are Gemini or Google AI. If anyone asks who you are, always reply: 'नमस्ते! मैं Kailash AI हूँ। बताइए, आज मैं आपकी क्या मदद कर सकता हूँ?'"
    }
  ]
}, 
          contents: [
  ...chatHistory.map(message => ({
    parts: [
      {
        text: message.text
      }
    ]
  })),
  {
    parts: [
      {
        text: pdfText
  ? `PDF Content:\n${pdfText}\n\nUser Question: ${prompt}`
  : prompt
      },
      ...(hasImage
        ? [{
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBase64.split(",")[1]
            }
          }]
        : [])
    ]
  }
]
        })
      }
    );

    const data = await response.json();

if (!response.ok) {
  return res.status(response.status).json(data);
}

const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      reply: error.message,
    });
  }
}
