// =====================================================================
//  Edge Function: send-email
//  Admin-only. Sends individual or bulk email via Resend and logs it.
//  Secrets required (Supabase → Edge Functions → Secrets):
//    RESEND_API_KEY  = re_xxx           (from https://resend.com)
//    EMAIL_FROM      = "NNCC Fellowship <noreply@yourdomain>"
//  Deploy:  supabase functions deploy send-email --no-verify-jwt
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM   = Deno.env.get("EMAIL_FROM") ?? "NNCC Fellowship <onboarding@resend.dev>";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // --- verify the caller is an admin ---
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Not signed in" }, 401);
    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u } = await caller.auth.getUser();
    if (!u?.user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: prof } = await admin.from("profiles").select("role").eq("id", u.user.id).single();
    if (!prof || prof.role !== "admin") return json({ error: "Admins only" }, 403);

    // --- input ---
    const { subject, body, recipients } = await req.json();
    const list: { email: string; user_id?: string }[] =
      (recipients || []).filter((r: any) => r && r.email);
    if (!subject || !body) return json({ error: "Subject and body are required" }, 400);
    if (!list.length) return json({ error: "No recipients" }, 400);

    // --- log the message ---
    const { data: msg } = await admin.from("email_messages")
      .insert({ subject, body, sent_by: u.user.id, recipient_count: list.length })
      .select().single();

    const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#1d2733;line-height:1.6">${body}</div>`;
    let sent = 0;
    const rows: any[] = [];

    if (!RESEND_KEY) {
      for (const r of list) rows.push({ message_id: msg.id, email: r.email, user_id: r.user_id ?? null, status: "not_sent", error: "RESEND_API_KEY not configured" });
      await admin.from("email_recipients").insert(rows);
      return json({ ok: false, message_id: msg.id, sent: 0, total: list.length,
        error: "Email provider not configured. Add RESEND_API_KEY (and EMAIL_FROM) as Edge Function secrets to enable sending." }, 200);
    }

    for (const r of list) {
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: EMAIL_FROM, to: [r.email], subject, html }),
        });
        if (resp.ok) { sent++; rows.push({ message_id: msg.id, email: r.email, user_id: r.user_id ?? null, status: "sent" }); }
        else { const t = await resp.text(); rows.push({ message_id: msg.id, email: r.email, user_id: r.user_id ?? null, status: "failed", error: t.slice(0, 300) }); }
      } catch (e) {
        rows.push({ message_id: msg.id, email: r.email, user_id: r.user_id ?? null, status: "failed", error: String(e).slice(0, 300) });
      }
    }
    await admin.from("email_recipients").insert(rows);
    return json({ ok: true, message_id: msg.id, sent, total: list.length });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
