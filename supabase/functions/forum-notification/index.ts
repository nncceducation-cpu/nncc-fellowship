// Emails active, subscribed forum members after a verified new topic or reply.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "NNCC Fellowship <onboarding@resend.dev>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://sarnatnncc.ca";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});
const esc = (value: unknown) => String(value ?? "").replace(/[<>&]/g, c => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;",
}[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!token) return json({ error: "Not signed in" }, 401);
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: authData } = await caller.auth.getUser();
    const user = authData?.user;
    if (!user) return json({ error: "Invalid session" }, 401);

    const { event_type, event_id } = await req.json();
    if (!['topic','reply'].includes(event_type) || !event_id) {
      return json({ error: "Invalid forum event" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    let thread: any = null, body = "";
    if (event_type === 'topic') {
      const { data } = await admin.from("forum_threads").select("id,title,created_by").eq("id", event_id).maybeSingle();
      if (!data || data.created_by !== user.id) return json({ error: "Forum topic not found" }, 404);
      thread = data;
      const { data: firstPost } = await admin.from("forum_posts").select("body").eq("thread_id", data.id).eq("created_by", user.id).order("created_at").limit(1).maybeSingle();
      body = firstPost?.body || "";
    } else {
      const { data: post } = await admin.from("forum_posts").select("id,thread_id,body,created_by").eq("id", event_id).maybeSingle();
      if (!post || post.created_by !== user.id) return json({ error: "Forum reply not found" }, 404);
      const { data } = await admin.from("forum_threads").select("id,title,created_by").eq("id", post.thread_id).maybeSingle();
      if (!data) return json({ error: "Forum topic not found" }, 404);
      thread = data; body = post.body || "";
    }

    const { error: eventError } = await admin.from("forum_notification_events").insert({ event_type, event_id });
    if (eventError) {
      if (eventError.code === '23505') return json({ ok: true, already_sent: true, sent: 0 });
      throw eventError;
    }

    const [{ data: author }, { data: recipients }] = await Promise.all([
      admin.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
      admin.from("profiles").select("id,email").eq("status", "active").eq("acc_forum", true).eq("forum_email_notifications", true).neq("id", user.id),
    ]);
    const list = (recipients || []).filter((r: any) => r.email);
    if (!RESEND_KEY || !list.length) return json({ ok: true, emailed: false, sent: 0, total: list.length });

    const authorName = author?.full_name || author?.email || "A member";
    const excerpt = body.length > 500 ? body.slice(0, 500) + "…" : body;
    const link = `${SITE_URL}/forum.html?thread=${thread.id}`;
    const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#1d2733;line-height:1.6">
      <h2 style="color:#123b5d;margin:0 0 12px">${event_type === 'topic' ? 'New forum topic' : 'New reply in the members’ forum'}</h2>
      <p><b>${esc(thread.title)}</b><br><span style="color:#54616e">Posted by ${esc(authorName)}</span></p>
      ${excerpt ? `<div style="padding:12px 14px;background:#f4f8fa;border-left:4px solid #0f8a8a;border-radius:6px">${esc(excerpt)}</div>` : ""}
      <p><a href="${link}" style="background:#0f8a8a;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Open discussion</a></p>
      <p style="font-size:12px;color:#6b7785">You receive this because forum email notifications are enabled. You can turn them off on the Members’ Forum page.</p>
    </div>`;
    const subject = `${event_type === 'topic' ? 'New forum topic' : 'New forum reply'}: ${thread.title}`;
    const results = await Promise.all(list.map(async (recipient: any) => {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: EMAIL_FROM, to: [recipient.email], reply_to: user.email, subject, html }),
        });
        return response.ok;
      } catch (_) { return false; }
    }));
    return json({ ok: true, emailed: true, sent: results.filter(Boolean).length, total: list.length });
  } catch (error) {
    return json({ error: String((error as any)?.message ?? error) }, 500);
  }
});

