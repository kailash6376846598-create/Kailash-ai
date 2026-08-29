import * as db from '../../lib/db.js';

export default async function handler(req, res) {
  const cookie = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('kailash_sid='));
  const token = cookie ? cookie.split('=')[1] : null;
  if (!token) return res.status(200).json({ user: null });

  if (!process.env.DATABASE_URL) return res.status(200).json({ user: null });

  try {
    const r = await db.query('SELECT s.*, u.email, u.name, u.picture FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.session_token=$1 AND s.expires_at > now()', [token]);
    const row = r.rows[0];
    if (!row) return res.status(200).json({ user: null });
    const user = { id: row.user_id, email: row.email, name: row.name, picture: row.picture };
    return res.status(200).json({ user });
  } catch (e) {
    console.error('Session lookup error', e);
    return res.status(500).json({ error: 'session lookup failed' });
  }
}
