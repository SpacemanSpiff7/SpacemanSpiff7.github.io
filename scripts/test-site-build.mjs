import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildSite, publicManifest } from './build-site.mjs';

function fixture(t, files) {
    const source = fs.mkdtempSync(path.join(os.tmpdir(), 'site-publish-test-'));
    t.after(() => fs.rmSync(source, { recursive: true, force: true }));
    for (const [name, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(source, name)), { recursive: true });
        fs.writeFileSync(path.join(source, name), content);
    }
    return source;
}

test('only reviewed public files are copied, even when secrets and backups exist beside them', t => {
    const source = fixture(t, {
        'index.html': '<script src="app.js?v=1"></script>',
        'app.js': 'console.log("public")',
        '.env': 'FAKE_TEST_SECRET=do-not-publish',
        'private-backup.json': '{"fake":"do-not-publish"}',
        'worker/src/index.js': 'internal source',
        'docs/audit.md': 'internal audit',
        'chads-bach/index.html': 'private itinerary',
        '_site/stale-private-backup.json': 'stale previous deployment',
    });
    const result = buildSite({ source, manifest: { files: ['index.html', 'app.js'] } });
    assert.deepEqual(fs.readdirSync(result.output).sort(), ['app.js', 'index.html']);
    assert.equal(fs.readFileSync(path.join(result.output, 'app.js'), 'utf8'), 'console.log("public")');
});

test('sensitive files are refused even if someone adds them to the publish manifest', t => {
    const source = fixture(t, { '.env': 'FAKE_TEST_SECRET=example', 'private-backup.json': '{}', 'app.js.map': '{}' });
    for (const file of ['.env', 'private-backup.json', 'app.js.map', 'worker/src/index.js', '../outside.txt']) {
        assert.throws(() => buildSite({ source, manifest: { files: [file] } }), /Forbidden public file/);
        assert.equal(fs.existsSync(path.join(source, '_site')), false);
    }
});

test('missing scripts, styles, fetched data, and referenced components stop publication', t => {
    const source = fixture(t, { 'index.html': '', 'app.js': 'fetch("data.json")' });
    for (const html of [
        '<script src="missing.js"></script>',
        '<link rel="stylesheet" href="missing.css">',
        '<script src="app.js"></script>',
        '<script>loadComponent("nav", "components/nav.html")</script>',
    ]) {
        fs.writeFileSync(path.join(source, 'index.html'), html);
        assert.throws(() => buildSite({ source, manifest: { files: ['index.html', 'app.js'] } }), /references unpublished file/);
        assert.equal(fs.existsSync(path.join(source, '_site')), false);
    }
});

test('missing allowlisted files fail instead of silently dropping public assets', t => {
    const source = fixture(t, { 'index.html': '' });
    assert.throws(() => buildSite({ source, manifest: { files: ['index.html', 'missing.js'] } }), /Missing public file/);
});

test('CSS imports are required and embedded SVG data URLs are not mistaken for files', t => {
    const source = fixture(t, {
        'index.html': '<link rel="stylesheet" href="style.css">',
        'style.css': '@import url("tokens.css"); body { background: url("data:image/svg+xml,%3Csvg filter=\'url(%23n)\'/%3E"); }',
        'tokens.css': ':root { color-scheme: dark; }',
    });
    const manifest = { files: ['index.html', 'style.css', 'tokens.css'] };
    assert.equal(buildSite({ source, manifest }).files.length, 3);
    manifest.files.pop();
    assert.throws(() => buildSite({ source, manifest }), /references unpublished file tokens.css/);
});

test('file symlinks and parent-directory symlinks cannot smuggle private content', t => {
    const source = fixture(t, { 'internal/credentials.txt': 'fake-test-secret' });
    fs.symlinkSync('internal/credentials.txt', path.join(source, 'app.js'));
    fs.symlinkSync('internal', path.join(source, 'assets'));
    for (const file of ['app.js', 'assets/credentials.txt']) {
        assert.throws(() => buildSite({ source, manifest: { files: [file] } }), /Symlink|Forbidden public file/);
    }
    fs.renameSync(path.join(source, 'internal/credentials.txt'), path.join(source, 'internal/public.txt'));
    assert.throws(() => buildSite({ source, manifest: { files: ['assets/public.txt'] } }), /Symlink/);
});

test('output symlinks do not delete or overwrite another directory', t => {
    const source = fixture(t, { 'index.html': '', 'protected/keep.txt': 'keep' });
    fs.symlinkSync('protected', path.join(source, '_site'));
    assert.throws(() => buildSite({ source, manifest: { files: ['index.html'] } }), /Refusing a symlink/);
    assert.equal(fs.readFileSync(path.join(source, 'protected/keep.txt'), 'utf8'), 'keep');
});

test('collision manifest selects only strictly named public tiles and requires every tile', t => {
    const file = 'assets/collisions/manifest.json';
    const source = fixture(t, {
        [file]: JSON.stringify({ tiles: [{ filename: 'lat_34.00_lon_-118.00.json' }] }),
        'assets/collisions/tiles/lat_34.00_lon_-118.00.json': '{}',
        'assets/collisions/tiles/private-backup.json': '{"fake":"secret"}',
    });
    let result = buildSite({ source, manifest: { files: [file] } });
    assert.equal(result.files.length, 2);
    assert.equal(fs.existsSync(path.join(result.output, 'assets/collisions/tiles/private-backup.json')), false);
    fs.unlinkSync(path.join(source, 'assets/collisions/tiles/lat_34.00_lon_-118.00.json'));
    assert.throws(() => buildSite({ source, manifest: { files: [file] } }), /Missing public file/);
    fs.writeFileSync(path.join(source, file), JSON.stringify({ tiles: [{ filename: '../../../.env' }] }));
    assert.throws(() => buildSite({ source, manifest: { files: [file] } }), /Invalid collision tile filename/);
});

test('production manifest excludes all internal areas and the retired trip app', () => {
    assert(publicManifest.files.includes('curlbro/assets/index-BJ9Eo3hu.js'));
    assert(publicManifest.files.includes('grocery-project-files/seasonal-produce/web/data.json'));
    for (const file of publicManifest.files) {
        assert(!/(?:^|\/)(?:worker|scripts|docs|reference|input|chads-bach)(?:\/|$)/.test(file));
        assert(!/(?:^|\/)(?:CLAUDE|AGENTS|README)\./.test(file));
    }
});

test('recognizable credentials inside approved JavaScript and JSON block release without printing values', t => {
    // Assemble fake fixtures so these tests do not themselves look like committed credentials.
    const examples = [
        ['PEM private key', ['-----BEGIN ', 'PRIVATE KEY-----', '\n', 'a'.repeat(64)].join('')],
        ['AWS access key ID', ['AK', 'IA', 'A1'.repeat(8)].join('')],
        ['GitHub token', ['gh', 'p_', 'a'.repeat(36)].join('')],
        ['GitHub token', ['github', '_pat_', 'a'.repeat(22), '_', 'b'.repeat(59)].join('')],
        ['Slack token', ['xo', 'xb-', '1'.repeat(12), '-', '2'.repeat(12), '-', 'a'.repeat(24)].join('')],
        ['Slack webhook secret', ['https://hooks.', 'slack.com/services/', 'T' + 'A'.repeat(8), '/', 'B' + 'A'.repeat(8), '/', 'b'.repeat(24)].join('')],
        ['OpenAI API key', ['sk', '-proj-', 'a'.repeat(80)].join('')],
        ['OpenAI API key', ['sk', '-', 'a'.repeat(20), 'T3Bl', 'bkFJ', 'b'.repeat(20)].join('')],
        ['Stripe live secret key', ['sk', '_live_', 'a'.repeat(24)].join('')],
    ];
    const source = fixture(t, { 'app.js': '', 'data.json': '{}' });
    for (const [type, value] of examples) {
        for (const file of ['app.js', 'data.json']) {
            fs.writeFileSync(path.join(source, file), JSON.stringify({ token: value }));
            assert.throws(() => buildSite({ source, manifest: { files: [file] } }), error => {
                assert.equal(error.message, `Potential ${type} in public file: ${file}`);
                assert(!error.message.includes(value));
                return true;
            });
            assert.equal(fs.existsSync(path.join(source, '_site')), false);
        }
    }
});

test('Google service-account key records are rejected without confusing ordinary private_key labels', t => {
    const source = fixture(t, { 'data.json': JSON.stringify({ type: 'service_account', private_key: 'fake-' + 'a'.repeat(32) }) });
    assert.throws(() => buildSite({ source, manifest: { files: ['data.json'] } }), /Potential Google service account private key in public file: data.json/);
    fs.writeFileSync(path.join(source, 'data.json'), JSON.stringify({ type: 'help', private_key: 'Documentation label without a credential' }));
    assert.equal(buildSite({ source, manifest: { files: ['data.json'] } }).files.length, 1);
});

test('public analytics and Maps identifiers remain publishable', t => {
    const source = fixture(t, { 'app.js': JSON.stringify({ measurementId: 'G-P9G5CS83DZ', mapsBrowserKey: ['AI', 'za', 'a'.repeat(35)].join('') }) });
    assert.equal(buildSite({ source, manifest: { files: ['app.js'] } }).files.length, 1);
});
