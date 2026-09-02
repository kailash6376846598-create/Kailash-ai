import fs from 'fs/promises';
import path from 'path';
const MEM_PATH = path.join(process.cwd(), 'data', 'memory.json');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const q = (req.body && req.body.q) ? String(req.body.q).toLowerCase().trim() : '';
  try {
    const memTxt = await fs.readFile(MEM_PATH, 'utf8').catch(()=>'{}');
    const store = JSON.parse(memTxt || '{}');
    if (!q) return res.status(200).json({ results: Object.keys(store) });
    const results = Object.entries(store)
      .filter(([k,v]) => (k.toLowerCase().includes(q) || JSON.stringify(v).toLowerCase().includes(q)))
      .map(([k,v]) => ({ key: k, value: v }));
    return res.status(200).json({ results });
  } catch (e) {
    console.error('search error', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'server error' });
  }
}
