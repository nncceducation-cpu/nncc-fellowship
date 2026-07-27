// =====================================================================
//  Edge Function: join-request  (PUBLIC — no login required)
//  A prospective member submits a request to join from the sign-in page.
//  The request is stored in public.join_requests (visible to admins) and,
//  if email is configured, a notification is sent to the program inbox.
//
//  Secrets (optional, for email delivery):
//    RESEND_API_KEY     = re_xxx        (https://resend.com)
//    EMAIL_FROM         = "NNCC Fellowship <noreply@yourdomain>"
//    JOIN_NOTIFY_EMAIL  = nncceducation@gmail.com   (defaulted below)
//
//  Deploy:  supabase functions deploy join-request --no-verify-jwt
// =====================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY   = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM   = Deno.env.get("EMAIL_FROM") ?? "NNCC Fellowship <onboarding@resend.dev>";
const NOTIFY       = Deno.env.get("JOIN_NOTIFY_EMAIL") ?? "nncceducation@gmail.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const esc = (s: string) => String(s ?? "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { full_name, email, message } = await req.json();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "A valid email is required" }, 400);
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    await admin.from("join_requests").insert({
      full_name: (full_name ?? "").slice(0, 200),
      email: email.slice(0, 200),
      message: (message ?? "").slice(0, 2000),
    });

    let emailed = false;
    if (RESEND_KEY) {
      const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#1d2733;line-height:1.6">
        <h3 style="margin:0 0 8px">New request to join the NNCC portal</h3>
        <p><b>Name:</b> ${esc(full_name || "—")}<br>
           <b>Email:</b> ${esc(email)}</p>
        ${message ? `<p><b>Message:</b><br>${esc(message)}</p>` : ""}
        <p style="color:#54616e">Manage requests in the portal → People → Requests to join.</p></div>`;
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: EMAIL_FROM, to: [NOTIFY], reply_to: email,
            subject: `Join request: ${full_name || email}`, html }),
        });
        emailed = r.ok;
      } catch (_) { emailed = false; }
    }
    return json({ ok: true, emailed });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});
