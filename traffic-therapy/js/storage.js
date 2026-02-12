// storage.js -- Cookie-based persistence for Traffic Therapy
// Stores unlocked level and best star ratings per level in a single cookie.
window.TT = window.TT || {};

TT.storage = (() => {
  const COOKIE_NAME = 'tt_progress';
  const EXPIRY_DAYS = 365;

  const defaults = () => ({ unlockedLevel: 1, stars: {} });

  const save = (data) => {
    const expires = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toUTCString();
    const value = encodeURIComponent(JSON.stringify(data));
    document.cookie = `${COOKIE_NAME}=${value}; path=/; expires=${expires}; SameSite=Lax`;
  };

  const load = () => {
    try {
      const cookies = document.cookie.split('; ');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        if (cookie.startsWith(COOKIE_NAME + '=')) {
          const value = cookie.substring(COOKIE_NAME.length + 1);
          const parsed = JSON.parse(decodeURIComponent(value));
          // Ensure required fields exist
          return {
            unlockedLevel: parsed.unlockedLevel || 1,
            stars: parsed.stars || {}
          };
        }
      }
    } catch (e) {
      // Corrupt cookie -- fall through to defaults
    }
    return defaults();
  };

  const getUnlockedLevel = () => load().unlockedLevel;

  const getStars = (levelId) => {
    const data = load();
    return data.stars[String(levelId)] || 0;
  };

  const completeLevel = (levelId, starRating) => {
    const data = load();
    // Unlock next level if this is the highest completed
    if (levelId >= data.unlockedLevel) {
      data.unlockedLevel = levelId + 1;
    }
    // Update stars only if improved (never downgrade)
    const key = String(levelId);
    const current = data.stars[key] || 0;
    if (starRating > current) {
      data.stars[key] = starRating;
    }
    save(data);
  };

  const clearProgress = () => {
    // Set cookie with past expiry to delete it
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  };

  return {
    save,
    load,
    getUnlockedLevel,
    getStars,
    completeLevel,
    clearProgress
  };
})();
