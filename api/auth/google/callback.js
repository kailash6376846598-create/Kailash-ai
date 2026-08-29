import fetch from 'node-fetch';
import { encrypt } from '../../lib/crypto.js';
import * as db from '../../lib/db.js';

export default async function handler(req, res) {
  const { code, state } = req.query || req.body || {};
  const expectedState = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('oauth_state='))?.split('=')[1];

  if (!code) return res.status(400).json({ error: 'Missing code' });
  if (!expectedState || expectedState !== state) {
    // continue but warn — state mismatch
    console.warn('OAuth state mismatch or missing');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callback = process.env.OAUTH_CALLBACK_URL;
  if (!clientId || !clientSecret || !callback) return res.status(500).json({ error: 'OAuth config not set' });

  try {
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', callback);
    params.append('grant_type', 'authorization_code');

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: params });
    const tokenJson = await tokenResp.json();
    if (tokenJson.error) {
      console.error('Token error', tokenJson);
      return res.status(500).json({ error: 'Token exchange failed' });
    }

    const { access_token, expires_in, refresh_token, id_token } = tokenJson;

    // fetch userinfo
    const ui = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const userinfo = await ui.json();

    const googleId = userinfo.sub || userinfo.id;
    const email = userinfo.email;
    const name = userinfo.name;
    const picture = userinfo.picture;

    const encryptedRefresh = refresh_token ? encrypt(refresh_token) : null;

    // upsert user
    const user = await db.upsertUserFromGoogle({ googleId, email, name, picture, refresh_token: encryptedRefresh });

    // create session token
    const sessionToken = randomHex(32);
    const lifetimeDays = Number(process.env.SESSION_LIFETIME_DAYS) || 30;
    const expiresAt = new Date(Date.now() + lifetimeDays * 24 * 3600 * 1000).toISOString();

    if (process.env.DATABASE_URL) {
      await db.query('INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at) VALUES ($1,$2,$3,$4,$5)', [user.id, sessionToken, req.headers['x-forwarded-for'] || req.socket.remoteAddress, req.headers['user-agent'] || '', expiresAt]);
    }

    const cookieParts = [
      `kailash_sid=${sessionToken}`,
      `HttpOnly`,
      `Path=/`,
      `SameSite=Lax`
    ];
    if (process.env.NODE_ENV === 'production') cookieParts.push('Secure');
    cookieParts.push(`Max-Age=${lifetimeDays * 24 * 3600}`);

    res.setHeader('Set-Cookie', cookieParts.join('; '));

    // Redirect to app root
    const redirectAfter = process.env.OAUTH_REDIRECT_AFTER || '/';
    res.writeHead(302, { Location: redirectAfter });
    res.end();
  } catch (err) {
    console.error('OAuth callback error', err);
    return res.status(500).json({ error: 'OAuth callback failed' });
  }
}

function randomHex(n) {
  return require('crypto').randomBytes(n).toString('hex');
}
