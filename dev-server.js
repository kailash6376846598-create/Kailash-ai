import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import handlers
import chatHandler from './api/chat.js';
import memoryHandler from './api/memory.js';
import uploadHandler from './api/upload.js';
import searchHandler from './api/search.js';
import toolCalcHandler from './api/tool-calc.js';
import schedulerHandler from './api/scheduler.js';
import youtubeHandler from './api/youtube.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(path.join(dataDir, 'uploads'))) fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });

// simple in-memory rate limiter (per-ip)
const rateMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window
function rateLimiter(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = rateMap.get(ip) || { count: 0, start: now };
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
      entry.count = 1;
      entry.start = now;
      rateMap.set(ip, entry);
      return next();
    }
    entry.count++;
    rateMap.set(ip, entry);
    if (entry.count > RATE_LIMIT_MAX) {
      res.status(429).json({ reply: 'Rate limit exceeded' });
    } else next();
  } catch (e) { next(); }
}

// Add simple security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  // Basic CSP (can be tightened later)
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; worker-src 'self' blob:;");
  next();
});

app.use(rateLimiter);

// static files (index.html, script.js, style.css, manifest)
app.use(express.static(path.join(__dirname)));

// JSON body parser with generous limit (but respect server-side guards)
app.use(express.json({ limit: '20mb' }));

// Mount the handlers
app.post('/api/chat', async (req, res) => {
  try { await chatHandler(req, res); } catch (err) { console.error('chat handler error', err); res.status(500).json({ reply: 'Server error' }); }
});
app.all('/api/memory', async (req, res) => { try { await memoryHandler(req, res); } catch (err) { console.error('memory handler error', err); res.status(500).json({ error: 'Server error' }); } });
app.post('/api/upload', async (req, res) => { try { await uploadHandler(req, res); } catch (err) { console.error('upload handler error', err); res.status(500).json({ error: 'Server error' }); } });
app.post('/api/search', async (req, res) => { try { await searchHandler(req, res); } catch (err) { console.error('search handler error', err); res.status(500).json({ error: 'Server error' }); } });
app.post('/api/tool/calc', async (req, res) => { try { await toolCalcHandler(req, res); } catch (err) { console.error('tool-calc handler error', err); res.status(500).json({ error: 'Server error' }); } });
app.all('/api/scheduler', async (req, res) => { try { await schedulerHandler(req, res); } catch (err) { console.error('scheduler handler error', err); res.status(500).json({ error: 'Server error' }); } });
app.post('/api/youtube', async (req, res) => { try { await youtubeHandler(req, res); } catch (err) { console.error('youtube handler error', err); res.status(500).json({ error: 'Server error' }); } });

// Health
app.get('/_health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Dev server listening on http://localhost:${PORT}`);
  console.log('Serving static files from', __dirname);
});
