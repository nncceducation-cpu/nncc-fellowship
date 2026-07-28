/* =====================================================================
   portal-shell.js, injects a persistent Thinkific-style left sidebar
   into every portal page. Include AFTER portal-auth.js:
     <script src="portal-shell.js"></script>
   Admin-only links are hidden for non-admins. The current page is
   highlighted. On narrow screens the rail collapses behind a ☰ button.
   ===================================================================== */
(function () {
  if (!window.NNCC || !NNCC.configured) return; // skip on login / unconfigured

  const ITEMS = [
    ["portal.html",    "🏠", "Dashboard",      false, null],
    ["learning.html",  "▶",  "Courses",         false, "modules"],
    ["forum.html",     "💬", "Forum",           false, "forum"],
    ["authoring.html", "🏗", "Course Builder",  true,  null],
    ["people.html",    "👤", "People",          true,  null],
    ["analytics.html", "📊", "Analytics",       true,  null],
    ["admin.html",     "⚙",  "Admin",           true,  null],
  ];

  document.addEventListener("DOMContentLoaded", async () => {
    const here = (location.pathname.split("/").pop() || "portal.html").toLowerCase();

    const rail = document.createElement("aside");
    rail.className = "side-rail";
    rail.innerHTML =
      `<a class="rail-brand" href="portal.html"><img class="mark" src="logo-nncc.png" alt="NNCC" style="border-radius:50%;object-fit:cover;background:none;padding:0"><b>Member Portal</b></a>
       <nav>${ITEMS.map(([h, ic, l, adm, acc]) =>
         `<a href="${h}" data-adm="${adm}" data-acc="${acc || ""}" class="${h === here ? "active" : ""}"><span class="ri">${ic}</span>${l}</a>`
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
        // hide member areas the person doesn't have access to
        if (!admin) rail.querySelectorAll('[data-acc]').forEach(a => {
          const area = a.getAttribute("data-acc");
          if (area && !p["acc_" + area]) a.remove();
        });
      }
    } catch (_) {}
  });
})();
