/* =====================================================================
   app-boot.js — mobile/native layer for the NNCC portal.
   Include on every page (in <head>, defer). It:
     • links the PWA manifest + theme color + iOS meta
     • registers the service worker (web PWA only; skipped inside the
       Capacitor native app, which serves its own bundle)
     • adds a thumb-reachable bottom tab bar on member pages
     • flags the body for mobile / native so CSS can adapt
   Safe to load before or after portal-auth.js / portal-shell.js.
   ===================================================================== */
(function () {
  var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform &&
                    window.Capacitor.isNativePlatform());
  document.documentElement.classList.add(isNative ? "is-native" : "is-web");

  // ---- <head> tags for PWA + iOS home-screen ------------------------
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

  // ---- service worker (web only) ------------------------------------
  if (!isNative && "serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  // ---- bottom tab bar ------------------------------------------------
  var TABS = [
    ["portal.html",   "M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z", "Home"],
    ["learning.html", "M4 5h16v11H4zM2 19h20", "Courses"],
    ["events.html",   "M5 4h14v16H5zM8 2v4M16 2v4M5 9h14", "Webinars"],
    ["forum.html",    "M4 5h16v10H8l-4 4z", "Forum"]
  ];
  // pages where the app chrome (tab bar) belongs — exclude login/index/marketing
  var HIDE = ["login.html", "index.html", "home.html", "fellowship.html",
              "competencies.html", "assessment.html", "governance.html",
              "innovation.html", "innovation_fixed.html", "catalog.html", ""];

  function activeFor(here) {
    if (here === "learning.html" || here === "modules.html" || here === "quiz.sql") return "learning.html";
    if (here === "events.html") return "events.html";
    if (here === "forum.html") return "forum.html";
    return "portal.html";
  }

  document.addEventListener("DOMContentLoaded", function () {
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
