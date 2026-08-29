export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    audioBase64,
    mimeType = 'audio/webm',
    filename = 'recording.webm',
    prompt = '',
    chatHistory = []
  } = req.body || {};

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const USE_MOCK = process.env.USE_MOCK_GEMINI === '1' || process.env.USE_MOCK_GEMINI === 'true';

  const MAX_AUDIO_BYTES = Number(process.env.MAX_AUDIO_BYTES) || 3_500_000; // ~3.5MB
  const MAX_DURATION_S = Number(process.env.MAX_AUDIO_SECONDS) || 30;

  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 required' });
  }

  // quick size check
  const b64 = audioBase64.split(',')[1] || audioBase64;
  const approxBytes = Math.ceil(b64.length * 3 / 4);
  if (approxBytes > MAX_AUDIO_BYTES) {
    return res.status(413).json({ error: 'Audio too large. Limit ~3.5MB' });
  }

  // Helper to call OpenAI Whisper (multipart/form-data)
  async function transcribeWithOpenAI(base64, mime) {
    const fileBuffer = Buffer.from(base64.split(',')[1] || base64, 'base64');

    // Node's global FormData/Blob are available in recent runtimes
    const form = new FormData();
    const blob = new Blob([fileBuffer], { type: mime });
    form.append('file', blob, filename);
    form.append('model', 'whisper-1');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: form
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`OpenAI transcription failed: ${resp.status} ${txt}`);
    }

    const data = await resp.json();
    return data.text || '';
  }

  // Helper to request provider TTS (OpenAI audio.speech if available)
  async function ttsWithOpenAI(text) {
    // Best-effort: OpenAI's TTS endpoint shape may vary across SDKs; try v1/audio/speech
    try {
      const resp = await fetch('https://api.openai.com/v1/audio/speech?model=' + encodeURIComponent(process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: text })
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`OpenAI TTS failed: ${resp.status} ${txt}`);
      }

      const arrayBuffer = await resp.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString('base64');
      // Return base64 audio and mime
      return { audioBase64: `data:audio/mpeg;base64,${b64}`, mime: 'audio/mpeg' };
    } catch (e) {
      console.warn('TTS error', e?.message || e);
      return null;
    }
  }

  try {
    // If developer chose mock mode, return canned transcript and mock TTS
    if (USE_MOCK || !OPENAI_API_KEY) {
      const transcript = 'यह एक mock transcript है (development mode)।';
      const assistantText = `Mock reply to: ${prompt || 'voice input'}`;
      // return a short generated tone as base64 silence or a small beep? We'll return null TTS in mock to keep responses small
      return res.status(200).json({ transcript, assistantText, ttsAudioBase64: null });
    }

    // 1) Transcribe audio via OpenAI Whisper
    const transcript = await transcribeWithOpenAI(audioBase64, mimeType);

    // 2) Optionally forward transcript + prompt to /api/chat internally to get assistant text
    // Build payload
    const chatPayload = {
      prompt: (transcript ? `Transcribed: ${transcript}\nUser: ${prompt}` : prompt),
      chatHistory
    };

    // call local /api/chat using internal fetch
    const baseUrl = process.env.INTERNAL_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    let assistantText = '';

    if (baseUrl) {
      try {
        const r = await fetch(baseUrl.replace(/\/$/, '') + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatPayload)
        });
        const d = await r.json().catch(() => ({}));
        assistantText = d.reply || '';
      } catch (e) {
        console.warn('Internal chat call failed', e?.message || e);
      }
    }

    // If internal call didn't return text, fallback to a small local reply
    if (!assistantText) assistantText = `आपने कहा: ${transcript || prompt}`;

    // 3) Provider TTS using OpenAI (best-effort)
    let ttsAudio = null;
    if (process.env.ENABLE_PROVIDER_TTS === '1' || process.env.ENABLE_PROVIDER_TTS === 'true') {
      ttsAudio = await ttsWithOpenAI(assistantText);
    }

    return res.status(200).json({ transcript, assistantText, ttsAudioBase64: ttsAudio?.audioBase64 || null });
  } catch (err) {
    console.error('ERROR /api/voice:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
