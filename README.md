# Kailash-ai

kailash ai


## Tests

This repository includes a smoke test script to check the core /api/chat behavior locally.

Run the development server (e.g. `vercel dev`) and then run the tests:

```bash
# install deps
npm ci

# run local dev server (example with Vercel CLI)
vercel dev

# in another terminal run smoke tests (defaults to http://localhost:3000)
npm test
# or:
node tests/run_tests.js http://localhost:3000
```

Environment variables

- GEMINI_API_KEY — required for real upstream Gemini calls during tests.
- Optional tuning (defaults already set in code):
  - MAX_HISTORY (default 12)
  - FETCH_TIMEOUT_MS (default 25000)
  - MAX_FETCH_RETRIES (default 3)
  - MAX_IMAGE_BYTES (default 2500000)


## Mock mode for tests

To avoid calling the real Gemini API during tests you can run the smoke tests in "mock mode". The mock mode is only used by the tests and does not change production behavior.

1) Start a simple mock server locally that returns canned responses for the Gemini endpoint. Example using Node's http-server approach:

```bash
# create a small mock file (mock/gemini.js) and run it on port 8080 — instructions in repo mock/README will be provided
```

2) Run the tests and point the BASE_URL to your dev server that proxies /api/chat to the mock Gemini endpoint, or temporarily set an environment variable `USE_TEST_MOCK=true` and `MOCK_GEMINI_URL=http://localhost:8080` for tests. The repository includes test helpers to detect `USE_TEST_MOCK` and run without calling the real Gemini API.


## Notes

- The mock mode only affects tests. Production /api/chat still uses GEMINI_API_KEY and the real Gemini endpoint.
