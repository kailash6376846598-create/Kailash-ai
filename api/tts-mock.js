export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const text = (req.body && req.body.text) ? String(req.body.text).slice(0, 2000) : '';
    // For dev: return a JSON response describing playback options.
    // Optionally include a small base64 placeholder (empty) to indicate where audio would be.
    return res.status(200).json({ ok: true, note: 'TTS mock — use browser speechSynthesis for playback in client; server TTS not enabled in dev', text, audioBase64: null });
  } catch (err) {
    console.error('tts-mock error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'server error' });
  }
}
