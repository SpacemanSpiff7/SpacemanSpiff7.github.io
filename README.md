# SpacemanSpiff7.github.io

Portfolio and blog at https://simonelongo.com, published through GitHub Pages from the reviewed `_site/` artifact.

## Local preview

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:4173/. `npm run dev` includes drafts; `npm run preview` shows the production version. Both rebuild on changes.

## Blog posts

Paste the post into an AI coding agent and ask it to follow [the publishing guide](docs/blog-publishing.md). Posts live in `content/blog/*.md`; shared settings live in `data/blog.json`. Review locally before publishing.

```bash
npm run post:new -- "Your post title"
npm test
npm run build
```

The archive, homepage previews, RSS, and sitemap are generated automatically. Push approved changes to `master` to deploy.
