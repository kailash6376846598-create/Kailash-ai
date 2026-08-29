// auth_tests.js - basic unit tests for auth helpers
import assert from 'assert';
import { encrypt, decrypt } from '../lib/crypto.js';

function run() {
  console.log('Running auth helper tests');
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    console.warn('ENCRYPTION_KEY not set — skipping encrypt/decrypt tests');
    return;
  }
  const text = 'my-refresh-token-123';
  const e = encrypt(text);
  const d = decrypt(e);
  assert.strictEqual(d, text);
  console.log('encrypt/decrypt OK');
}

run();
