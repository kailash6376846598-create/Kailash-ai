import express from 'express';
const app = express();
app.use(express.json({ limit: '5mb' }));
const PORT = process.env.MOCK_PORT ? Number(process.env.MOCK_PORT) : 8080;

app.post('/', (req, res) => {
  const prompt = (req.body && req.body.prompt) ? String(req.body.prompt) : '';
  const short = prompt.length > 500 ? prompt.slice(0, 500) + '...[truncated]' : prompt;

  const replyText = `Mock Gemini reply: received prompt (${short})`;

  // Return shape similar to Gemini generateContent candidates
  const response = {
    candidates: [
      {
        content: {
          parts: [
            { text: replyText }
          ]
        }
      }
    ]
  };

  res.json(response);
});

app.get('/_health', (req, res) => res.json({ ok: true, mock: true }));

app.listen(PORT, () => {
  console.log(`Gemini mock listening on http://localhost:${PORT}`);
});
