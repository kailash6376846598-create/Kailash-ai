import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || null;

let pool = null;
if (connectionString) {
  pool = new Pool({ connectionString });
} else {
  // Graceful no-DB mode: provide stubbed functions
  console.warn('DATABASE_URL not set — DB functions will be no-ops (development/mock mode)');
}

export async function query(text, params) {
  if (!pool) throw new Error('No database configured');
  return pool.query(text, params);
}

export async function getUserByGoogleId(googleId) {
  if (!pool) return null;
  const r = await pool.query('SELECT * FROM users WHERE google_id=$1', [googleId]);
  return r.rows[0];
}

export async function getUserById(id) {
  if (!pool) return null;
  const r = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
  return r.rows[0];
}

export async function upsertUserFromGoogle({ googleId, email, name, picture, refresh_token }) {
  if (!pool) return {
    id: null,
    google_id: googleId,
    email,
    name,
    picture,
    refresh_token
n  };

  const sql = `INSERT INTO users (google_id, email, name, picture, refresh_token)
               VALUES ($1,$2,$3,$4,$5)
               ON CONFLICT (google_id) DO UPDATE
                 SET email = EXCLUDED.email,
                     name = EXCLUDED.name,
                     picture = EXCLUDED.picture,
                     refresh_token = EXCLUDED.refresh_token
               RETURNING *`;
  const r = await pool.query(sql, [googleId, email, name, picture, refresh_token]);
  return r.rows[0];
}

export async function createSession({ user_id, refresh_token, expires_at }) {
  if (!pool) return { id: null, user_id, refresh_token, expires_at };
  const r = await pool.query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1,$2,$3) RETURNING *',
    [user_id, refresh_token, expires_at]
  );
  return r.rows[0];
}

export async function getSessionByRefreshToken(token) {
  if (!pool) return null;
  const r = await pool.query('SELECT * FROM sessions WHERE refresh_token=$1', [token]);
  return r.rows[0];
}

export async function deleteSession(id) {
  if (!pool) return null;
  const r = await pool.query('DELETE FROM sessions WHERE id=$1', [id]);
  return r.rowCount > 0;
}
