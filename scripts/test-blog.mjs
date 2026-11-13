import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { generateBlog } from './build-blog.mjs';
import { buildSite } from './build-site.mjs';

const config = { title: 'Blog', description: 'Experiments & notes', author: 'Test Author', baseUrl: 'https://example.com',
    postsPerPage: 2, homepagePostCount: 3, defaultImage: '/assets/images/og-image.png' };
function fixture(t, posts = {}, settings = {}) {
    const source = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-publish-test-'));
    t.after(() => fs.rmSync(source, { recursive: true, force: true }));
    const files = {
        'data/blog.json': JSON.stringify({ ...config, ...settings }),
        'sitemap.xml': '<urlset><url><loc>https://example.com/</loc></url></urlset>',
        'index.html': '<h1>Home</h1>', 'css/tokens.css': '', 'css/blog.css': '', 'js/analytics.js': '', 'js/animations.js': '',
        'assets/favicon.svg': '<svg/>', 'assets/images/simone_logo.png': 'fixture', 'assets/images/og-image.png': 'fixture',
        ...Object.fromEntries(Object.entries(posts).map(([name, body]) => [`content/blog/${name}.md`, body]))
    };
    fs.mkdirSync(path.join(source, 'content/blog'), { recursive: true });
    for (const [file, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true });
        fs.writeFileSync(path.join(source, file), content);
    }
    return source;
}
function post(title, options = {}, body = 'Some words, exactly as supplied.\n\n## A heading\n\n`{{ literal_template_syntax }}`') {
    const metadata = { title, date: '2026-11-12', summary: `${title} summary`, draft: false, ...options };
    return `---\n${Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n${body}\n`;
}
const manifest = { blog: true, files: ['index.html', 'sitemap.xml', 'css/tokens.css', 'css/blog.css', 'js/analytics.js', 'js/animations.js',
    'assets/favicon.svg', 'assets/images/simone_logo.png', 'assets/images/og-image.png'] };
function errorChain(error) {
    return [error.message, error.originalError && errorChain(error.originalError), error.cause && errorChain(error.cause)].filter(Boolean).join(' ');
}

test('real Markdown generates readable pages, stable URLs, metadata, RSS, and a usable empty archive', async t => {
    const source = fixture(t, { first: post('A & B: "Quoted"', { slug: 'stable-url' }) });
    const blog = await generateBlog({ source });
    const html = blog.files.get('blog/stable-url/index.html');
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert(html.includes('A &amp; B: &quot;Quoted&quot;'));
    assert(html.includes('<p>Some words, exactly as supplied.</p>'));
    assert(html.includes('{{ literal_template_syntax }}'));
    assert(html.includes('href="/#blog"'));
    assert(html.includes('href="/blog/"'));
    assert(html.includes('https://example.com/blog/stable-url/'));
    assert(blog.files.get('blog/feed.xml').includes('A &amp; B: &quot;Quoted&quot;'));
    const result = buildSite({ source, manifest, blog });
    assert(fs.existsSync(path.join(result.output, 'blog/stable-url/index.html')));
    assert(!fs.existsSync(path.join(result.output, 'content')));
    assert(!fs.existsSync(path.join(result.output, 'data/blog.json')));
    assert(!fs.existsSync(path.join(result.output, 'templates')));
    const empty = await generateBlog({ source: fixture(t) });
    assert(empty.files.get('blog/index.html').includes('Posts are on the way.'));
});

test('drafts are absent from every production surface and available only in an explicit preview', async t => {
    const source = fixture(t, { live: post('Live article'), draft: post('Unpublished draft', { draft: true }) });
    const production = await generateBlog({ source });
    assert(!production.files.has('blog/draft/index.html'));
    for (const content of production.files.values()) assert(!content.includes('Unpublished draft'));
    assert(!production.files.get('sitemap.xml').includes('/blog/draft/'));
    const preview = await generateBlog({ source, includeDrafts: true });
    assert(preview.files.get('blog/draft/index.html').includes('noindex, nofollow'));
    assert(preview.files.get('blog/index.html').includes('Local preview'));
    assert.equal(JSON.parse(preview.files.get('data/blog-posts.json')).posts.length, 2);
});

test('archives, homepage previews, and RSS are newest first, including double-digit pagination', async t => {
    const posts = Object.fromEntries(Array.from({ length: 11 }, (_, index) => [
        `article-${index + 1}`, post(`Article ${String(index + 1).padStart(2, '0')}`, { date: `2026-11-${String(index + 1).padStart(2, '0')}` })
    ]));
    const source = fixture(t, posts, { postsPerPage: 1 });
    const blog = await generateBlog({ source });
    const latest = JSON.parse(blog.files.get('data/blog-posts.json'));
    assert.deepEqual(latest.posts.map(item => item.title), ['Article 11', 'Article 10', 'Article 09']);
    assert.equal(latest.totalPosts, 11);
    assert(blog.files.get('blog/index.html').includes('Article 11'));
    assert(blog.files.get('blog/page/10/index.html').includes('Article 02'));
    assert(blog.files.get('blog/page/11/index.html').includes('Article 01'));
    const rss = blog.files.get('blog/feed.xml');
    assert(rss.indexOf('Article 11') < rss.indexOf('Article 10'));
    assert(rss.indexOf('Article 10') < rss.indexOf('Article 01'));
    buildSite({ source, manifest, blog });
});

test('invalid metadata and duplicate URLs fail the build', async t => {
    for (const [label, options] of [
        ['title', { title: '' }], ['date', { date: '2026-02-30' }], ['summary', { summary: '' }],
        ['draft', { draft: 'false' }], ['slug', { slug: '../outside' }], ['cover', { cover: '/assets/blog/test.png' }],
        ['tags', { tags: 'one-tag' }]
    ]) {
        const source = fixture(t, { invalid: post('Invalid', options) });
        await assert.rejects(generateBlog({ source }), error => errorChain(error).includes(label));
    }
    const source = fixture(t, { one: post('One', { slug: 'same' }), two: post('Two', { slug: 'same' }) });
    await assert.rejects(generateBlog({ source }), error => errorChain(error).includes('duplicate slug'));
});

test('only referenced ordinary blog assets enter the public artifact; missing assets stop publication', async t => {
    const source = fixture(t, { photo: post('Photo', {}, '![Useful alt text](/assets/blog/photo.png)') });
    await assert.rejects(generateBlog({ source }), /Missing public file/);
    fs.mkdirSync(path.join(source, 'assets/blog'));
    fs.writeFileSync(path.join(source, 'assets/blog/photo.png'), 'fixture image');
    fs.writeFileSync(path.join(source, 'assets/blog/unreferenced.png'), 'unused');
    const blog = await generateBlog({ source });
    const result = buildSite({ source, manifest, blog });
    assert(fs.existsSync(path.join(result.output, 'assets/blog/photo.png')));
    assert(!fs.existsSync(path.join(result.output, 'assets/blog/unreferenced.png')));
    fs.unlinkSync(path.join(source, 'assets/blog/photo.png'));
    fs.symlinkSync('../images/og-image.png', path.join(source, 'assets/blog/photo.png'));
    await assert.rejects(generateBlog({ source }), /Symlink/);
});

test('generated output still obeys path and credential guards and cannot replace arbitrary public files', t => {
    const source = fixture(t);
    for (const file of ['../outside.html', 'docs/audit.html', 'blog/app.js', 'index.html']) {
        assert.throws(() => buildSite({ source, manifest, blog: { assets: [], files: new Map([[file, 'text']]) } }), /Forbidden|Invalid blog output/);
    }
    const secret = ['gh', 'p_', 'a'.repeat(36)].join('');
    assert.throws(() => buildSite({ source, manifest, blog: { assets: [], files: new Map([['blog/index.html', secret]]) } }), /Potential GitHub token/);
    assert(!fs.existsSync(path.join(source, '_site')));
});
