const express = require('express');
const path    = require('path');
const http    = require('http');
const fs      = require('fs');

const app      = express();
app.disable('x-powered-by');
const PHP_HOST = process.env.PHP_HOST || 'php';
const PHP_PORT = parseInt(process.env.PHP_PORT || '8080');

const PUBLIC      = path.join(__dirname, 'public');
const SCROLLS_DIR = path.join(PUBLIC, 'api/v2/codex/scrolls');
const RELICS_DIR  = '/relics';

app.use(express.static(PUBLIC));

// ── PHP proxy helper ──────────────────────────────────────────────────────────
function proxyToPhp(req, res, phpPath) {
    const options = {
        hostname: PHP_HOST,
        port:     PHP_PORT,
        path:     phpPath,
        method:   req.method,
        headers: {
            'Host':           PHP_HOST,
            'Cookie':         req.headers['cookie']          || '',
            'Content-Type':   req.headers['content-type']   || '',
            'Content-Length': req.headers['content-length'] || '',
            'Accept':         'application/json',
        },
    };
    const proxy = http.request(options, (phpRes) => {
        res.status(phpRes.statusCode);
        Object.entries(phpRes.headers).forEach(([k, v]) => {
            if (!['connection', 'keep-alive', 'transfer-encoding'].includes(k)) res.set(k, v);
        });
        phpRes.pipe(res);
    });
    proxy.on('error', (e) => {
        console.error('[proxy error]', e.message);
        if (!res.headersSent) res.status(502).json({ error: 'PHP service unreachable' });
    });
    if (req.method === 'POST') req.pipe(proxy);
    else proxy.end();
}

// ── /api/v1/relic/upload → PHP ────────────────────────────────────────────────
app.post('/api/v1/relic/upload', (req, res) => {
    proxyToPhp(req, res, '/api/v1/relic/upload');
});

// ── /api/v1/relic/read/<filename> → Express (avoids Apache 400) ───────────────
// This is what the XSS payload calls with the bot's FLAG cookie.
app.get('/api/v1/relic/read/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);

    // Protect the forbidden tome
    if (filename === 'forbidden-tome.txt') {
        const expected = process.env.FLAG;
        const cookie   = req.headers['cookie'] || '';
        const flagCookie = cookie.split(';').map(c => c.trim())
            .find(c => c.startsWith('FLAG='));
        const flagVal = flagCookie ? flagCookie.slice('FLAG='.length) : '';

        if (!expected || flagVal !== expected) {
            return res.status(403).json({ error: 'Forbidden — only the Condemned may read the Tome.' });
        }

        const tomePath = path.join(RELICS_DIR, 'forbidden-tome.txt');
        const content  = fs.readFileSync(tomePath, 'utf8');
        return res.json({ success: true, content, flag: expected });
    }

    // Serve other relics as binary
    const relicPath = path.join(RELICS_DIR, filename);
    if (!fs.existsSync(relicPath)) {
        return res.status(404).json({ error: 'Relic not found' });
    }
    const mime = 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(relicPath).pipe(res);
});

// ── /api/v2/codex/scrolls/* ───────────────────────────────────────────────────
app.get('/api/v2/codex/scrolls/*', (req, res) => {
    const prefix = '/api/v2/codex/scrolls/';
    const rawId  = req.url.slice(prefix.length);

    // No encoding — serve static scroll JSON
    if (!rawId.includes('%')) {
        const staticPath = path.join(SCROLLS_DIR, rawId + '.json');
        if (fs.existsSync(staticPath)) {
            res.setHeader('Content-Type', 'application/json');
            return res.sendFile(staticPath);
        }
        return res.status(404).json({ error: 'Scroll not found' });
    }

    // Traversal payload — decode once (2nd decode in chain)
    let decoded;
    try { decoded = decodeURIComponent(rawId); }
    catch { return res.status(400).json({ error: 'Bad encoding' }); }

    // Match the json gadget path
    const jsonMatch = decoded.match(/v1\/relic\/json\/(.+)/);
    if (!jsonMatch) return res.status(404).json({ error: 'Not found' });

    const filename = path.basename(jsonMatch[1]).replace(/\.json$/, '');

    // Forbidden tome check
    if (filename === 'forbidden-tome.txt') {
        const expected = process.env.FLAG;
        const cookie   = req.headers['cookie'] || '';
        const flagCookie = cookie.split(';').map(c => c.trim()).find(c => c.startsWith('FLAG='));
        const flagVal = flagCookie ? flagCookie.slice('FLAG='.length) : '';
        if (!expected || flagVal !== expected) return res.status(403).json({ error: 'Forbidden' });
        const content = fs.readFileSync(path.join(RELICS_DIR, 'forbidden-tome.txt'), 'utf8');
        return res.json({ success: true, content, flag: expected });
    }

    // Serve relic as JSON (strip GIF prefix)
    const relicPath = path.join(RELICS_DIR, filename);
    if (!fs.existsSync(relicPath)) return res.status(404).json({ error: 'Relic not found' });

    const raw       = fs.readFileSync(relicPath);
    const jsonStart = raw.indexOf('{');
    if (jsonStart === -1) return res.status(400).json({ error: 'No JSON in relic' });

    res.setHeader('Content-Type', 'application/json');
    res.send(raw.slice(jsonStart));
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.listen(3000, () => console.log('[codex] app listening on :3000'));
