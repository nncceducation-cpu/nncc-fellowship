import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Not signed in" }, 401);
    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: auth } = await caller.auth.getUser();
    if (!auth?.user) return json({ error: "Invalid session" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", auth.user.id).single();
    if (profile?.role !== "admin") return json({ error: "Admins only" }, 403);

    const { user_id, full_name, email, country, profession, institution } = await req.json();
    if (!user_id || !full_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ""))) {
      return json({ error: "A member, full name and valid email are required" }, 400);
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(full_name).trim();
    const { error: authError } = await admin.auth.admin.updateUserById(user_id, {
      email: normalizedEmail, email_confirm: true, user_metadata: { full_name: normalizedName },
    });
    if (authError) return json({ error: authError.message }, 400);
    const { error: profileError } = await admin.from("profiles").update({
      full_name: normalizedName, email: normalizedEmail, country: country || null,
      profession: profession || null, institution: String(institution || "").trim() || null,
    }).eq("id", user_id);
    if (profileError) return json({ error: profileError.message }, 400);
    return json({ ok: true });
  } catch (error) {
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});
