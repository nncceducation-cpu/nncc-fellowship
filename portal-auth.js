/* =====================================================================
   portal-auth.js,  shared authentication + data helpers
   Load order on every portal page:
     <script src="portal-config.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="portal-auth.js"></script>
   Exposes a global  window.NNCC  with everything the pages need.
   ===================================================================== */
(function () {
  const cfg = window.PORTAL_CONFIG || {};
  const configured =
    cfg.SUPABASE_URL &&
    !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
    cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR-ANON");

  let client = null;
  if (configured && window.supabase) {
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  function notConfiguredBanner() {
    if (document.getElementById("nncc-config-warn")) return;
    const d = document.createElement("div");
    d.id = "nncc-config-warn";
    d.style.cssText =
      "background:#fbf4e6;color:#7a5a12;border-bottom:1px solid #e7d3a1;" +
      "padding:10px 16px;font:14px/1.5 Inter,system-ui,sans-serif;text-align:center";
    d.innerHTML =
      "⚠️ Portal not connected yet, add your Supabase URL and anon key in " +
      "<code>portal-config.js</code>. (See PORTAL-SETUP-GUIDE.md)";
    document.body.prepend(d);
  }

  const NNCC = {
    configured,
    client,

    /* ---- session ---- */
    async user() {
      if (!client) return null;
      const { data } = await client.auth.getUser();
      return data?.user || null;
    },
    async profile() {
      const u = await this.user();
      if (!u) return null;
      const { data } = await client
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      return data || { id: u.id, email: u.email, full_name: "", role: "member" };
    },

    /* ---- guards (call at top of a protected page) ---- */
    async requireAuth() {
      if (!configured) { notConfiguredBanner(); return null; }
      const u = await this.user();
      if (!u) {
        const back = encodeURIComponent(location.pathname.replace(/^\//, ""));
        location.replace("login.html?next=" + back);
        return null;
      }
      const p = await this.profile();
      if (p && p.status === "suspended") {
        await this.signOut();
        location.replace("login.html?suspended=1");
        return null;
      }
      return u;
    },
    async requireAdmin() {
      const u = await this.requireAuth();
      if (!u) return null;
      const p = await this.profile();
      if (!p || p.role !== "admin") {
        location.replace("portal.html?denied=1");
        return null;
      }
      return p;
    },

    /* ---- auth actions ---- */
    signIn(email, password) {
      return client.auth.signInWithPassword({ email, password });
    },
    signOut() {
      return client.auth.signOut();
    },
    sendReset(email) {
      return client.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + "/login.html?mode=reset",
      });
    },
    setPassword(password) {
      return client.auth.updateUser({ password });
    },

    /* ---- admin: add a member via the Edge Function ----
       extra can carry { mode:'create', password } to create the account
       directly (email pre-confirmed) instead of emailing an invite. */
    async inviteMember(full_name, email, extra = {}) {
      const { data: s } = await client.auth.getSession();
      const token = s?.session?.access_token;
      const res = await fetch(
        `${cfg.SUPABASE_URL}/functions/v1/${cfg.INVITE_FUNCTION || "invite-user"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: cfg.SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ full_name, email...extra }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Request failed");
      return body;
    },
    /* create the account now with a password (blank = auto-generate) */
    addMember(full_name, email, password) {
      return this.inviteMember(full_name, email, { mode: "create", password: password || undefined });
    },

    /* ---- data helpers ---- */
    members() {
      return client.from("profiles").select("*").order("created_at", { ascending: true });
    },
    setRole(id, role) {
      return client.from("profiles").update({ role }).eq("id", id);
    },

    /* ---- small UI helper: a sign-out link + name chip ---- */
    async mountUserChip(el) {
      if (!el) return;
      const p = await this.profile();
      if (!p) return;
      const admin = p.role === "admin";
      el.innerHTML =
        `<span class="chip-name">${(p.full_name || p.email)}</span>` +
        (admin ? ` <a href="admin.html" class="chip-link">Admin</a>` : "") +
        ` <a href="#" id="nncc-signout" class="chip-link">Sign out</a>`;
      const so = el.querySelector("#nncc-signout");
      if (so)
        so.addEventListener("click", async (e) => {
          e.preventDefault();
          await NNCC.signOut();
          location.href = "login.html";
        });
    },
  };

  window.NNCC = NNCC;
  if (!configured) document.addEventListener("DOMContentLoaded", notConfiguredBanner);
})();
