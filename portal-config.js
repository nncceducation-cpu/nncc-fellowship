// =====================================================================
//  Portal configuration,  connected to the nncc-portal Supabase project
//  Supabase → Project Settings → API
//  The publishable key is SAFE to publish: it only grants what your
//  Row-Level Security policies allow. Never put a secret key here.
// =====================================================================
window.PORTAL_CONFIG = {
  SUPABASE_URL: "https://hdesexrwpmeorfjtywic.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ZZBFbYyDBbiATNgKHMzqlQ_BiT4ltGj",

  // Name of the deployed Edge Function that invites members.
  INVITE_FUNCTION: "invite-user",

  // The super-admin email (also enforced in the database).
  ADMIN_EMAIL: "khorshid.mohammad@gmail.com",
};
