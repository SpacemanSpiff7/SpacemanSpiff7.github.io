# Bach Party Cloudflare Worker

## Overview
Simple KV-backed API for shared state across 5 phones.
Uses Hono framework for routing + CORS.

## Deploy
npx wrangler deploy

## KV Namespace
Name: BACH_PARTY
Binding in wrangler.toml: BACH_PARTY

## Endpoints
All return/accept JSON. CORS allows simonelongo.com + localhost:8000.

GET  /shopping     -> { "pita-bread": true, "hummus": false, ... }
POST /shopping     -> merge body into existing state

GET  /leaderboard  -> { "events": { "putting": { "name": "...", "active": true, "results": {...} } } }
POST /leaderboard  -> { "action": "update|add|remove", "eventId": "...", ... }

GET  /fuel         -> { "chad": "diesel", "simone": "nitro", ... }
POST /fuel         -> { "player": "chad", "type": "diesel" }

## KV Keys
- shopping: shopping list checkbox state
- leaderboard: event results + active flags
- fuel: player fuel type selections
