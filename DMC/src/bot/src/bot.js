process.env.HOME = '/tmp';

const net       = require('net');
const puppeteer = require('puppeteer-core');

const tips = [
    'Every console.log in the bot page is sent back to you :)',
    'There is a small race window (~10ms) when a new tab opens where console.log won\'t return output :(',
];
console.log(`==========\nTips: ${tips[Math.floor(Math.random() * tips.length)]}\n==========`);

const delay = ms => new Promise(r => setTimeout(r, ms));

let busy = false;
let connectionCount = 0;
const MAX_CONNECTIONS = 20;  // reject if too many open sockets

async function visit(url, socket) {
    console.log('[BOT] Starting browser...');
    const browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        args: [
            '--no-sandbox',
            '--disable-gpu',
            '--disable-jit',
            '--disable-wasm',
            '--disable-dev-shm-usage',
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    });

    const [page] = await browser.pages();
    await page.setDefaultNavigationTimeout(5000);

    // Forward page console to socket
    page.on('console', msg => {
        const text = msg.text();
        console.log('[PAGE]', text);
        try { socket.write(`[PAGE] ${text}\n`); } catch {}
    });

    console.log('[BOT] Setting FLAG cookie...');
    await page.setCookie({
        name:     'FLAG',
        value:    process.env.FLAG || 'INFERNOCTF{test}',
        domain:   'dantes-codex-nginx',
        path:     '/',
        httpOnly: true,
    });

    console.log('[BOT] Visiting:', url);
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 8000 });
    } catch {}

    await delay(5000);

    console.log('[BOT] Done. Closing browser.');
    await browser.close();
}

const server = net.createServer((socket) => {
    // Hard connection limit
    connectionCount++;
    if (connectionCount > MAX_CONNECTIONS) {
        socket.write('✗ Too many connections. Try again later.\n');
        socket.destroy();
        connectionCount--;
        return;
    }

    socket.setTimeout(30000);

    socket.write('=== THE QLIPHOTH — Infernal Bot ===\n');
    socket.write('The Condemned Librarian awaits your scroll URL.\n');
    socket.write('URL must start with: http://dantes-codex-nginx/\n');
    socket.write('> ');

    let received = false;

    socket.once('data', async (data) => {
        if (received) return;
        received = true;

        const url = data.toString().trim();

        // Strict URL validation
        if (!url.startsWith('http://dantes-codex-nginx/')) {
            socket.write('✗ Invalid URL. Must start with http://dantes-codex-nginx/\n');
            socket.destroy();
            connectionCount--;
            return;
        }

        // URL length limit — prevents memory abuse
        if (url.length > 2048) {
            socket.write('✗ URL too long.\n');
            socket.destroy();
            connectionCount--;
            return;
        }

        if (busy) {
            socket.write('✗ The Condemned is already wandering. Try again in a moment.\n');
            socket.destroy();
            connectionCount--;
            return;
        }

        busy = true;
        socket.write('⛧ The Condemned descends into your scroll...\n');

        try {
            await visit(url, socket);
            socket.write('✓ The Condemned has returned from the abyss.\n');
        } catch (err) {
            console.error('[BOT ERROR]', err);
            socket.write('✗ Something went wrong in the depths.\n');
        } finally {
            busy = false;
            connectionCount--;
            socket.destroy();
        }
    });

    socket.on('timeout', () => {
        socket.write('✗ Connection timed out.\n');
        socket.destroy();
        connectionCount--;
    });

    socket.on('error', () => { connectionCount--; });
    socket.on('close', () => {});
});

// Max pending connections in the OS queue
server.maxConnections = MAX_CONNECTIONS;

server.listen(4000, () => console.log('[BOT] Bot TCP server listening on :4000'));
