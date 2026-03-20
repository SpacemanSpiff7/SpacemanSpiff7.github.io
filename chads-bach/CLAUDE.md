# Chad's Bachelor Party -- NASCAR Web App

## Overview
NASCAR-themed bachelor party hub at simonelongo.com/chads-bach/.
Single-page static app with Cloudflare Workers backend for shared state.

## Content Source
Read content from the obsidian vault for accuracy:
- ~/Documents/obsidian-notes/projects/bachelor-party.md
  - House details (address, WiFi, rooms, amenities, rules, emergency numbers)
  - Shopping list items (Lebanese breakfast, drinks, snacks)
  - Itinerary (Friday/Saturday/Sunday schedule)
  - Activity details (pickleball courts, ATV info, hot springs)
  - Crew info

## Architecture
- Alpine.js for reactive UI (CDN, no build step)
- Cloudflare Workers + KV for shared state (shopping, leaderboard, fuel)
- API base: https://bach-api.simonelongo.com
- No emoji (inherited from root CLAUDE.md)
- Include /js/analytics.js?v=1 for GA4

## Theme Rules (NASCAR Full Send)
- Fonts: Bungee (headings), Oswald (body)
- Colors: #111 bg, #CC0000 red, #FFD700 yellow, #FF6600 orange
- Checkered flag patterns via repeating-conic-gradient
- Racing stripes (red/yellow/black) on section headers
- Skewed headers: skewX(-3deg) with counter-skew text
- Pit crew language for all section names

## Key Behaviors
- Engine rev sound on first user interaction (Web Audio API, respect mute)
- Timed reveal: RC Car section blurred until 2026-03-21T15:00:00-06:00
- Admin mode: triple-tap STANDINGS header to unlock leaderboard management
- Shopping list polls KV every 30s, falls back to localStorage if offline
- Weather from Open-Meteo API (free, no key)

## Sections (11 total)
hero, starting-grid, standings, race-schedule, pit-stop, garage,
tournament-rules, fuel-stop, weather, photo-pit, cargo
