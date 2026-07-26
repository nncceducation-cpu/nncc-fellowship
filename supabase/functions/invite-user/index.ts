// =====================================================================
//  Edge Function: invite-user
//  Lets an ADMIN add a member two ways:
//    • mode "invite" (default): sends an email invite; the member sets
//      their own password.
//    • mode "create": creates the account immediately with a password
//      (email pre-confirmed). If no password is given, a strong one is
//      generated and returned so the admin can share it.
//
//  Security: uses the service-role key (server-side only) after verifying
//  the CALLER is signed in AND has role = 'admin'. The service key never
//  reaches the browser.
//
//  Deploy:  supabase functions deploy invite-user --no-verify-jwt
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL      = Deno.env.get("SITE_URL") ?? "https://sarnatnncc.ca";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function genPassword(len = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const a = new Uint32Array(len); crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // ---- 1. Identify the caller from their JWT ----------------------
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Not signed in" }, 401);
    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

    // ---- 2. Confirm the caller is an admin --------------------------
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: prof } = await admin.from("profiles").select("role").eq("id", userData.user.id).single();
    if (!prof || prof.role !== "admin") return json({ error: "Admins only" }, 403);

    // ---- 3. Validate input ------------------------------------------
    const { full_name, email, mode, password } = await req.json();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "A valid email is required" }, 400);
    }

    // ---- 4a. CREATE the account directly ----------------------------
    if (mode === "create") {
      const pw = (typeof password === "string" && password.length >= 8) ? password : genPassword();
      const generated = !(typeof password === "string" && password.length >= 8);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: pw,
        email_confirm: true,
        user_metadata: { full_name: full_name ?? "" },
      });
      if (createErr) return json({ error: createErr.message }, 400);
      return json({ ok: true, mode: "create", user: { id: created.user?.id, email },
        password: generated ? pw : undefined });
    }

    // ---- 4b. INVITE by email (default) ------------------------------
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name ?? "" },
      redirectTo: `${SITE_URL}/login.html`,
    });
    if (inviteErr) return json({ error: inviteErr.message }, 400);
    return json({ ok: true, mode: "invite", user: { id: invited.user?.id, email } });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
