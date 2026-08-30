import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the Next-style handler from api/chat.js
import chatHandler from './api/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// static files (index.html, script.js, style.css)
app.use(express.static(path.join(__dirname)));

// JSON body parser with generous limit (but respect server-side guards)
app.use(express.json({ limit: '10mb' }));

// Mount the chat handler at /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    // Forward to the exported handler
    await chatHandler(req, res);
  } catch (err) {
    console.error('Dev server handler error:', err);
    res.status(500).json({ reply: 'Dev server internal error' });
  }
});

// Health
app.get('/_health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Dev server listening on http://localhost:${PORT}`);
  console.log('Serving static files from', __dirname);
});
