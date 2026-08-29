# OAuth & Auth setup for Kailash-ai

This document describes the OAuth (Google) authentication setup and required environment variables. You must configure the Google OAuth client and set secrets in your deployment environment.

Required environment variables

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- OAUTH_CALLBACK_URL
- OAUTH_REDIRECT_AFTER (optional; default `/`)
- ENCRYPTION_KEY (32 bytes base64 or hex) — used to encrypt refresh tokens at rest
- JWT_SECRET or COOKIE_SECRET — used to sign cookies / tokens
- DATABASE_URL — Postgres connection string
- SESSION_LIFETIME_DAYS — optional (default 30)

Notes

- You should register the OAuth callback URL(s) in Google Cloud Console exactly as set in OAUTH_CALLBACK_URL.
- For production deploys (e.g., Vercel), set OAUTH_CALLBACK_URL to your Vercel app URL + `/api/auth/google/callback`. Do not hard-code URLs — this is configurable via env vars.
- ENCRYPTION_KEY must be kept secret. Generate with: `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

One-time steps

1. Create an OAuth 2.0 Client ID in Google Cloud Console.
2. Add the redirect URI(s) matching `OAUTH_CALLBACK_URL`.
3. Enable YouTube Data API v3 if you want uploads.
4. Set the environment variables in your deployment platform.

Local testing

- For local dev, use e.g. `http://localhost:3000/api/auth/google/callback` as OAUTH_CALLBACK_URL and set it in your Google Client.
- Use `USE_MOCK_GEMINI=1` for development without paid API keys.
