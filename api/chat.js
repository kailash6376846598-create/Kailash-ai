export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const response = await fetch(
      const response = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are Kailash AI.
You were created by Kailash.
Always introduce yourself as Kailash AI.

User: ${prompt}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();    console.log(data);

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
