#!/usr/bin/env node
// Dependency-free, fail-closed static publishing. Run: node scripts/build-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export function assertPublicPath(relativePath) {
    if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\\') ||
        relativePath.startsWith('/') || path.posix.normalize(relativePath) !== relativePath ||
        relativePath.split('/').some(part => part.startsWith('.') ||
            /^(?:worker|scripts|docs|reference|input|node_modules|chads-bach)$/i.test(part) ||
            /(?:^|[-_.])(?:env|secret|secrets|credential|credentials|private|backup)(?:[-_.]|$)/i.test(part)) ||
        /(?:\.(?:pem|key|p12|pfx|sql|sqlite3?|db|bak|old|orig|swp|map|log|zip|tar|gz)|~)$/i.test(relativePath) ||
        /(?:^|\/)(?:AGENTS|CLAUDE|README)(?:\.|$)/i.test(relativePath)) {
        throw new Error(`Forbidden public file: ${String(relativePath)}`);
    }
}

function sourceFile(source, relativePath) {
    assertPublicPath(relativePath);
    let current = source;
    const parts = relativePath.split('/');
    for (const [index, part] of parts.entries()) {
        current = path.join(current, part);
        let stat;
        try { stat = fs.lstatSync(current); }
        catch { throw new Error(`Missing public file: ${relativePath}`); }
        if (stat.isSymbolicLink()) throw new Error(`Symlink is not publishable: ${relativePath}`);
        if (index < parts.length - 1 && !stat.isDirectory()) throw new Error(`Invalid public directory: ${relativePath}`);
        if (index === parts.length - 1 && (!stat.isFile() || stat.nlink > 1)) {
            throw new Error(`Only ordinary files are publishable: ${relativePath}`);
        }
    }
    return current;
}

function localReference(reference, owner) {
    const value = reference.trim().replaceAll('&amp;', '&');
    if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value) || value.includes('${')) return null;
    const pathname = value.split(/[?#]/, 1)[0];
    if (!pathname) return null;
    let decoded;
    try { decoded = decodeURIComponent(pathname); }
    catch { throw new Error(`Invalid URL in ${owner}: ${reference}`); }
    return path.posix.normalize(decoded.startsWith('/') ? decoded.slice(1) : path.posix.join(path.posix.dirname(owner), decoded));
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
        for (const match of html.matchAll(/<(script|link|img|source|video|audio)\b[^>]*>/gi)) {
            const tag = match[0];
            const attribute = /\b(?:src|href|poster)\s*=\s*(['"])([^'"]+)\1/i.exec(tag);
            if (!attribute) continue;
            const tagName = match[1].toLowerCase();
            const required = tagName === 'script' || (tagName === 'link' && /\brel\s*=\s*['"](?:stylesheet|preload|modulepreload|manifest)['"]/i.test(tag));
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

export function buildSite({ source = path.resolve(scriptDirectory, '..'), manifest = publicManifest } = {}) {
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
    for (const relativePath of selected) sourceFile(source, relativePath);
    checkPublicContent(source, selected);
    const warnings = checkRuntimeReferences(source, selected);
    const staging = fs.mkdtempSync(path.join(source, '_site-build-'));
    try {
        for (const relativePath of [...selected].sort()) {
            const destination = path.join(staging, relativePath);
            fs.mkdirSync(path.dirname(destination), { recursive: true });
            fs.copyFileSync(sourceFile(source, relativePath), destination, fs.constants.COPYFILE_EXCL);
        }
        fs.renameSync(staging, output);
    } catch (error) {
        fs.rmSync(staging, { recursive: true, force: true });
        throw error;
    }
    return { output, files: [...selected].sort(), warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const args = process.argv.slice(2);
        if (args.length && (args.length !== 2 || args[0] !== '--source')) throw new Error('Usage: node scripts/build-site.mjs [--source <checkout>]');
        const result = buildSite(args.length ? { source: args[1] } : {});
        console.log(`Built ${result.files.length} reviewed public files in ${result.output}`);
        for (const warning of result.warnings) console.warn(`Optional asset warning: ${warning}`);
    } catch (error) {
        console.error(`Site build refused: ${error.message}`);
        process.exitCode = 1;
    }
}
