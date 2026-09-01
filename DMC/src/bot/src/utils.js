const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logMainInfo  = (...args) => console.log('[BOT]', ...args);
const logMainError = (...args) => console.error('[BOT ERROR]', ...args);

// Forward every console.log/error from the browser page to stdout.
// This is how the player receives flag exfil via console.log().
async function handleTargetCreated(target) {
    try {
        const page = await target.page();
        if (!page) return;
        page.on('console', msg => {
            const text = msg.text();
            console.log('[PAGE]', text);
        });
        page.on('pageerror', err => {
            if (process.env.ENVIRONMENT === 'development') {
                console.error('[PAGE ERROR]', err.message);
            }
        });
    } catch {}
}

async function handleTargetDestroyed() {}

module.exports = { delay, handleTargetCreated, handleTargetDestroyed, logMainInfo, logMainError };
