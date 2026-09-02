export default async function handler(req, res) {
  // Simple placeholder for YouTube-related actions. This is a dev stub.
  try {
    if (req.method === 'GET' && req.path === '/_health') return res.status(200).json({ ok: true, youtube: 'stub' });
    // Return 501 for all normal endpoints — real implementation requires OAuth keys and rate limits.
    return res.status(501).json({ error: 'YouTube integration not implemented in dev build' });
  } catch (err) {
    console.error('youtube handler error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'server error' });
  }
}
