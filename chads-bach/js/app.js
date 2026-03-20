/* ============================================
   CHAD'S BACHELOR PARTY -- APP.JS
   Alpine.js Components + API Layer
   ============================================ */

const API = 'https://bach-api.simonelongo.com';
const api = {
  get: (path) => fetch(`${API}${path}`).then(r => r.json()).catch(() => null),
  post: (path, data) => fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()).catch(() => null)
};

const DRIVERS = [
  { id: 'chad', name: 'Chad', number: '#01', role: 'The Groom / Crew Chief' },
  { id: 'simone', name: 'Simone', number: '#02', role: 'Pit Boss' },
  { id: 'ct', name: 'CT', number: '#03', role: 'Crew' },
  { id: 'john', name: 'John', number: '#04', role: 'Crew' },
  { id: 'chris', name: 'Chris', number: '#05', role: 'Crew' }
];

const PLAYER_IDS = DRIVERS.map(d => d.id);

const PLAYER_LABELS = {
  chad: 'Chad', simone: 'Simone', ct: 'CT', john: 'John', chris: 'Chris'
};

const REVEAL_TARGET = new Date('2026-03-21T15:00:00-06:00').getTime();

/* --- SHOPPING LIST DATA --- */
const SHOPPING_ITEMS = [
  { cat: 'Breakfast (Lebanese/Mediterranean)', items: [
    { id: 'pita-bread', label: 'Pita bread or flatbread' },
    { id: 'zaatar', label: 'Za\'atar spice blend' },
    { id: 'olive-oil', label: 'Good olive oil' },
    { id: 'labneh', label: 'Labneh (or full-fat Greek yogurt)' },
    { id: 'feta', label: 'Feta cheese' },
    { id: 'halloumi', label: 'Halloumi cheese' },
    { id: 'cucumbers', label: 'Cucumbers' },
    { id: 'tomatoes', label: 'Tomatoes' },
    { id: 'olives', label: 'Olives (Kalamata)' },
    { id: 'herbs', label: 'Fresh mint and/or parsley' },
    { id: 'hummus', label: 'Hummus' },
    { id: 'eggs', label: 'Eggs' },
    { id: 'canned-tomatoes', label: 'Canned diced tomatoes + garlic + cumin + paprika' },
    { id: 'honey', label: 'Honey' },
    { id: 'lemons', label: 'Lemons' }
  ]},
  { cat: 'Drinks', items: [
    { id: 'beer', label: 'Beer (a few 6-packs)' },
    { id: 'seltzers', label: 'Seltzers' },
    { id: 'tequila', label: '1 bottle tequila + limes' },
    { id: 'coffee-creamer', label: 'Coffee creamer' },
    { id: 'water-gatorade', label: 'Water / Gatorade' },
    { id: 'sparkling-water', label: 'Sparkling water + juice (for Chad)' }
  ]},
  { cat: 'Snacks & Basics', items: [
    { id: 'chips-dip', label: 'Chips / dip' },
    { id: 'blunt-wraps', label: 'Blunt wraps' },
    { id: 'pickleball-gear', label: 'Pickleball paddles + balls' },
    { id: 'paper-towels', label: 'Paper towels / napkins' },
    { id: 'trash-bags', label: 'Trash bags' },
    { id: 'ice', label: 'Ice' }
  ]}
];

/* --- HEADS UP WORD LISTS --- */
const HEADSUP_WORDS = {
  'Bachelor Party': [
    'wedding', 'best man', 'groom', 'bachelor', 'engaged', 'ring', 'tuxedo',
    'honeymoon', 'vows', 'first dance', 'rehearsal dinner', 'bridesmaid', 'toast',
    'registry', 'cold feet', 'prenup', 'aisle', 'bouquet toss', 'plus one', 'open bar'
  ],
  'NASCAR': [
    'pit stop', 'checkered flag', 'pole position', 'draft', 'caution flag', 'burnout',
    'pace car', 'Victory Lane', 'restrictor plate', 'pit crew', 'crew chief', 'Daytona',
    'Talladega', 'Dale Earnhardt', 'Jeff Gordon', 'Kyle Busch', 'stock car', 'green flag',
    'black flag', 'lap leader'
  ],
  'Utah / The Trip': [
    'Hurricane', 'Zion', 'hot springs', 'ATV', 'red rocks', 'St. George', 'putting green',
    'rooftop', 'jacuzzi', 'Airbnb', 'road trip', 'desert', 'cornhole', 'sunset',
    'stargazing', 'tequila', 'blunt', 'custom lighters', 'RC cars', 'garage'
  ],
  'Random': [
    'Simone', 'Chad', 'CT', 'John', 'Chris', 'pickleball', 'Lebanese food', 'hummus',
    'halloumi', 'manakish', 'poker', 'full house', 'all in', 'bluff', 'pit boss',
    'crew chief', 'gasoline', 'diesel', 'nitro', 'water'
  ]
};


/* =====================
   ALPINE COMPONENTS
   ===================== */

// Shared timed reveal store -- single interval for all 3 reveal spots
document.addEventListener('alpine:init', () => {
  Alpine.store('reveal', {
    revealed: Date.now() >= REVEAL_TARGET,
    countdown: '',

    init() {
      if (this.revealed) return;
      this._update();
      this._interval = setInterval(() => {
        this._update();
        if (Date.now() >= REVEAL_TARGET) {
          this.revealed = true;
          clearInterval(this._interval);
        }
      }, 1000);
    },

    _update() {
      const diff = REVEAL_TARGET - Date.now();
      if (diff <= 0) { this.countdown = 'REVEALED'; return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.countdown = `${h}h ${m}m ${s}s`;
    }
  });
});

// Safe JSON parse helper
function safeParse(str, fallback) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}

// Root app -- sound control
function app() {
  return {
    muted: localStorage.getItem('bach-muted') === 'true',
    soundPlayed: false,

    toggleMute() {
      this.muted = !this.muted;
      localStorage.setItem('bach-muted', this.muted);
    },

    playEngineRev() {
      if (this.muted || this.soundPlayed) return;
      this.soundPlayed = true;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.6);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.8);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.0);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.3);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.8);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.0);
      } catch (e) {
        // Web Audio not supported -- fail silently
      }
    }
  };
}

// Navigation
function nav() {
  return {
    activeSection: 'hero',
    menuOpen: false,
    sections: [
      { id: 'hero', label: 'TOP' },
      { id: 'starting-grid', label: 'GRID' },
      { id: 'standings', label: 'STANDINGS' },
      { id: 'race-schedule', label: 'SCHEDULE' },
      { id: 'pit-stop', label: 'HOME' },
      { id: 'garage', label: 'GARAGE' },
      { id: 'tournament-rules', label: 'RULES' },
      { id: 'fuel-stop', label: 'SHOP' },
      { id: 'weather', label: 'WEATHER' },
      { id: 'photo-pit', label: 'PHOTOS' },
      { id: 'cargo', label: 'CARGO' }
    ],

    init() {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeSection = entry.target.id;
          }
        }
      }, { threshold: 0.3, rootMargin: `-${56}px 0px 0px 0px` });

      this.sections.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) observer.observe(el);
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.menuOpen) this.closeMenu();
      });
    },

    toggleMenu() {
      this.menuOpen ? this.closeMenu() : this.openMenu();
    },

    openMenu() {
      this.menuOpen = true;
      document.body.style.overflow = 'hidden';
    },

    closeMenu() {
      this.menuOpen = false;
      document.body.style.overflow = '';
    },

    scrollTo(id) {
      this.closeMenu();
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };
}

// Fuel Picker
function fuelPicker() {
  return {
    drivers: DRIVERS,
    fuelSelections: {},
    pickerOpen: false,
    pickerPlayer: null,

    async init() {
      const data = await api.get('/fuel');
      if (data) this.fuelSelections = data;
      else {
        const stored = localStorage.getItem('bach-fuel');
        if (stored) this.fuelSelections = safeParse(stored, {});
      }
    },

    openPicker(playerId) {
      this.pickerPlayer = playerId;
      this.pickerOpen = true;
    },

    async selectFuel(type) {
      if (!this.pickerPlayer) return;
      this.fuelSelections[this.pickerPlayer] = type;
      this.pickerOpen = false;
      localStorage.setItem('bach-fuel', JSON.stringify(this.fuelSelections));
      await api.post('/fuel', { player: this.pickerPlayer, type });
      this.pickerPlayer = null;
    }
  };
}

// Leaderboard
function leaderboard() {
  return {
    events: {},
    adminOpen: false,
    tapCount: 0,
    tapTimer: null,
    expandedDriver: null,
    newEventName: '',
    playerIds: PLAYER_IDS,

    get standings() {
      const totals = {};
      for (const pid of PLAYER_IDS) {
        totals[pid] = { name: pid, label: PLAYER_LABELS[pid], total: 0 };
      }
      for (const [, evt] of Object.entries(this.events)) {
        if (!evt.active) continue;
        for (const [pid, pts] of Object.entries(evt.results || {})) {
          if (totals[pid]) totals[pid].total += pts;
        }
      }
      return Object.values(totals).sort((a, b) => b.total - a.total);
    },

    async init() {
      const data = await api.get('/leaderboard');
      if (data && data.events) this.events = data.events;
      else {
        const stored = localStorage.getItem('bach-leaderboard');
        if (stored) {
          const parsed = safeParse(stored, {});
          if (parsed.events) this.events = parsed.events;
        }
      }
    },

    handleHeaderTap() {
      this.tapCount++;
      clearTimeout(this.tapTimer);
      if (this.tapCount >= 3) {
        this.adminOpen = !this.adminOpen;
        this.tapCount = 0;
        return;
      }
      this.tapTimer = setTimeout(() => { this.tapCount = 0; }, 500);
    },

    ordinal(n) {
      const s = ['', '1st', '2nd', '3rd', '4th', '5th'];
      return s[n] || n + 'th';
    },

    async addEvent() {
      if (!this.newEventName.trim()) return;
      const id = this.newEventName.trim().toLowerCase().replace(/\s+/g, '-');
      await api.post('/leaderboard', { action: 'add', eventId: id, name: this.newEventName.trim() });
      this.events[id] = { name: this.newEventName.trim(), active: true, results: {} };
      this.newEventName = '';
      this.saveLocal();
    },

    async setResult(eventId, playerId, points) {
      if (!playerId || !this.events[eventId]) return;
      // Clear this player from any other position in the same event
      const results = this.events[eventId].results;
      for (const [pid, pts] of Object.entries(results)) {
        if (pid === playerId && pts !== points) delete results[pid];
      }
      results[playerId] = points;
      await api.post('/leaderboard', { action: 'update', eventId, results });
      this.saveLocal();
    },

    async removeEvent(eventId) {
      delete this.events[eventId];
      await api.post('/leaderboard', { action: 'remove', eventId });
      this.saveLocal();
    },

    saveLocal() {
      localStorage.setItem('bach-leaderboard', JSON.stringify({ events: this.events }));
    }
  };
}

// Shopping List
function shoppingList() {
  return {
    items: {},
    customItems: [],
    newItemText: '',
    _pollInterval: null,
    _writePending: false,
    categories: SHOPPING_ITEMS.map(c => ({
      name: c.cat,
      items: c.items
    })),

    async init() {
      // Load predefined items from KV, fall back to localStorage
      const data = await api.get('/shopping');
      if (data && Object.keys(data).length > 0) {
        this.items = data;
      } else {
        const stored = localStorage.getItem('bach-shopping');
        if (stored) this.items = safeParse(stored, {});
      }

      // Load custom items
      const custom = await api.get('/shopping-custom');
      if (custom && custom.items) {
        this.customItems = custom.items;
      } else {
        const storedCustom = localStorage.getItem('bach-shopping-custom');
        if (storedCustom) this.customItems = safeParse(storedCustom, []);
      }

      // Poll every 60s, pause when tab is backgrounded
      this._startPoll();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this._stopPoll();
        } else {
          this._poll();
          this._startPoll();
        }
      });
    },

    _startPoll() {
      this._stopPoll();
      this._pollInterval = setInterval(() => this._poll(), 60000);
    },

    _stopPoll() {
      if (this._pollInterval) {
        clearInterval(this._pollInterval);
        this._pollInterval = null;
      }
    },

    async _poll() {
      if (this._writePending) return;
      const fresh = await api.get('/shopping');
      if (fresh) this.items = fresh;
      const freshCustom = await api.get('/shopping-custom');
      if (freshCustom && freshCustom.items) this.customItems = freshCustom.items;
    },

    async toggle(id) {
      this.items[id] = !this.items[id];
      localStorage.setItem('bach-shopping', JSON.stringify(this.items));
      this._writePending = true;
      await api.post('/shopping', { [id]: this.items[id] });
      this._writePending = false;
    },

    async addItem() {
      const label = this.newItemText.trim().replace(/<[^>]*>/g, '').slice(0, 60);
      if (!label) return;
      const item = { id: `custom-${Date.now()}`, label, checked: false };
      this.customItems.push(item);
      this.newItemText = '';
      this._saveCustomLocal();
      this._writePending = true;
      await api.post('/shopping-custom', { action: 'add', label });
      this._writePending = false;
    },

    async toggleCustom(id) {
      const item = this.customItems.find(i => i.id === id);
      if (item) item.checked = !item.checked;
      this._saveCustomLocal();
      this._writePending = true;
      await api.post('/shopping-custom', { action: 'toggle', id });
      this._writePending = false;
    },

    async removeCustom(id) {
      this.customItems = this.customItems.filter(i => i.id !== id);
      this._saveCustomLocal();
      this._writePending = true;
      await api.post('/shopping-custom', { action: 'remove', id });
      this._writePending = false;
    },

    _saveCustomLocal() {
      localStorage.setItem('bach-shopping-custom', JSON.stringify(this.customItems));
    },

    async clearAll() {
      const cleared = {};
      for (const cat of SHOPPING_ITEMS) {
        for (const item of cat.items) {
          cleared[item.id] = false;
        }
      }
      this.items = cleared;
      this.customItems = [];
      localStorage.setItem('bach-shopping', JSON.stringify(this.items));
      localStorage.setItem('bach-shopping-custom', JSON.stringify([]));
      this._writePending = true;
      await api.post('/shopping', cleared);
      await api.post('/shopping-custom', { action: 'clear' });
      this._writePending = false;
    }
  };
}

// Weather
function weather() {
  return {
    days: [],

    async init() {
      try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.175&longitude=-113.29&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=America/Denver&start_date=2026-03-20&end_date=2026-03-22';
        const res = await fetch(url);
        const data = await res.json();
        if (data.daily) {
          const labels = ['Friday', 'Saturday', 'Sunday'];
          this.days = data.daily.time.map((date, i) => ({
            date,
            label: labels[i] || date,
            high: Math.round(data.daily.temperature_2m_max[i]),
            low: Math.round(data.daily.temperature_2m_min[i]),
            condition: weatherCodeToText(data.daily.weathercode[i])
          }));
        }
      } catch (e) {
        this.days = [];
      }
    }
  };
}

function weatherCodeToText(code) {
  const codes = {
    0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle',
    55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Light showers',
    81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm'
  };
  return codes[code] || 'Unknown';
}

// Heads Up Game
function headsUp() {
  return {
    active: false,
    setup: false,
    gameOver: false,
    paused: false,
    category: 'Bachelor Party',
    categoryNames: Object.keys(HEADSUP_WORDS),
    currentWord: '',
    score: 0,
    timeLeft: 60,
    feedbackClass: '',
    _words: [],
    _wordIndex: 0,
    _timer: null,
    _orientHandler: null,

    startSetup() {
      this.setup = true;
      this.active = false;
      this.gameOver = false;
      this.paused = false;
    },

    start() {
      this.setup = false;
      this.active = true;
      this.gameOver = false;
      this.paused = false;
      this.score = 0;
      this.timeLeft = 60;
      this.feedbackClass = '';
      this._words = shuffle([...HEADSUP_WORDS[this.category]]);
      this._wordIndex = 0;
      this.nextWord();
      this._startTimer();
      this._attachOrientation();

      try {
        document.documentElement.requestFullscreen?.();
      } catch (e) { /* ignore */ }
    },

    _startTimer() {
      this._timer = setInterval(() => {
        this.timeLeft--;
        if (this.timeLeft <= 0) this.end();
      }, 1000);
    },

    _attachOrientation() {
      this._orientHandler = (e) => {
        const beta = e.beta;
        if (beta !== null) {
          if (beta > 50) this.correct();
          else if (beta < -20) this.skip();
        }
      };

      if (window.DeviceOrientationEvent) {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission().then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', this._orientHandler);
            }
          });
        } else {
          window.addEventListener('deviceorientation', this._orientHandler);
        }
      }
    },

    _detachOrientation() {
      if (this._orientHandler) {
        window.removeEventListener('deviceorientation', this._orientHandler);
      }
    },

    pause() {
      this.paused = true;
      clearInterval(this._timer);
      this._detachOrientation();
    },

    resume() {
      this.paused = false;
      this._startTimer();
      this._attachOrientation();
    },

    quit() {
      this.end();
    },

    nextWord() {
      if (this._wordIndex >= this._words.length) {
        this._words = shuffle([...HEADSUP_WORDS[this.category]]);
        this._wordIndex = 0;
      }
      this.currentWord = this._words[this._wordIndex++];
      this.feedbackClass = '';
    },

    correct() {
      if (this.feedbackClass || this.paused) return;
      this.score++;
      this.feedbackClass = 'correct';
      setTimeout(() => this.nextWord(), 400);
    },

    skip() {
      if (this.feedbackClass || this.paused) return;
      this.feedbackClass = 'skip';
      setTimeout(() => this.nextWord(), 400);
    },

    end() {
      this.active = false;
      this.gameOver = true;
      this.paused = false;
      clearInterval(this._timer);
      this._detachOrientation();
      try { document.exitFullscreen?.(); } catch (e) { /* ignore */ }
    }
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
