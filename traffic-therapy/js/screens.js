// screens.js -- Screen manager: title, level select, gameplay HUD, win overlay, transitions
// Depends on: engine.js, storage.js, levels.js, confetti.js
window.TT = window.TT || {};

(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Admin mode flag (not persisted, resets on refresh)
  // ---------------------------------------------------------------------------
  TT.adminMode = false;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  TT.screens = {
    showTitle,
    showLevelSelect,
    showGame,
    showWin
  };

  // ---------------------------------------------------------------------------
  // Helper: get game root
  // ---------------------------------------------------------------------------
  function getRoot() {
    return document.getElementById('game-root');
  }

  // ---------------------------------------------------------------------------
  // Helper: clear game root and append a new screen with enter animation
  // ---------------------------------------------------------------------------
  function transitionTo(screenEl) {
    const root = getRoot();
    root.innerHTML = '';
    screenEl.classList.add('screen-enter');
    root.appendChild(screenEl);
  }

  // ---------------------------------------------------------------------------
  // Helper: create star display elements
  // Returns an array of span elements (4 total) with .star and .star--earned
  // ---------------------------------------------------------------------------
  function createStars(earned, containerClass) {
    const container = document.createElement('div');
    container.className = containerClass;
    for (let i = 0; i < 4; i++) {
      const star = document.createElement('span');
      star.className = i < earned ? 'star star--earned' : 'star';
      star.textContent = '\u2605'; // solid star character
      container.appendChild(star);
    }
    return container;
  }

  // ---------------------------------------------------------------------------
  // showTitle -- Title screen with "Traffic Therapy" and Start button
  // ---------------------------------------------------------------------------
  function showTitle() {
    const screen = document.createElement('div');
    screen.className = 'screen screen--title';

    // Title with easter egg
    const title = document.createElement('h1');
    title.className = 'title';
    title.textContent = 'Traffic Therapy';

    const easterEgg = document.createElement('span');
    easterEgg.className = 'title-easter-egg';
    easterEgg.addEventListener('click', (e) => {
      e.stopPropagation();
      const answer = prompt('are you god?');
      if (answer && answer.trim().toLowerCase() === 'ya') {
        TT.adminMode = true;
        showAdminBadge();
      }
    });
    title.appendChild(easterEgg);

    screen.appendChild(title);

    // Subtitle / instructions
    const subtitle = document.createElement('p');
    subtitle.className = 'title-subtitle';
    subtitle.textContent = 'Slide the orange block to the exit';
    screen.appendChild(subtitle);

    // Start button
    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn--primary';
    startBtn.textContent = 'Start';
    startBtn.addEventListener('click', () => showLevelSelect());
    screen.appendChild(startBtn);

    const contact = document.createElement('a');
    contact.className = 'title-contact';
    contact.href = 'mailto:contact@simonelongo.com';
    contact.textContent = 'contact@simonelongo.com';
    screen.appendChild(contact);

    transitionTo(screen);

    // Show admin badge if already activated (e.g. navigating back to title)
    if (TT.adminMode) {
      showAdminBadge();
    }
  }

  // ---------------------------------------------------------------------------
  // showAdminBadge -- Show the ADMIN indicator in the top-right corner
  // ---------------------------------------------------------------------------
  function showAdminBadge() {
    // Avoid duplicates
    if (document.querySelector('.admin-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'admin-badge';
    badge.textContent = 'ADMIN';
    document.body.appendChild(badge);
  }

  // ---------------------------------------------------------------------------
  // showLevelSelect -- Level select grid with unlocked levels and star ratings
  // ---------------------------------------------------------------------------
  function showLevelSelect() {
    const screen = document.createElement('div');
    screen.className = 'screen screen--levels';

    // Heading
    const heading = document.createElement('h2');
    heading.className = 'screen-heading';
    heading.textContent = 'Select Level';
    screen.appendChild(heading);

    // Hint text
    const hint = document.createElement('p');
    hint.className = 'levels-hint';
    hint.textContent = 'Tap a level to play';
    screen.appendChild(hint);

    // Levels grid
    const grid = document.createElement('div');
    grid.className = 'levels-grid';

    const progress = TT.storage.load();
    const unlockedLevel = progress.unlockedLevel;

    TT.LEVELS.forEach((level) => {
      const isUnlocked = TT.adminMode || level.id <= unlockedLevel;
      if (!isUnlocked) return; // Locked levels are hidden, not shown

      const card = document.createElement('div');
      card.className = 'level-card';

      const number = document.createElement('div');
      number.className = 'level-card__number';
      number.textContent = level.id;
      card.appendChild(number);

      // Star display
      const bestStars = TT.storage.getStars(level.id);
      const starsEl = createStars(bestStars, 'level-card__stars');
      card.appendChild(starsEl);

      card.addEventListener('click', () => showGame(level.id));
      grid.appendChild(card);
    });

    screen.appendChild(grid);

    // Level Editor button (admin mode only)
    if (TT.adminMode && TT.editor && TT.editor.show) {
      const editorBtn = document.createElement('button');
      editorBtn.className = 'btn btn--primary';
      editorBtn.textContent = 'Level Editor';
      editorBtn.addEventListener('click', () => TT.editor.show());
      screen.appendChild(editorBtn);
    }

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'btn';
    backBtn.textContent = 'Back';
    backBtn.addEventListener('click', () => showTitle());
    screen.appendChild(backBtn);

    transitionTo(screen);
  }

  // ---------------------------------------------------------------------------
  // showGame -- Start a level: set up win callback, then call engine.init()
  // ---------------------------------------------------------------------------
  function showGame(levelId) {
    const levelData = TT.LEVELS.find(l => l.id === levelId);
    if (!levelData) return;

    // Set the win callback before initializing the engine
    TT.engine.onWin = (data) => {
      showWin(data);
    };

    // engine.init() clears game-root and builds the gameplay DOM
    TT.engine.init(levelData);
  }

  // ---------------------------------------------------------------------------
  // showWin -- Win overlay on top of gameplay screen
  // ---------------------------------------------------------------------------
  function showWin(data) {
    // data: { levelId, moves, par }
    const starRating = TT.solver.getStarRating(data.moves, data.par);

    // Save progress (never downgrades -- storage handles that)
    TT.storage.completeLevel(data.levelId, starRating);

    // Trigger confetti
    if (TT.confetti && TT.confetti.start) {
      TT.confetti.start();
    }

    // Build win overlay
    const overlay = document.createElement('div');
    overlay.className = 'screen screen--win screen-enter';

    // Banner
    const banner = document.createElement('h2');
    banner.className = 'win-banner';
    banner.textContent = 'Level Complete!';
    overlay.appendChild(banner);

    // Details container
    const details = document.createElement('div');
    details.className = 'win-details';

    // Star display
    const starsEl = createStars(starRating, 'win-stars');
    details.appendChild(starsEl);

    // Move count
    const movesEl = document.createElement('div');
    movesEl.className = 'win-moves';
    movesEl.textContent = `Level ${data.levelId} completed in ${data.moves} moves`;
    details.appendChild(movesEl);

    overlay.appendChild(details);

    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'win-buttons';

    // Next Level button (hidden if last level)
    const currentIndex = TT.LEVELS.findIndex(l => l.id === data.levelId);
    const hasNext = currentIndex >= 0 && currentIndex < TT.LEVELS.length - 1;

    if (hasNext) {
      const nextLevel = TT.LEVELS[currentIndex + 1];
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn--primary';
      nextBtn.textContent = 'Next Level';
      nextBtn.addEventListener('click', () => {
        removeWinOverlay(overlay);
        showGame(nextLevel.id);
      });
      buttons.appendChild(nextBtn);
    }

    // Menu button
    const menuBtn = document.createElement('button');
    menuBtn.className = 'btn';
    menuBtn.textContent = 'Menu';
    menuBtn.addEventListener('click', () => {
      removeWinOverlay(overlay);
      showLevelSelect();
    });
    buttons.appendChild(menuBtn);

    overlay.appendChild(buttons);

    // Append overlay on top of gameplay (do NOT clear game root)
    getRoot().appendChild(overlay);
  }

  // ---------------------------------------------------------------------------
  // removeWinOverlay -- Remove the win overlay from the DOM
  // ---------------------------------------------------------------------------
  function removeWinOverlay(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // ---------------------------------------------------------------------------
  // DOMContentLoaded -- Start the game with the title screen
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    showTitle();
  });

})();
