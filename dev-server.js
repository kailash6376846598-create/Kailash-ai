import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

// Dynamic handler loader: attempt to import optional handlers (non-fatal)
async function tryLoadHandler(relPath) {
  try {
    const mod = await import(`./${relPath}`);
    return mod && mod.default ? mod.default : null;
  } catch (e) {
    // Module not found or error — return null, but log for diagnostics
    if (e && e.code !== 'ERR_MODULE_NOT_FOUND') console.warn(`Failed loading ${relPath}:`, e && e.message ? e.message : e);
    return null;
  }
}

// Load handlers (top-level await is allowed in ESM with package.json "type": "module")
const handlers = {
  chat: await tryLoadHandler('api/chat.js'),
  memory: await tryLoadHandler('api/memory.js'),
  upload: await tryLoadHandler('api/upload.js'),
  search: await tryLoadHandler('api/search.js'),
  toolCalc: await tryLoadHandler('api/tool-calc.js'),
  scheduler: await tryLoadHandler('api/scheduler.js'),
  youtube: await tryLoadHandler('api/youtube.js'),
  tts: await tryLoadHandler('api/tts-mock.js'),
};

// Helper to mount or fallback
function mountPost(pathUrl, handler, name) {
  if (handler) {
    app.post(pathUrl, async (req, res) => {
      try { await handler(req, res); } catch (err) { console.error(`${name} handler error`, err); res.status(500).json({ error: 'Server error' }); }
    });
  } else {
    app.post(pathUrl, (req, res) => res.status(501).json({ error: `${pathUrl} not implemented in this build` }));
  }
}

// Mount the handlers (preserve behavior for chat and memory)
if (handlers.chat) {
  app.post('/api/chat', async (req, res) => { try { await handlers.chat(req, res); } catch (err) { console.error('chat handler error', err); res.status(500).json({ reply: 'Server error' }); } });
} else {
  mountPost('/api/chat', null, 'chat');
}

if (handlers.memory) {
  app.all('/api/memory', async (req, res) => { try { await handlers.memory(req, res); } catch (err) { console.error('memory handler error', err); res.status(500).json({ error: 'Server error' }); } });
} else {
  app.all('/api/memory', (req, res) => res.status(501).json({ error: 'memory not implemented' }));
}

mountPost('/api/upload', handlers.upload, 'upload');
mountPost('/api/search', handlers.search, 'search');
mountPost('/api/tool/calc', handlers.toolCalc, 'tool-calc');

app.all('/api/scheduler', async (req, res) => {
  if (handlers.scheduler) { try { await handlers.scheduler(req, res); } catch (err) { console.error('scheduler handler error', err); res.status(500).json({ error: 'Server error' }); } }
  else res.status(501).json({ error: 'scheduler not implemented' });
});

mountPost('/api/youtube', handlers.youtube, 'youtube');
mountPost('/api/tts', handlers.tts, 'tts-mock');

// Health
app.get('/_health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Dev server listening on http://localhost:${PORT}`);
  console.log('Serving static files from', __dirname);
});
