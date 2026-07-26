// =====================================================================
//  Portal configuration  —  FILL IN THESE TWO VALUES
//  Supabase → Project Settings → API
//    • Project URL   -> SUPABASE_URL
//    • anon / public key -> SUPABASE_ANON_KEY
//  The anon key is SAFE to publish: it only grants what your Row-Level
//  Security policies allow. Never put the service_role key here.
// =====================================================================
window.PORTAL_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-ref.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",

  // Name of the deployed Edge Function that invites members.
  INVITE_FUNCTION: "invite-user",

  // The super-admin email (already enforced in the database too).
  ADMIN_EMAIL: "khorshid.mohammad@gmail.com",
};
