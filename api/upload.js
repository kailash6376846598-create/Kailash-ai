import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

    const { filename, base64 } = req.body || {};
    if (!filename || !base64) return res.status(400).json({ error: 'filename and base64 required' });

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const b64 = (base64.split(',')[1] || base64 || '');
    const buffer = Buffer.from(b64, 'base64');
    const safeName = path.basename(filename);
    const outPath = path.join(UPLOAD_DIR, safeName);
    await fs.writeFile(outPath, buffer);
    return res.status(200).json({ ok: true, path: `/data/uploads/${safeName}` });
  } catch (err) {
    console.error('upload handler error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'server error' });
  }
}
