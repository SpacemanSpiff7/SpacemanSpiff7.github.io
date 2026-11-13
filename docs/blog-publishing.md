# Adding and publishing blog posts

The normal workflow is to paste a post into an AI coding agent. The agent formats the supplied text as a Markdown source file, adds metadata, builds the site, and gives Simone a local preview before publishing. Routine posts require content changes only.

## A prompt to reuse

> Add the following as a blog post. Follow docs/blog-publishing.md. Preserve my wording, use the heading as the title, and create a short summary for the archive. Show me a local preview before pushing or publishing. Here is the post: …

For a revision, give the existing title or URL and describe the change. The agent should edit the existing source and preserve the published URL.

## Agent workflow

1. Check the working tree and read the supplied post. Preserve the user's title, prose, punctuation, and section order. Move its opening H1 into `title` metadata so the generated article has a single title. Generate a short factual summary and a few topic labels; use the date requested by the user, or today's local date when none is given. Avoid inventing cover art, claims, links, or publication history.
2. Add `content/blog/<slug>.md`, or update the existing post. Slugs use lowercase letters, digits, and hyphens. Check for an existing post before creating a duplicate. For new material, start with `draft: true` while preparing the preview. Use `npm run post:new -- "Post title"` for a template, or write the same front matter directly. This helper refuses to overwrite existing files.
3. Put any supplied images in `assets/blog/<slug>/` and use root-relative URLs such as `/assets/blog/<slug>/screen.webp`. Give images useful alt text. Plain Markdown works; raw HTML is displayed as text and Liquid/Nunjucks template syntax in posts is not evaluated.
4. Install dependencies with `npm ci` when needed. Run `npm run dev` for a local preview including drafts. Give the user both the archive URL and the article URL. Read the rendered post against the supplied text and check the title, date, summary, images, mobile layout, and return links. Keep the preview running while the user reviews it.
5. Complete the automated checks in `package.json` with `npm test`. The blog checks cover real generation, draft exclusion, metadata errors, pagination, RSS ordering, assets, publication boundaries, and homepage history behavior. For a content-only edit, existing tests plus the production build are sufficient. For homepage interaction changes also run the motion checks listed in `CLAUDE.md`.
6. Publish once the user approves the preview or explicitly requests publication. Set approved posts to `draft: false`, run `npm run build`, and inspect the generated article and archive. Review the diff, including unrelated pending work. Commit the intended changes and push to the remote default branch, currently `master`. Watch the Pages workflow and verify the live article. If the user asks for preview only, stop at the preview and leave remote publication pending.

An approved post can have `draft: false` locally while publication is pending: it becomes public only after a push and a successful deployment. Do not treat the front-matter flag as authorization to publish.

## Content schema

```markdown
---
title: "A post title"
date: "2026-11-12"
summary: "A short description for the archive, homepage, and sharing metadata."
draft: true
tags: ["Apps", "AI"]
---

The introduction starts here. The template displays the title automatically.

## A section heading

Continue with standard Markdown paragraphs, lists, links, and images.
```

| Field | Meaning |
| --- | --- |
| `title` | Required nonempty article title. Quote it when it contains punctuation. |
| `date` | Required real calendar date in quoted `YYYY-MM-DD` form. Used for display and sorting, not scheduling. |
| `summary` | Required short plain-text description. |
| `draft` | Required boolean. `true` excludes the post entirely from production output. |
| `tags` | Optional list of topic labels. |
| `slug` | Optional explicit URL segment. Defaults to the filename without `.md`. Keep published slugs stable. |
| `updated` | Optional quoted `YYYY-MM-DD` revision date for article metadata. |
| `cover` | Optional image URL beginning `/assets/blog/`. |
| `coverAlt` | Required descriptive text when `cover` is supplied. |

Changing a title preserves its URL. To rename a published source file, retain the old URL in `slug`. Drafts are omitted from the archive, homepage, RSS, sitemap, and article files in production. Draft source committed to a public repository remains visible on GitHub. The local draft preview displays a banner and `noindex` metadata.

## Settings and files

- `data/blog.json` defines the blog title, description, author, canonical origin, default sharing image, posts per archive page, and homepage preview count.
- `content/blog/*.md` is the canonical source of every post. The folder is flat. `AGENTS.md` and `README.md` are excluded from post discovery.
- `templates/blog/` owns shared layouts and the new-post template. Routine posts do not need layout edits.
- `scripts/build-blog.mjs` uses Eleventy and its official RSS plugin at build time. Only the explicitly loaded post files and templates are processed.
- `scripts/build-site.mjs` validates and combines generated output with the reviewed public manifest. Only referenced blog images and attachments are copied. Raw Markdown, agent instructions, templates, config source, and build dependencies are not deployed.
- `_site/blog/` contains generated articles, archives, and `feed.xml`. `_site/data/blog-posts.json` feeds homepage previews. The generated sitemap extends the existing site sitemap. Edit sources rather than `_site/`.

Every new post automatically updates the archive, homepage previews, RSS feed, and sitemap. There is no post list to update manually, and adding a post or referenced blog image does not require editing the public manifest.

## Preview and publishing

Use Node 22 or newer. On a fresh checkout:

```bash
npm ci
npm run dev
```

The preview server binds only to `127.0.0.1`, uses port 4173 by default, and rebuilds/reloads when source files change. Set `PORT=4174` to use another port. `npm run dev` includes drafts; `npm run preview` serves a production build excluding drafts. Both serve the validated `_site/` artifact. Stop the server with Ctrl-C after the user's review ends.

Useful URLs:

- `http://127.0.0.1:4173/` — homepage
- `http://127.0.0.1:4173/#blog` — homepage Blog section
- `http://127.0.0.1:4173/blog/` — archive
- `http://127.0.0.1:4173/blog/<slug>/` — article

Archive pages show newest posts first, then paginate using `postsPerPage`. The homepage's Blog navigation link scrolls to its `#blog` section. The section's “View all posts” link opens `/blog/` in the same tab, and post titles open individual articles. Article and archive headers/footers provide explicit links to `/#blog`, and articles link back to `/blog/`. Homepage history restoration waits for the dynamically loaded sections so direct return links and browser Back work with the custom scroll container. Keep the homepage Blog nav group free of an `href` override so it retains section navigation.

Blog pages share the homepage logo proportions (40px high with intrinsic width) and starfield renderer. `js/animations.js` runs with only the starfield canvas on blog pages, reuses saved appearance preferences, pauses while hidden, and renders still stars for reduced motion. Keep the starfield behind the text and preserve normal article scrolling.

Production publication is the existing GitHub Actions Pages workflow. It installs the locked dependencies, tests the build, generates a fresh production artifact with drafts excluded, and uploads only `_site/`. It runs on pushes to `master`. GitHub pull requests run checks without deploying previews. Future-dated posts are not automatically scheduled; `draft` is the publication switch.

Build errors name missing metadata, invalid dates, duplicate slugs, invalid output paths, or missing local assets. Fix the source and rebuild. A failed workflow does not replace the live Pages deployment.
