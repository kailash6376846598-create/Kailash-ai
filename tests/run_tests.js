// tests/run_tests.js
// Node 18+ required (global fetch available). This is a minimal smoke test script.
// Usage: node tests/run_tests.js [BASE_URL]
// Example: node tests/run_tests.js http://localhost:3000

const BASE = process.argv[2] || 'http://localhost:3000';
const API = BASE.replace(/\/$/, '') + '/api/chat';

async function run() {
  console.log('Base URL:', BASE);
  // 1) Basic health check: POST small prompt
  try {
    console.log('\n1) Basic POST /api/chat');
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Hello from smoke test', chatHistory: [] }),
      // keep a reasonable timeout via AbortController
      signal: (() => {
        const c = new AbortController();
        setTimeout(() => c.abort(), 20000);
        return c.signal;
      })()
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text.slice(0, 2000));
  } catch (err) {
    console.error('Basic POST error:', err && err.name ? err.name + ': ' + err.message : err);
  }

  // 2) Large chatHistory payload check (to see server caps/truncation)
  try {
    console.log('\n2) Large chatHistory payload (simulate heavy context)');
    const bigHistory = Array.from({length: 80}, (_,i)=>({role: i%2===0?'user':'assistant', text: 'line '+i+' hello world '.repeat(20)}));
    const res2 = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Test with big history', chatHistory: bigHistory }),
      signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 25000); return c.signal; })()
    });
    console.log('Status:', res2.status);
    const t2 = await res2.text();
    console.log('Body (truncated):', t2.slice(0, 2000));
  } catch (err) {
    console.error('Large history error:', err && err.name ? err.name + ': ' + err.message : err);
  }

  // 3) Image payload size indication (we'll send a fake base64 string length to test server validation)
  try {
    console.log('\n3) Image size guard simulation (fake large base64 payload)');
    // create fake base64 of approx 3MB (~4M chars base64)
    const fakeB64len = 4_000_000; // adjust as needed
    const fakeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(fakeB64len);
    const res3 = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'image test', chatHistory: [], hasImage: true, imageBase64: fakeBase64 }),
      signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 25000); return c.signal; })()
    });
    console.log('Status:', res3.status);
    const t3 = await res3.text();
    console.log('Body (truncated):', t3.slice(0, 2000));
  } catch (err) {
    console.error('Image guard error:', err && err.name ? err.name + ': ' + err.message : err);
  }

  // 4) Optional: test pdfText length handling
  try {
    console.log('\n4) PDF text truncation simulation (very long pdfText string)');
    const longPdf = 'page '.repeat(100000); // ~600k chars
    const res4 = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'pdf test', chatHistory: [], pdfText: longPdf }),
      signal: (() => { const c = new AbortController(); setTimeout(() => c.abort(), 30000); return c.signal; })()
    });
    console.log('Status:', res4.status);
    const t4 = await res4.text();
    console.log('Body (truncated):', t4.slice(0, 2000));
  } catch (err) {
    console.error('PDF truncation error:', err && err.name ? err.name + ': ' + err.message : err);
  }

  console.log('\nSmoke tests complete. If any step returned non‑200 or error, copy the Status and Body text and share here.');
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
