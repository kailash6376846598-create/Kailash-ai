export default async function handler(req, res) {
  // logout: delete session cookie and DB row
  const cookie = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('kailash_sid='));
  const token = cookie ? cookie.split('=')[1] : null;
  if (token && process.env.DATABASE_URL) {
    try {
      await (await import('../../lib/db.js')).query('DELETE FROM sessions WHERE session_token=$1', [token]);
    } catch (e) { console.warn('Failed to delete session', e); }
  }
  // clear cookie
  const parts = ['kailash_sid=deleted', 'Path=/', 'HttpOnly', 'Max-Age=0', 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
  return res.status(200).json({ ok: true });
}
