import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '_site');
const port = Number(process.env.PORT || 4173);
const includeDrafts = process.argv.includes('--drafts');
const clients = new Set();
let building = false;
let pending = false;

async function build() {
    if (building) { pending = true; return; }
    building = true;
    const child = spawn(process.execPath, ['scripts/build-site.mjs', ...(includeDrafts ? ['--drafts'] : [])], { cwd: root, stdio: 'inherit' });
    const success = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', code => resolve(code === 0));
    });
    building = false;
    if (success) for (const client of clients) client.write('data: reload\n\n');
    if (pending) { pending = false; await build(); }
    return success;
}

if (!await build()) process.exit(1);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };
const server = http.createServer((request, response) => {
    if (request.url === '/__preview/events') {
        response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        response.write(': connected\n\n');
        clients.add(response);
        request.on('close', () => clients.delete(response));
        return;
    }
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (pathname.split('/').some(part => part.startsWith('.'))) throw new Error('Invalid path');
        let file = path.resolve(output, '.' + pathname);
        if (!file.startsWith(output + path.sep) && file !== output) throw new Error('Invalid path');
        if (fs.statSync(file).isDirectory()) {
            if (!pathname.endsWith('/')) { response.writeHead(302, { Location: pathname + '/' }); response.end(); return; }
            file = path.join(file, 'index.html');
        }
        let content = fs.readFileSync(file);
        if (file.endsWith('.html')) content = content.toString().replace('</body>', '<script>new EventSource("/__preview/events").onmessage=()=>location.reload();</script></body>');
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(content);
    } catch {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Page not found');
    }
});
server.listen(port, '127.0.0.1', () => {
    console.log(`\nLocal: http://127.0.0.1:${port}/\nBlog:  http://127.0.0.1:${port}/blog/\n${includeDrafts ? 'Drafts included in this local preview.\n' : ''}`);
});
let timer;
const watchers = [];
for (const name of ['content', 'templates', 'assets/blog', 'data', 'css', 'js', 'components', 'scripts']) {
    const directory = path.join(root, name);
    if (!fs.existsSync(directory)) continue;
    watchers.push(fs.watch(directory, { recursive: true }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => build().catch(error => console.error(error.message)), 200);
    }));
}
watchers.push(fs.watch(path.join(root, 'index.html'), () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch(error => console.error(error.message)), 200);
}));
function close() {
    clearTimeout(timer);
    for (const watcher of watchers) watcher.close();
    for (const client of clients) client.end();
    server.close(() => process.exit(0));
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
