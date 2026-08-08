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
"मेरा काम आपके सवालों के जवाब देना, जानकारी समझाना, फोटो और PDF को समझने में मदद करना और आपके साथ बातचीत करना है। 🤖"

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

            ...chatHistory.map(message => ({
              role: message.role === "assistant"
                ? "model"
                : "user",

              parts: [
                {
                  text: message.text
                }
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
        })
      }
    );

    const data = await response.json();

    console.log("Google Response:", data);

    if (!response.ok) {
      return res.status(response.status).json({
        reply:
          data.error?.message ||
          "AI से जवाब प्राप्त नहीं हो सका।"
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "मुझे अभी कोई जवाब नहीं मिला।";

    return res.status(200).json({
      reply
    });

  } catch (error) {

    console.error("ERROR:", error);

    return res.status(500).json({
      reply: error.message || "Server error"
    });
  }
}
