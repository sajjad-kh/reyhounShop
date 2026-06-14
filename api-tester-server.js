const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve HTML file
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = path.join(__dirname, 'api-tester.html');
    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // Proxy API requests to Basalam
  if (req.url.startsWith('/api/')) {
    const apiPath = req.url.replace('/api/', '');
    const basalamUrl = `https://openapi.basalam.com/${apiPath}`;

    console.log(`📡 Proxying: ${req.method} ${basalamUrl}`);

    const options = {
      method: req.method,
      headers: {}
    };

    // Forward Authorization header
    if (req.headers.authorization) {
      options.headers['Authorization'] = req.headers.authorization;
    }

    // Forward Content-Type
    if (req.headers['content-type']) {
      options.headers['Content-Type'] = req.headers['content-type'];
    }

    const proxyReq = https.request(basalamUrl, options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*'
      });

      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('❌ Proxy error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    });

    // Forward request body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
    return;
  }

  // 404 for other routes
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🚀 API Tester Server running at http://localhost:${PORT}`);
  console.log(`📄 Open http://localhost:${PORT} in your browser`);
});
