import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Eleventy from '@11ty/eleventy';
import matter from 'gray-matter';
import { feedPlugin } from '@11ty/eleventy-plugin-rss';
import { sourceFile } from './public-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = name => fs.readFileSync(path.join(root, 'templates/blog', name), 'utf8');
const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function text(value, label) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`Blog: ${label} must be nonempty text`);
    return value.trim();
}

function isoDate(value, label) {
    const input = value instanceof Date ? value.toISOString().slice(0, 10) : value;
    if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input) ||
        !Number.isFinite(Date.parse(input)) || new Date(input).toISOString().slice(0, 10) !== input) {
        throw new Error(`Blog: ${label} must be a real date in YYYY-MM-DD format`);
    }
    return input;
}

export function loadBlogConfig(source) {
    const config = JSON.parse(fs.readFileSync(sourceFile(source, 'data/blog.json'), 'utf8'));
    for (const key of ['title', 'description', 'author']) config[key] = text(config[key], key);
    const url = new URL(config.baseUrl);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
        throw new Error('Blog: baseUrl must be an HTTPS site origin');
    }
    config.baseUrl = url.origin;
    for (const key of ['postsPerPage', 'homepagePostCount']) {
        if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > 50) throw new Error(`Blog: invalid ${key}`);
    }
    if (!/^\/assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif|gif|svg)$/.test(config.defaultImage)) {
        throw new Error('Blog: defaultImage must be an image under /assets/');
    }
    return config;
}

export async function generateBlog({ source = root, includeDrafts = false } = {}) {
    const config = loadBlogConfig(source);
    // Read an explicit, flat set of Markdown files. Eleventy sees only virtual
    // templates in an empty input folder, never the rest of this repository.
    const directory = path.join(source, 'content/blog');
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const slugs = new Set();
    const files = entries.filter(entry => entry.name.endsWith('.md') && !['README.md', 'AGENTS.md'].includes(entry.name))
        .map(entry => {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(entry.name)) throw new Error(`Blog: invalid post filename ${entry.name}`);
            const sourceText = fs.readFileSync(sourceFile(source, `content/blog/${entry.name}`), 'utf8');
            if (!/^---\r?\n/.test(sourceText)) throw new Error(`Blog: ${entry.name} needs YAML front matter`);
            const parsed = matter(sourceText);
            const data = structuredClone(parsed.data);
            const content = parsed.content;
            const allowed = new Set(['title', 'date', 'summary', 'draft', 'tags', 'slug', 'updated', 'cover', 'coverAlt']);
            for (const key of Object.keys(data)) if (!allowed.has(key)) throw new Error(`Blog: ${entry.name}: unsupported metadata ${key}`);
            data.title = text(data.title, `${entry.name}: title`);
            data.summary = text(data.summary, `${entry.name}: summary`);
            data.isoDate = isoDate(data.date, `${entry.name}: date`);
            if (data.updated !== undefined) data.updated = isoDate(data.updated, `${entry.name}: updated`);
            if (typeof data.draft !== 'boolean') throw new Error(`Blog: ${entry.name}: draft must be true or false`);
            const slug = data.slug ?? entry.name.slice(0, -3);
            if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || ['page', 'feed', 'index'].includes(slug)) {
                throw new Error(`Blog: invalid slug for ${entry.name}`);
            }
            if (slugs.has(slug)) throw new Error(`Blog: duplicate slug ${slug}`);
            slugs.add(slug);
            if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string' || !tag.trim()))) {
                throw new Error(`Blog: ${entry.name}: tags must be a list of text labels`);
            }
            if (data.cover !== undefined && (!/^\/assets\/blog\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp|avif|gif|svg)$/.test(data.cover) || typeof data.coverAlt !== 'string' || !data.coverAlt.trim())) {
                throw new Error(`Blog: ${entry.name}: cover needs an /assets/blog/ image and coverAlt`);
            }
            data.tags ??= [];
            data.layout = 'post.njk';
            data.templateEngineOverride = 'md';
            data.permalink = `/blog/${slug}/`;
            data.isBlogPost = true;
            data.dateLabel = dateFormat.format(new Date(data.isoDate));
            data.minutes = Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 220));
            data.articleSchema = {
                '@context': 'https://schema.org', '@type': 'BlogPosting', headline: data.title,
                description: data.summary, datePublished: data.isoDate, dateModified: data.updated || data.isoDate,
                author: { '@type': 'Person', name: config.author, url: `${config.baseUrl}/` },
                url: `${config.baseUrl}${data.permalink}`, image: `${config.baseUrl}${data.cover || config.defaultImage}`
            };
            return { name: entry.name, content, data };
        });
    const visibleFiles = files.filter(file => includeDrafts || !file.data.draft);
    const input = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-blog-'));
    try {
        const generator = new Eleventy(input, path.join(input, 'output'), {
            configPath: false,
            quietMode: true,
            config(eleventy) {
                eleventy.setTemplateFormats(['md', 'njk']);
                eleventy.amendLibrary('md', markdown => markdown.set({ html: false, typographer: false }));
                eleventy.addGlobalData('blog', config);
                eleventy.addGlobalData('previewDrafts', includeDrafts);
                eleventy.addFilter('jsonScript', value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('&', '\\u0026'));
                eleventy.addCollection('posts', api => api.getAll().filter(item => item.data.isBlogPost)
                    .sort((a, b) => b.data.isoDate.localeCompare(a.data.isoDate) || a.url.localeCompare(b.url)));
                // RSS v2 reverses the collection internally.
                eleventy.addCollection('feedPosts', api => api.getAll().filter(item => item.data.isBlogPost)
                    .sort((a, b) => a.data.isoDate.localeCompare(b.data.isoDate) || b.url.localeCompare(a.url)));
                eleventy.addTemplate('_includes/base.njk', template('base.njk'));
                eleventy.addTemplate('_includes/post.njk', template('post.njk'));
                eleventy.addTemplate('archive.njk', template('archive.njk'), {
                    layout: 'base.njk', title: config.title, summary: config.description,
                    pagination: { data: 'collections.posts', size: config.postsPerPage, alias: 'posts', generatePageOnEmptyData: true },
                    permalink: data => data.pagination.pageNumber === 0 ? '/blog/' : `/blog/page/${data.pagination.pageNumber + 1}/`
                });
                for (const file of visibleFiles) eleventy.addTemplate(file.name, file.content, file.data);
                eleventy.addPlugin(feedPlugin, {
                    type: 'rss', outputPath: '/blog/feed.xml',
                    collection: { name: 'feedPosts', limit: 0 },
                    metadata: { language: 'en', title: `${config.author} — ${config.title}`, subtitle: config.description,
                        base: config.baseUrl, author: { name: config.author } }
                });
            }
        });
        const rendered = await generator.toJSON();
        const output = new Map();
        for (const page of rendered) {
            const filename = page.url.endsWith('/') ? `${page.url.slice(1)}index.html` : page.url.slice(1);
            if (!/^blog\/(?:index\.html|feed\.xml|[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html|page\/(?:[2-9]|[1-9]\d+)\/index\.html)$/.test(filename)) {
                throw new Error(`Blog: unexpected output path ${filename}`);
            }
            if (output.has(filename)) throw new Error(`Blog: duplicate output path ${filename}`);
            output.set(filename, page.content);
        }
        const sorted = visibleFiles.map(({ data }) => ({ title: data.title, summary: data.summary, date: data.isoDate,
            dateLabel: data.dateLabel, minutes: data.minutes, tags: data.tags, url: data.permalink, draft: data.draft }))
            .sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url));
        output.set('data/blog-posts.json', JSON.stringify({ title: config.title, description: config.description,
            posts: sorted.slice(0, config.homepagePostCount), totalPosts: sorted.length, previewDrafts: includeDrafts }, null, 2) + '\n');
        const urls = [...output.keys()].filter(name => name.endsWith('index.html'))
            .map(name => `  <url><loc>${config.baseUrl}/${name.replace(/index\.html$/, '')}</loc></url>`).join('\n');
        const sitemap = fs.readFileSync(sourceFile(source, 'sitemap.xml'), 'utf8');
        if (!sitemap.includes('</urlset>')) throw new Error('Blog: invalid source sitemap');
        output.set('sitemap.xml', sitemap.replace('</urlset>', `${urls}\n</urlset>`));
        const assets = new Set();
        for (const [name, content] of output) {
            if (!name.endsWith('.html')) continue;
            for (const match of content.matchAll(/\b(?:src|href)="(\/assets\/blog\/[^"?#]+)(?:[?#][^"]*)?"/g)) {
                const filename = decodeURIComponent(match[1].slice(1));
                if (!/\.(?:png|jpe?g|webp|avif|gif|svg|pdf)$/i.test(filename)) throw new Error(`Blog: unsupported asset ${filename}`);
                sourceFile(source, filename);
                assets.add(filename);
            }
        }
        return { files: output, assets: [...assets], posts: sorted };
    } finally {
        fs.rmSync(input, { recursive: true, force: true });
    }
}
