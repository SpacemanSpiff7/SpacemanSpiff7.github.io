import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const title = process.argv.slice(2).join(' ').trim();
if (!title) { console.error('Usage: npm run post:new -- "Your post title"'); process.exit(1); }
const slug = title.normalize('NFKD').replace(/[\u0300-\u036f'’]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
if (!slug || ['index', 'page', 'feed'].includes(slug)) { console.error('Choose a more descriptive post title.'); process.exit(1); }
const date = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const filename = `content/blog/${slug}.md`;
const template = fs.readFileSync(path.join(root, 'templates/blog/new-post.md'), 'utf8')
    .replace('{{title}}', JSON.stringify(title)).replace('{{date}}', JSON.stringify(date));
try {
    fs.writeFileSync(path.join(root, filename), template, { flag: 'wx' });
    console.log(`Created ${filename}\nFill in the summary and article, then run npm run dev to preview.`);
} catch (error) {
    console.error(error.code === 'EEXIST' ? `A post already exists at ${filename}; no file was overwritten.` : error.message);
    process.exitCode = 1;
}
