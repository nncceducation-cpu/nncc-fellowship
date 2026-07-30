/* =====================================================================
   app-boot.js - mobile/native layer for the NNCC portal.
   Detects when running as the installed app (Capacitor native OR an
   installed/standalone PWA) and flags <html class="app-chrome"> so the
   CSS strips the website chrome. Also adds the bottom tab bar and, inside
   the native app, routes YouTube embeds through a hosted player page so
   they play inline (the app's own origin is rejected by YouTube -> 153).
   ===================================================================== */
(function () {
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform &&
                    window.Capacitor.isNativePlatform());

  // Robust "is this the installed app?" test. Capacitor serves the bundle
  // from capacitor://localhost (iOS) or https://localhost (Android), so the
  // hostname/scheme is a reliable signal even before the Capacitor JS bridge
  // has attached. Installed PWAs report display-mode: standalone.
  var host = location.hostname;
  var isApp = isNative ||
              location.protocol === "capacitor:" ||
              host === "localhost" || host === "127.0.0.1" || host === "" ||
              (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
              window.navigator.standalone === true;

  document.documentElement.classList.add(isNative ? "is-native" : "is-web");
  if (isApp) document.documentElement.classList.add("app-chrome");

  function addHead() {
    var head = document.head;
    function meta(name, content, prop) {
      var m = document.createElement("meta");
      if (prop) m.setAttribute("property", name); else m.name = name;
      m.content = content; head.appendChild(m);
    }
    if (!document.querySelector('link[rel="manifest"]')) {
      var l = document.createElement("link");
      l.rel = "manifest"; l.href = "manifest.webmanifest"; head.appendChild(l);
    }
    meta("theme-color", "#0c2a4d");
    meta("apple-mobile-web-app-capable", "yes");
    meta("apple-mobile-web-app-status-bar-style", "black-translucent");
    meta("apple-mobile-web-app-title", "NNCC Portal");
    var al = document.createElement("link");
    al.rel = "apple-touch-icon"; al.href = "apple-touch-icon.png"; head.appendChild(al);
  }
  addHead();

  if (!isNative && "serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  // ---- Native-only: YouTube embeds error out (153) inside the app web view
  //      because the app origin isn't a normal web origin. Re-point each embed
  //      at a tiny player page hosted on the real site, so YouTube sees a
  //      legitimate https://sarnatnncc.ca origin and plays INLINE. The website
  //      and PWA are untouched (they already have a valid origin).
  var PLAYER = "https://sarnatnncc.ca/player.html?v=";
  function fixVideos() {
    if (!isNative) return;
    var sel = 'iframe[src*="youtube.com"],iframe[src*="youtu.be"],iframe[src*="youtube-nocookie.com"]';
    var frames = document.querySelectorAll(sel);
    Array.prototype.forEach.call(frames, function (f) {
      if (f.getAttribute("data-nncc-video")) return;   // already handled
      try {
        var src = f.getAttribute("src") || "";
        var m = src.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (!m) return;
        f.setAttribute("data-nncc-video", "1");
        f.setAttribute("allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen");
        f.setAttribute("allowfullscreen", "");
        f.setAttribute("src", PLAYER + m[1]);
      } catch (e) {}
    });
  }
  function watchVideos() {
    if (!isNative) return;
    fixVideos();
    // Lesson content is injected asynchronously, so keep watching the DOM.
    try {
      var mo = new MutationObserver(function () { fixVideos(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {
      var n = 0, t = setInterval(function () { fixVideos(); if (++n > 20) clearInterval(t); }, 500);
    }
  }

  var TABS = [
    ["portal.html",   "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z", "Home"],
    ["learning.html", "M4 5h16v11H4zM2 19h20", "Courses"],
    ["events.html",   "M5 4h14v16H5zM8 2v4M16 2v4M5 9h14", "Webinars"],
    ["forum.html",    "M4 5h16v10H8l-4 4z", "Forum"]
  ];
  var HIDE = ["login.html", "index.html", "home.html", "fellowship.html",
              "competencies.html", "assessment.html", "governance.html",
              "innovation.html", "innovation_fixed.html", "catalog.html", ""];

  function activeFor(here) {
    if (here === "learning.html" || here === "modules.html") return "learning.html";
    if (here === "events.html") return "events.html";
    if (here === "forum.html") return "forum.html";
    return "portal.html";
  }

  function simplifyChrome() {
    if (!isApp) return;
    document.querySelectorAll('a[href="index.html"]').forEach(function (a) {
      if (a.classList.contains("brand")) { a.setAttribute("href", "portal.html"); }
      else { a.style.display = "none"; }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    watchVideos();
    simplifyChrome();
    var here = (location.pathname.split("/").pop() || "").toLowerCase();
    if (HIDE.indexOf(here) !== -1) return;
    var active = activeFor(here);
    var bar = document.createElement("nav");
    bar.className = "tabbar";
    bar.setAttribute("aria-label", "Primary");
    bar.innerHTML = TABS.map(function (t) {
      var on = t[0] === active ? " active" : "";
      return '<a class="tab' + on + '" href="' + t[0] + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
        'stroke-linecap="round" stroke-linejoin="round"><path d="' + t[1] + '"/></svg>' +
        '<span>' + t[2] + '</span></a>';
    }).join("");
    document.body.appendChild(bar);
    document.body.classList.add("has-tabbar");
  });
})();
