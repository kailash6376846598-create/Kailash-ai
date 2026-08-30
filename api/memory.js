import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'memory.json');

async function load() {
  try {
    const txt = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(txt || '{}');
  } catch (e) {
    return {};
  }
}

async function save(obj) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

export default async function handler(req, res) {
  // Supports GET (list), POST (set), DELETE (remove)
  try {
    const method = req.method || 'GET';
    const store = await load();

    if (method === 'GET') {
      // optional query param ?key=...
      const key = req.query && req.query.key;
      if (key) {
        return res.status(200).json({ key, value: store[key] || null });
      }
      return res.status(200).json({ memory: store });
    }

    if (method === 'POST') {
      const { key, value, meta } = req.body || {};
      if (!key) return res.status(400).json({ error: 'key required' });
      store[key] = { value, meta: meta || {}, updated_at: new Date().toISOString() };
      await save(store);
      return res.status(200).json({ ok: true, key, entry: store[key] });
    }

    if (method === 'DELETE') {
      const { key } = req.body || {};
      if (!key) return res.status(400).json({ error: 'key required' });
      delete store[key];
      await save(store);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('memory handler error', err);
    return res.status(500).json({ error: 'server error' });
  }
}
