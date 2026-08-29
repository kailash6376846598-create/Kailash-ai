const http = require('http');

const port = Number(process.env.MOCK_GEMINI_PORT) || 8080;

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const mock = {
        candidates: [
          {
            content: {
              parts: [
                { text: 'Mock reply from local test Gemini server.' }
              ]
            }
          }
        ]
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mock));
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(port, () => {
  console.log(`Mock Gemini server listening on http://localhost:${port}`);
});
