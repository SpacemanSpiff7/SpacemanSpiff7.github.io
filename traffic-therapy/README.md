# Traffic Therapy

A Rush Hour-style sliding block puzzle game. Slide the blocks to free the target and guide it to the exit.

## Setup

### 1. Configure Personal Claude Code

Add agent teams and token limit to your personal config:

```bash
# Create or edit ~/.claude-personal/settings.json
cat > ~/.claude-personal/settings.json << 'EOF'
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "64000"
  }
}
EOF
```

### 2. Add Shell Alias

```bash
echo 'alias claudep="CLAUDE_CONFIG_DIR=~/.claude-personal claude"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Verify

```bash
cd path/to/your-website/traffic-therapy
claudep
# Inside Claude Code, run:
# /config
# Verify agent teams is enabled and token limit is 64000
```

## Building the Game

### Phase-by-Phase with Agent Teams

Each phase uses an agent team where teammates own specific files and a QA
teammate reviews their work. See CLAUDE.md for the full team structures.

Start Claude Code in the project directory:

```bash
cd path/to/your-website/traffic-therapy
claudep
```

Then prompt each phase. Example for Phase 1:

```
Read CLAUDE.md and SPEC.md. Build Phase 1: Foundation & Theme.

Create an agent team:
- Teammate "markup" builds index.html with the shell, meta tags, font links,
  CSS link, and all script tags in the correct load order from CLAUDE.md.
- Teammate "styles" builds css/style.css with the complete dark spacey theme,
  grid styles, block styles, responsive layout, typography, and animations.
- Teammate "levels" builds js/levels.js with the TT namespace setup and
  1 simple test level so we can verify rendering.

Coordinate through the shared task list. Wait for all teammates to finish.
Do not implement anything yourself, only delegate and synthesize.
```

After the team finishes:

```
Use the tester agent to review the current state of the project after Phase 1.
```

Fix any issues, commit, then move to Phase 2.

### Tips for Agent Teams

- **Use delegate mode** (Shift+Tab) to keep the lead from writing code itself
- **One file per teammate** to avoid edit collisions
- **Be specific in spawn prompts** — teammates don't inherit conversation history,
  they only get CLAUDE.md + whatever you tell the lead to pass them
- **Shift+Up/Down** to cycle through teammates and see their progress
- If a teammate stalls, message it directly or tell the lead to nudge it

### Phase Prompts Cheat Sheet

After Phase 1 is done and committed:

```
Read CLAUDE.md and SPEC.md. Build Phase 2: Core Gameplay.
Create an agent team with teammates "engine" (js/engine.js) and
"storage" (js/storage.js stub). Add a "qa" teammate that reviews
after the others finish. Use delegate mode.
```

```
Build Phase 3: Levels, Solver & Progression.
Team: "solver" (js/solver.js), "levels" (js/levels.js full 5 levels),
"storage" (js/storage.js full). QA must run solver on all levels.
```

```
Build Phase 4: Screens & UI Flow.
Team: "screens" (js/screens.js), "confetti" (js/confetti.js).
QA plays through title → level select → gameplay → win.
```

```
Build Phase 5: Admin Mode & Level Editor.
Team: "editor" (js/editor.js — this is the biggest file, give it
full focus). QA tests editor creates valid JSON and solver works.
```

```
Build Phase 6: Testing & Polish.
Team: "tests" (js/tests.js), "polish" (CSS responsive, touch targets).
QA runs full runTests() suite and reports all failures.
```

## Running Tests

Open index.html in a browser and run in the dev console:

```javascript
runTests()
```

## Adding Levels

1. Open the game in a browser
2. Activate admin mode (find the easter egg on the title screen)
3. Open the Level Editor
4. Design your level, set par, click "Test" to verify solvability
5. Click "Export All Levels as JSON"
6. Paste the JSON into js/levels.js replacing the LEVELS array

## Deployment

Copy the entire `traffic-therapy/` folder to your static web host. No build step.

```
traffic-therapy/
├── index.html
├── css/style.css
└── js/*.js
```