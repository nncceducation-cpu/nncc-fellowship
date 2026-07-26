/* =====================================================================
   portal-gate.js — drop-in "members only" guard for EXISTING pages.
   To protect a page (e.g. assessment.html), add these lines to its
   <head>, right after the <title>:

     <script src="portal-config.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="portal-auth.js"></script>
     <script src="portal-gate.js"></script>

   The page stays hidden until we confirm the visitor is signed in;
   otherwise they are sent to login.html and returned here afterwards.
   ===================================================================== */
(function () {
  // Hide the page immediately to avoid a flash of protected content.
  var style = document.createElement("style");
  style.id = "nncc-gate-hide";
  style.textContent = "body{visibility:hidden !important}";
  (document.head || document.documentElement).appendChild(style);

  function reveal() {
    var s = document.getElementById("nncc-gate-hide");
    if (s) s.remove();
  }

  document.addEventListener("DOMContentLoaded", async function () {
    if (!window.NNCC || !NNCC.configured) { reveal(); return; } // fail open if not set up yet
    var user = await NNCC.user();
    if (!user) {
      var back = encodeURIComponent(location.pathname.replace(/^\//, "") + location.search);
      location.replace("login.html?next=" + back);
      return;
    }
    reveal();
  });
})();
