#!/usr/bin/env node
// Fail-closed static publishing with a scoped Eleventy blog. Run: npm run build
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPublicPath, sourceFile } from './public-files.mjs';
export { assertPublicPath, sourceFile } from './public-files.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
export const publicManifest = JSON.parse(fs.readFileSync(path.join(scriptDirectory, 'build-site-manifest.json'), 'utf8'));

// Deliberately narrow patterns: browser analytics IDs and public Maps keys are not secrets.
// This is a release guard for recognizable credentials, not proof that arbitrary text is safe.
const credentialPatterns = [
    ['PEM private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
    ['AWS access key ID', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/],
    ['Slack token', /\b(?:xox[baprs]-\d{10,13}-\d{10,13}-(?:\d{10,13}-)?[A-Za-z0-9]{24,64}|xapp-\d-[A-Z0-9]+-\d+-[A-Za-z0-9]{32,})\b/],
    ['Slack webhook secret', /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[A-Za-z0-9]{24,}/],
    ['OpenAI API key', /\bsk-(?:(?:proj|svcacct)-[A-Za-z0-9_-]{64,}|[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20})\b/],
    ['Stripe live secret key', /\b(?:sk|rk)_live_[A-Za-z0-9]{24,}\b/],
];

function checkPublicContent(source, selected) {
    for (const relativePath of selected) {
        if (!/\.(?:html|css|[cm]?js|json|txt|xml|svg|webmanifest)$/i.test(relativePath) && relativePath !== 'CNAME') continue;
        const content = fs.readFileSync(sourceFile(source, relativePath), 'utf8');
        for (const [type, pattern] of credentialPatterns) {
            if (pattern.test(content)) throw new Error(`Potential ${type} in public file: ${relativePath}`);
        }
        if (/["']type["']\s*:\s*["']service_account["']/.test(content) &&
            /["']private_key["']\s*:\s*["'][^"']{16,}["']/.test(content)) {
            throw new Error(`Potential Google service account private key in public file: ${relativePath}`);
        }
    }
}

function localReference(reference, owner) {
    const value = reference.trim().replaceAll('&amp;', '&');
    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value) || value.includes('${')) return null;
    const pathname = value.split(/[?#]/, 1)[0];
    if (!pathname) return null;
    let decoded;
    try { decoded = decodeURIComponent(pathname); }
    catch { throw new Error(`Invalid URL in ${owner}: ${reference}`); }
    const resolved = path.posix.normalize(decoded.startsWith('/') ? decoded.slice(1) : path.posix.join(path.posix.dirname(owner), decoded));
    return resolved === '.' ? 'index.html' : resolved;
}

function checkRuntimeReferences(source, selected) {
    const warnings = new Set();
    function requireReference(reference, owner, required = true) {
        const target = localReference(reference, owner);
        if (target === null) return;
        assertPublicPath(target);
        if (!selected.has(target) && !selected.has(`${target.replace(/\/$/, '')}/index.html`)) {
            const message = `${owner} references unpublished file ${target}`;
            if (required) throw new Error(message);
            warnings.add(message);
        }
    }
    function checkScript(script, owner) {
        // Browser fetch/XHR paths resolve from the document, not the script URL.
        for (const match of script.matchAll(/\bfetch\(\s*(['"`])([^'"`]+)\1/g)) requireReference(match[2], owner);
        for (const match of script.matchAll(/\.open\(\s*['"]GET['"]\s*,\s*(['"])([^'"]+)\1/g)) requireReference(match[2], owner);
        for (const match of script.matchAll(/\bloadComponent\(\s*['"][^'"]+['"]\s*,\s*(['"])([^'"]+)\1/g)) requireReference(match[2], owner);
    }
    for (const relativePath of selected) {
        if (!/\.(?:html|css)$/.test(relativePath)) continue;
        const content = fs.readFileSync(sourceFile(source, relativePath), 'utf8');
        if (relativePath.endsWith('.css')) {
            for (const match of content.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'"\s)]+))\s*\)|@import\s+(?:"([^"]*)"|'([^']*)')/g)) {
                requireReference(match.slice(1).find(value => value !== undefined), relativePath);
            }
            continue;
        }
        const html = content.replace(/<!--[\s\S]*?-->/g, '');
        // The nav fragment is inserted into the homepage, so its URLs resolve there.
        const documentPath = relativePath === 'components/nav.html' ? 'index.html' : relativePath;
        for (const match of html.matchAll(/<(script|link|img|source|video|audio|a)\b[^>]*>/gi)) {
            const tag = match[0];
            const attribute = /\b(?:src|href|poster)\s*=\s*(['"])([^'"]+)\1/i.exec(tag);
            if (!attribute) continue;
            const tagName = match[1].toLowerCase();
            const blogPage = relativePath.startsWith('blog/');
            if (tagName === 'a' && !blogPage) continue;
            const required = blogPage || tagName === 'script' || (tagName === 'link' && /\brel\s*=\s*['"](?:stylesheet|preload|modulepreload|manifest)['"]/i.test(tag));
            requireReference(attribute[2], documentPath, required);
            if (tagName === 'script') {
                const target = localReference(attribute[2], documentPath);
                if (target && selected.has(target)) checkScript(fs.readFileSync(sourceFile(source, target), 'utf8'), documentPath);
            }
        }
        // Inline scripts have the same document-relative URL semantics.
        for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) checkScript(match[1], documentPath);
    }
    return [...warnings].sort();
}

export function buildSite({ source = path.resolve(scriptDirectory, '..'), manifest = publicManifest, blog = null } = {}) {
    source = fs.realpathSync(source);
    // Never accept a caller-controlled deletion destination. This is always generated output.
    const output = path.join(source, '_site');
    if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error('Refusing a symlink at _site');
    fs.rmSync(output, { recursive: true, force: true });
    const selected = new Set(manifest.files);
    for (const relativePath of manifest.optionalFiles ?? []) {
        assertPublicPath(relativePath);
        // Optional public assets support pages that have not adopted the module yet.
        if (fs.existsSync(path.join(source, relativePath))) selected.add(relativePath);
    }
    if (selected.has('assets/collisions/manifest.json')) {
        const collisionManifest = JSON.parse(fs.readFileSync(sourceFile(source, 'assets/collisions/manifest.json'), 'utf8'));
        if (!Array.isArray(collisionManifest.tiles) || collisionManifest.tiles.length === 0) throw new Error('Collision manifest has no tiles');
        for (const tile of collisionManifest.tiles) {
            if (!/^lat_-?\d{1,2}\.\d{2}_lon_-?\d{1,3}\.\d{2}\.json$/.test(tile.filename)) {
                throw new Error('Invalid collision tile filename');
            }
            selected.add(`assets/collisions/tiles/${tile.filename}`);
        }
    }
    if (blog) {
        if (manifest.blog !== true) throw new Error('Blog output requires an explicit manifest entry');
        for (const asset of blog.assets) {
            if (!/^assets\/blog\/.+\.(?:png|jpe?g|webp|avif|gif|svg|pdf)$/i.test(asset)) throw new Error(`Invalid blog asset: ${asset}`);
            selected.add(asset);
        }
        for (const file of blog.files.keys()) {
            assertPublicPath(file);
            if (!/^blog\/(?:index\.html|feed\.xml|[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html|page\/(?:[2-9]|[1-9]\d+)\/index\.html)$/.test(file) &&
                file !== 'data/blog-posts.json' && file !== 'sitemap.xml') throw new Error(`Invalid blog output: ${file}`);
        }
    }
    for (const relativePath of selected) sourceFile(source, relativePath);
    const staging = fs.mkdtempSync(path.join(source, '_site-build-'));
    try {
        for (const relativePath of [...selected].sort()) {
            const destination = path.join(staging, relativePath);
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.copyFileSync(sourceFile(source, relativePath), destination, fs.constants.COPYFILE_EXCL);
        }
        for (const [relativePath, content] of blog?.files ?? []) {
            if (selected.has(relativePath) && relativePath !== 'sitemap.xml') throw new Error(`Blog output collides with public file: ${relativePath}`);
            const destination = path.join(staging, relativePath);
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.writeFileSync(destination, content);
            selected.add(relativePath);
        }
        checkPublicContent(staging, selected);
        const warnings = checkRuntimeReferences(staging, selected);
        fs.renameSync(staging, output);
        return { output, files: [...selected].sort(), warnings };
    } catch (error) {
        fs.rmSync(staging, { recursive: true, force: true });
        throw error;
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const args = process.argv.slice(2);
        const includeDrafts = args.includes('--drafts');
        const remaining = args.filter(arg => arg !== '--drafts');
        if (remaining.length && (remaining.length !== 2 || remaining[0] !== '--source')) throw new Error('Usage: node scripts/build-site.mjs [--source <checkout>] [--drafts]');
        const source = remaining.length ? path.resolve(remaining[1]) : path.resolve(scriptDirectory, '..');
        const blog = publicManifest.blog ? await (await import('./build-blog.mjs')).generateBlog({ source, includeDrafts }) : null;
        const result = buildSite({ source, blog });
        console.log(`Built ${result.files.length} reviewed public files in ${result.output}`);
        for (const warning of result.warnings) console.warn(`Optional asset warning: ${warning}`);
    } catch (error) {
        console.error(`Site build refused: ${error.message}`);
        process.exitCode = 1;
    }
}
