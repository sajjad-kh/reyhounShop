const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 8080;

// Enable CORS for all routes
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Serve static files (for api-tester.html)
// Use path.join to ensure correct path regardless of where script is run from
app.use(express.static(path.join(__dirname)));

// Proxy API requests to Basalam
app.use('/api', createProxyMiddleware({
    target: 'https://openapi.basalam.com',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // Remove /api prefix when forwarding
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying: ${req.method} ${req.url} -> https://openapi.basalam.com${req.url.replace('/api', '')}`);
    },
    onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Proxy error', message: err.message });
    }
}));

app.listen(PORT, () => {
    const url = `http://localhost:${PORT}/api-tester.html`;
    console.log(`� Pro xy server running on http://localhost:${PORT}`);
    console.log(`� API Tiester available at: ${url}`);
    console.log(`🔗 Proxying API requests to: https://openapi.basalam.com`);
    console.log(`\n🌐 Opening browser...`);
    
    // Open browser automatically
    const command = process.platform === 'win32' ? `start ${url}` : 
                    process.platform === 'darwin' ? `open ${url}` : 
                    `xdg-open ${url}`;
    
    exec(command, (error) => {
        if (error) {
            console.log(`⚠️ Could not open browser automatically. Please open: ${url}`);
        }
    });
});

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, '../uploads')
  )
);