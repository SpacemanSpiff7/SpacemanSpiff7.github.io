/* Shared GA4 analytics module — simonelongo.com
   Consent Mode v2 (denied by default), content grouping, event helper.
   Load with: <script defer src="/js/analytics.js?v=1"></script>            */

// 1. Consent Mode v2 defaults — MUST run before gtag config
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

var consentDefaults = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
};

// Respect Global Privacy Control (CCPA/GPC)
if (navigator.globalPrivacyControl) {
  consentDefaults.ad_storage = 'denied';
  consentDefaults.ad_user_data = 'denied';
  consentDefaults.ad_personalization = 'denied';
  consentDefaults.analytics_storage = 'denied';
}

gtag('consent', 'default', consentDefaults);

// 2. Guard: skip if gtag was already configured (e.g. CurlBro Vite SPA)
if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
  // gtag.js already loaded by another script — bail out
} else {
  // 3. Inject gtag.js async
  var gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-P9G5CS83DZ';
  document.head.appendChild(gtagScript);

  // 4. Configure with content group
  var p = location.pathname.replace(/index\.html$/, '').replace(/([^/])$/, '$1/');
  var groups = {
    '/': 'homepage',
    '/curlbro/': 'app',
    '/fakejira/': 'app',
    '/traffic-therapy/': 'game',
    '/grocery-project-files/seasonal-produce/web/': 'app'
  };
  var contentGroup = groups[p]
    || (p.indexOf('/guide') !== -1 ? 'guide' : null)
    || (p.indexOf('running-game') !== -1 ? 'game' : null)
    || (p.indexOf('consulting') !== -1 ? 'landing' : null)
    || (p.indexOf('spine-editor') !== -1 ? 'tool' : null)
    || (p.indexOf('stone-fruit') !== -1 ? 'guide' : null)
    || (p.indexOf('/tools/') !== -1 ? 'tool' : 'other');

  gtag('js', new Date());
  gtag('config', 'G-P9G5CS83DZ', {
    content_group: contentGroup
  });

  // 5. Event helper with 500ms debounce per event name
  var _saTimers = {};
  window.sa = function(name, params) {
    if (_saTimers[name]) return;
    _saTimers[name] = true;
    gtag('event', name, params || {});
    setTimeout(function() { delete _saTimers[name]; }, 500);
  };
}
