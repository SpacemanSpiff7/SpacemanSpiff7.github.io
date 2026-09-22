# Website security audit — 2026-09-22

## Findings

- Public checks of /.env, /.env.local, /.env.production, /.dev.vars, /.git/config, and /.git/HEAD returned HTTP 404 before changes. Responses were HTML error pages, not secret-file contents.
- The site published the repository root with GitHub Pages and .nojekyll. Worker source, wrangler.toml, CLAUDE.md, and .gitignore returned HTTP 200. The Worker namespace identifier is not an authentication credential.
- The old bachelor-party HTML publicly exposed a house address, Wi-Fi password, itinerary, and contact details. Git history contains two password versions introduced/changed on 2026-03-20 (a78e9c8 and 3cd8952). The event app is retired at the owner's request.
- The event API allowed unauthenticated shared-state reads and writes. CORS and the client administration gesture did not authorize requests. No remote write tests were performed.
- HTTP initially served the homepage without redirecting to HTTPS. Normal page responses lacked browser security headers.
- Pattern scans and manual review found no plausible cloud/API credentials, private keys, service-account credentials, or JWTs in available local Git objects/current text. Public analytics identifiers and placeholder Google Maps keys are not secrets.

## Audit scope and limits

The review covered 569 original current text files and 1,482 locally stored Git blobs across 191 stored commits, including 177 reachable commits through origin/master 41fe8d5. Recognizable-secret checks included the 14 binary blobs. This is a pattern/manual audit, not proof of absence. It does not cover unavailable commits, external repositories, deleted remote branches not present locally, credentials in external systems, or complete historical traffic.

A request for a file is evidence of probing, not evidence it was returned. A 200 response also needs its body checked; some sites serve an HTML fallback. The live checks recorded status, type, size, and content classification without logging sensitive response bodies.

## Changes

- Replaced the event API with a dependency-free HTTP 410 response for all routes and methods, with no-store, nosniff, and noindex headers. Tests assert that no environment/storage binding is accessed. Existing KV data is preserved.
- Disabled the API's workers.dev and preview URLs. Retained its existing custom route so it cannot fall through to an origin.
- Removed the retired event files and homepage project link from the active source tree.
- Added an explicit public-file manifest and build. Publishing excludes backend code, internal docs/scripts, developer files, event content, source maps, and private/backup files. Links to required runtime assets are checked; symlinks and missing files fail the build.
- Added a GitHub Actions Pages workflow with SHA-pinned official actions and separate deployment permissions. It uploads only the generated public artifact.
- The public build also rejects recognizable embedded API/cloud credentials and private keys without printing matched values. This is a narrow release guard, not a complete secret detector.
- Added ignore rules for local environment files, private keys, and development output. Git ignores are only a preventive convenience; they do not protect already committed files.

## Deployment status

- API retirement deployed and verified on 2026-09-22. Version: 6fca3b43-f5ad-4bbf-b519-7ed4d64c27e0. GET /leaderboard and HEAD /shopping return 410 and no-store.
- Cloudflare Always Use HTTPS enabled and verified: HTTP homepage redirects to HTTPS; HTTPS homepage returns 200.
- Cloudflare minimum TLS version raised to 1.2; TLS 1.3 remains enabled. Origin encryption remains Full (encrypted, but not strict certificate validation); GitHub reports no custom-domain origin certificate. A verified origin certificate is required before changing to Full (strict).
- A narrow event-only Cloudflare Block rule is active: ee78a22cb2cb45e0810cde48cbff3186. The event HTML, its JavaScript, and an encoded-path variant return 403; the homepage remains 200.
- Static publication migration and source removal require the security changes to reach master and GitHub Pages publishing source to be set to GitHub Actions. Until then, the old static artifact remains live.
- A scoped Cloudflare custom Block rule is prepared for apex/www sensitive paths and retired event content. Its application is awaiting explicit approval after automatic approval review rejected the broad path scope.

## Retained request evidence

Cloudflare Traffic displayed a 30-day summary of roughly 107.23k requests, 5.25k mitigated, across proxied hostnames. The request list explicitly uses adaptive sampling. Last-24-hour security events included eight sampled paths containing .env and three containing .git; filtering Edge status code = 403 retained all of them. Examples were /@fs/src/.env at 04:02:56 PDT and /.git/HEAD at 02:58:34 PDT, blocked by the Manage AI bots managed rule.

A 10:21:50–54 PDT sweep on September 22 targeted encoded Git paths on apex/www. A representative request was marked Not mitigated / Dynamic; the available Traffic detail did not expose its response code. This does not establish that file content was returned. Requests around 11:35:59 PDT overlap this audit and are not independent evidence of an attacker. Complete historical successful-response searches were unavailable through these filters.

## Required follow-up

1. Change the exposed Wi-Fi password if it is still valid. Removing files does not revoke credentials or remove copies.
2. Existing public Git history still contains the old event information. History rewriting cannot erase third-party copies; coordinate any history rewrite separately rather than force-pushing over contributors' work.
3. Deploy the validated artifact and verify that formerly public internal paths and event files no longer return their content. Check both Cloudflare and the GitHub Pages origin.
4. Review retained Cloudflare request data. Sampling and retention prevent a guarantee that no earlier access occurred.

## Maintaining safe publication

Run node --test scripts/test-site-build.mjs and node scripts/build-site.mjs. Run the Worker regression tests with npm test in worker/. Only intended browser files belong in scripts/build-site-manifest.json. Never upload the repository root, including when bypassing the normal workflow. New frontend JavaScript is public by design and must not contain secrets.

The current CurlBro page has pre-existing missing optional icon references; those warnings do not weaken the publication boundary. Its older bundles were preserved during this focused security change.

## References

- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Pages publishing settings](https://docs.github.com/en/rest/pages/pages)
- [Cloudflare Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)
- [Cloudflare Security Analytics retention and sampling](https://developers.cloudflare.com/waf/analytics/security-analytics/)
