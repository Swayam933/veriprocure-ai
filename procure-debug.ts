import { POST } from './src/app/api/procure/route';
import fs from 'node:fs';

(async () => {
  for (const line of fs.readFileSync('./.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }

  const task = 'Build a tiny Node.js/TypeScript API endpoint that returns a hello message and includes validation tests for invalid input and success responses.';
  const req = new Request('http://localhost/api/procure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task }) });

  const res = await POST(req);
  console.log('status=', res.status);
  const text = await res.text();
  console.log(text.slice(0, 4000));
})();
