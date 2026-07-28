/* =====================================================================
   portal-shell.js — injects a persistent Thinkific-style left sidebar
   into every portal page. Include AFTER portal-auth.js:
     <script src="portal-shell.js"></script>
   Admin-only links are hidden for non-admins. The current page is
   highlighted. On narrow screens the rail collapses behind a ☰ button.
   ===================================================================== */
(function () {
  if (!window.NNCC || !NNCC.configured) return; // skip on login / unconfigured

  const ITEMS = [
    ["portal.html",    "🏠", "Dashboard",      false],
    ["learning.html",  "▶",  "Courses",         false],
    ["forum.html",     "💬", "Forum",           false],
    ["authoring.html", "🏗", "Course Builder",  true],
    ["people.html",    "👤", "People",          true],
    ["analytics.html", "📊", "Analytics",       true],
    ["admin.html",     "⚙",  "Admin",           true],
  ];

  document.addEventListener("DOMContentLoaded", async () => {
    const here = (location.pathname.split("/").pop() || "portal.html").toLowerCase();

    const rail = document.createElement("aside");
    rail.className = "side-rail";
    rail.innerHTML =
      `<a class="rail-brand" href="portal.html"><img class="mark" src="logo-nncc.png" alt="NNCC" style="border-radius:50%;object-fit:cover;background:none;padding:0"><b>Member Portal</b></a>
       <nav>${ITEMS.map(([h, ic, l, adm]) =>
         `<a href="${h}" data-adm="${adm}" class="${h === here ? "active" : ""}"><span class="ri">${ic}</span>${l}</a>`
       ).join("")}</nav>
       <div class="rail-foot">
         <div class="rail-user" id="rail-user"></div>
         <a href="#" id="rail-signout"><span class="ri">⎋</span>Sign out</a>
       </div>`;
    document.body.appendChild(rail);
    document.body.classList.add("has-rail");

    const toggle = document.createElement("button");
    toggle.className = "rail-toggle"; toggle.setAttribute("aria-label", "Menu"); toggle.textContent = "☰";
    toggle.addEventListener("click", () => rail.classList.toggle("open"));
    document.body.appendChild(toggle);
    rail.addEventListener("click", (e) => { if (e.target.closest("a")) rail.classList.remove("open"); });

    rail.querySelector("#rail-signout").addEventListener("click", async (e) => {
      e.preventDefault(); await NNCC.signOut(); location.href = "login.html";
    });

    // fill user + gate admin links once we know the profile
    try {
      const p = await NNCC.profile();
      if (p) {
        rail.querySelector("#rail-user").textContent = p.full_name || p.email || "";
        const admin = p.role === "admin";
        rail.querySelectorAll('[data-adm="true"]').forEach(a => { if (!admin) a.remove(); });
      }
    } catch (_) {}
  });
})();
