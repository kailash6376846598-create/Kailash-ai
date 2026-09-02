export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  const expr = (req.body && req.body.expr) ? String(req.body.expr) : '';
  if (!expr) return res.status(400).json({ error: 'expr required' });
  // Validate allowed chars (digits, spaces, + - * / ( ) .)
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return res.status(400).json({ error: 'invalid characters in expression' });
  try {
    // Safe evaluation using Function after validation
    const result = Function(`"use strict"; return (${expr})`)();
    if (typeof result === 'number' && Number.isFinite(result)) return res.status(200).json({ ok: true, result });
    return res.status(400).json({ error: 'invalid expression result' });
  } catch (e) {
    return res.status(400).json({ error: 'evaluation error', detail: String(e) });
  }
}
