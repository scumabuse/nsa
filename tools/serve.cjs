'use strict';

const { createServer } = require('node:http');
const { setDefaultResultOrder } = require('node:dns');
const { createReadStream } = require('node:fs');
const { stat } = require('node:fs/promises');
const { extname, resolve, sep } = require('node:path');
const trainingExplanation = require('../api/training-explanation.js');

const root = resolve(__dirname, '../dist');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.wasm': 'application/wasm',
};
setDefaultResultOrder('ipv4first');

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed' });
    if (url.pathname === '/api/training-explanation') {
      return await trainingExplanation(request, response);
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + sep) || !mime[extname(path)]) return sendJson(response, 404, { error: 'Not found' });
    const info = await stat(path);
    if (!info.isFile()) return sendJson(response, 404, { error: 'Not found' });
    response.writeHead(200, { 'Content-Type': mime[extname(path)], 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
    createReadStream(path).on('error', () => response.destroy()).pipe(response);
  } catch {
    sendJson(response, 404, { error: 'Not found' });
  }
}).listen(Number(process.env.PORT || 8788), '127.0.0.1', () => {
  console.log('Orbit Health assistant listening on localhost:' + (process.env.PORT || 8788));
});
