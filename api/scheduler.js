import fs from 'fs/promises';
import path from 'path';

const SCHED_PATH = path.join(process.cwd(), 'data', 'scheduler.json');
const TMP = '.tmp';

async function load() {
  try {
    const txt = await fs.readFile(SCHED_PATH, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) {
    return [];
  }
}

async function save(arr) {
  await fs.mkdir(path.dirname(SCHED_PATH), { recursive: true });
  const tmp = SCHED_PATH + TMP;
  await fs.writeFile(tmp, JSON.stringify(arr, null, 2), 'utf8');
  await fs.rename(tmp, SCHED_PATH).catch(async (err) => {
    console.warn('scheduler atomic rename failed, falling back', err && err.message ? err.message : err);
    await fs.writeFile(SCHED_PATH, JSON.stringify(arr, null, 2), 'utf8');
  });
}

export default async function handler(req, res) {
  try {
    const method = req.method || 'GET';

    if (method === 'GET') {
      const items = await load();
      return res.status(200).json({ items });
    }

    if (method === 'POST') {
      const { id, time, task } = req.body || {};
      if (!task || !time) return res.status(400).json({ error: 'task and time required' });
      const items = await load();
      const entry = { id: id || String(Date.now()), time, task, created_at: new Date().toISOString() };
      items.push(entry);
      await save(items);
      return res.status(200).json({ ok: true, entry });
    }

    if (method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      let items = await load();
      const before = items.length;
      items = items.filter((it) => it.id !== id);
      if (items.length === before) return res.status(404).json({ error: 'not found' });
      await save(items);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('scheduler handler error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'server error' });
  }
}
