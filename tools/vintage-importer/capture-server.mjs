import http from 'node:http';
import { appendFile, writeFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 3131);
const out = process.env.OUTPUT_FILE || 'vintage-cards.ndjson';
await writeFile(out, '');

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{}');
    return;
  }

  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    try {
      const rows = JSON.parse(body);
      if (!Array.isArray(rows)) throw new Error('Expected array payload');
      for (const row of rows) await appendFile(out, `${JSON.stringify(row)}\n`);
      console.log(`captured ${rows.length} rows`);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end('{}');
    } catch (error) {
      console.error(error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
    }
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`capture server listening on 127.0.0.1:${port}`);
});
