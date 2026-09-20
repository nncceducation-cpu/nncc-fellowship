// Records an authenticated learner's course request and notifies the program inbox.
// Deploy with JWT verification disabled; this function validates the caller token itself.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "NNCC Fellowship <onboarding@resend.dev>";
const NOTIFY = Deno.env.get("COURSE_REQUEST_NOTIFY_EMAIL")
  ?? Deno.env.get("JOIN_NOTIFY_EMAIL")
  ?? "nncceducation@gmail.com";
const PORTAL_URL = Deno.env.get("SITE_URL") ?? "https://sarnatnncc.ca";

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

    const { course_id, message } = await req.json();
    if (!course_id) return json({ error: "Course is required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const [{ data: course }, { data: profile }] = await Promise.all([
      admin.from("courses").select("id,title,visibility,enrollment_required").eq("id", course_id).maybeSingle(),
      admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    ]);
    if (!course || course.visibility !== "published" || !course.enrollment_required) {
      return json({ error: "This course is not available for access requests" }, 400);
    }

    const { data: enrolled } = await admin.from("course_enrollments")
      .select("id").eq("course_id", course.id).eq("user_id", user.id).maybeSingle();
    if (enrolled) return json({ error: "You are already enrolled in this course" }, 409);

    const cleanMessage = String(message ?? "").trim().slice(0, 2000);
    const { error: saveError } = await admin.from("course_access_requests").upsert({
      course_id: course.id,
      user_id: user.id,
      status: "pending",
      message: cleanMessage || null,
      created_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
    }, { onConflict: "course_id,user_id" });
    if (saveError) throw saveError;

    let emailed = false;
    if (RESEND_KEY) {
      const learnerName = profile?.full_name || user.email || "Learner";
      const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;color:#1d2733;line-height:1.6">
        <h2 style="color:#123b5d;margin:0 0 12px">New NNCC course access request</h2>
        <p><b>Learner:</b> ${esc(learnerName)}<br><b>Email:</b> ${esc(user.email || "—")}<br><b>Course:</b> ${esc(course.title)}</p>
        ${cleanMessage ? `<p><b>Learner's message:</b><br>${esc(cleanMessage)}</p>` : ""}
        <p><a href="${PORTAL_URL}/people.html" style="background:#0f8a8a;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Review course requests</a></p>
        <p style="color:#54616e">In the portal, open People &amp; Enrollments → Enrollments &amp; progress → Course access requests.</p>
      </div>`;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [NOTIFY],
            ...(user.email ? { reply_to: user.email } : {}),
            subject: `Course access request: ${course.title}`,
            html,
          }),
        });
        emailed = response.ok;
      } catch (_) { emailed = false; }
    }

    return json({ ok: true, emailed });
  } catch (error) {
    return json({ error: String((error as any)?.message ?? error) }, 500);
  }
});

