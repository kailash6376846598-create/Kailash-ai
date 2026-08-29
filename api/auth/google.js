export default async function handler(req, res) {
  // Redirect to Google OAuth consent
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callback = process.env.OAUTH_CALLBACK_URL;
  if (!clientId || !callback) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID or OAUTH_CALLBACK_URL not configured' });
  }

  const state = cryptoRandom(16);
  // set state cookie for CSRF validation
  const cookie = `oauth_state=${state}; HttpOnly; Path=/; SameSite=Lax`;
  res.setHeader('Set-Cookie', cookie);

  const scope = encodeURIComponent('openid profile email https://www.googleapis.com/auth/youtube.upload');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(callback)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  res.writeHead(302, { Location: url });
  res.end();
}

function cryptoRandom(n) {
  return [...cryptoRandomBytes(n)].map(b => ('0' + b.toString(16)).slice(-2)).join('');
}

function cryptoRandomBytes(n) {
  const crypto = require('crypto');
  return crypto.randomBytes(n);
}
