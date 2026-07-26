// =====================================================================
//  Edge Function: invite-user
//  Lets an ADMIN create a new member account by full name + email.
//  The new user receives an email invite to set their password.
//
//  Security: uses the service-role key (server-side only). It first
//  verifies that the CALLER is signed in AND has role = 'admin' before
//  creating anyone. The service key never reaches the browser.
//
//  Deploy:  supabase functions deploy invite-user --no-verify-jwt
//  (see PORTAL-SETUP-GUIDE.md for the click-by-click version too)
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
// Where the invite email should send people to set their password:
const SITE_URL      = Deno.env.get("SITE_URL") ?? "https://sarnatnncc.ca";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // ---- 1. Identify the caller from their JWT ----------------------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Not signed in" }, 401);

    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

    // ---- 2. Confirm the caller is an admin --------------------------
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: prof } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();
    if (!prof || prof.role !== "admin") {
      return json({ error: "Admins only" }, 403);
    }

    // ---- 3. Validate input ------------------------------------------
    const { full_name, email } = await req.json();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "A valid email is required" }, 400);
    }

    // ---- 4. Invite the new user -------------------------------------
    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: full_name ?? "" },
        redirectTo: `${SITE_URL}/login.html`,
      });

    if (inviteErr) {
      // Most common case: the user already exists
      return json({ error: inviteErr.message }, 400);
    }

    return json({ ok: true, user: { id: invited.user?.id, email } });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
