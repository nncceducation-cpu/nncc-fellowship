# NNCC Fellowship Member Portal — Setup Guide

This adds a **members-only portal** to your existing static site
(`sarnatnncc.ca`) with:

- **Login** (email + password)
- **Admin-only invites** — you add people by *full name + email*; they get an
  email to set a password
- **`khorshid.mohammad@gmail.com` is automatically the admin**
- **Private resource area**, **members' forum**, and an in-portal
  **education-modules** area (with progress tracking)
- **Page gating** — optionally require login to view existing pages

The site stays 100% static (GitHub Pages / Netlify). All the "server" work is
done by **Supabase** (free tier). You'll do a handful of clicks once.

---

## Files in this package

| File | What it is | Goes where |
|------|------------|-----------|
| `login.html` | Sign-in / set-password / reset screen | repo root |
| `portal.html` | Member dashboard + resources + directory | repo root |
| `admin.html` | Admin panel — invite members, manage roles, add resources | repo root |
| `forum.html` | Members' forum (threads + replies) | repo root |
| `learning.html` | Education modules + lessons + progress | repo root |
| `portal-auth.js` | Shared auth/data helper | repo root |
| `portal-config.js` | **You edit this** — Supabase URL + key | repo root |
| `portal-gate.js` | Drop-in "members-only" guard for existing pages | repo root |
| `portal.css` | Portal styling (reuses your `styles.css` colours) | repo root |
| `supabase/schema.sql` | Database tables + security rules | run once in Supabase |
| `supabase/functions/invite-user/index.ts` | Edge Function that sends invites | deploy to Supabase |

The 7 existing pages (`index.html`, `fellowship.html`, …) already have a new
**Portal** link added to their top navigation.

---

## Step 1 — Create a free Supabase project

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. **New project**. Give it a name (e.g. `nncc-portal`), choose a region close
   to Calgary (e.g. *US West* or *Canada Central*), set a strong database
   password (save it), and create.
3. Wait ~2 minutes for it to provision.

## Step 2 — Create the database

1. In the project, open **SQL Editor** → **New query**.
2. Paste the entire contents of **`supabase/schema.sql`** and click **Run**.
3. You should see "Success. No rows returned." That built all the tables,
   security policies, and the trigger that makes *you* an admin.

## Step 3 — Connect the site to Supabase

1. Open **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
3. Edit **`portal-config.js`** and paste them in:

   ```js
   window.PORTAL_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...your-anon-key...",
     INVITE_FUNCTION: "invite-user",
     ADMIN_EMAIL: "khorshid.mohammad@gmail.com",
   };
   ```

   The anon key is **safe to publish** — it only allows what the security
   rules permit. **Never** put the `service_role` key here.

## Step 4 — Turn OFF public sign-ups (admin-invite only)

1. **Authentication → Providers → Email**.
2. Make sure **Email** is enabled.
3. Turn **"Allow new users to sign up"** **OFF**. Now only invited people can
   get accounts.
4. **Authentication → URL Configuration**:
   - **Site URL:** `https://sarnatnncc.ca`
   - **Redirect URLs:** add `https://sarnatnncc.ca/login.html`
     (and `http://localhost:3000/login.html` if you test locally).

## Step 5 — Make yourself the admin

1. **Authentication → Users → Add user → Create new user**.
2. Email: `khorshid.mohammad@gmail.com`, tick **Auto Confirm User**, set a
   password.
3. Because of the trigger in Step 2, your profile is created with
   **role = admin** automatically.
   *(Any future account with this exact email is also made admin.)*

## Step 6 — Deploy the invite function

This is what lets you invite members **from the Admin page**.

**Easiest — Supabase Dashboard:**

1. **Edge Functions → Create a function** → name it exactly **`invite-user`**.
2. Paste the contents of `supabase/functions/invite-user/index.ts`.
3. In the function's settings, turn **"Verify JWT"** **OFF** (the function does
   its own admin check).
4. **Deploy**.
5. **Edge Functions → Secrets** (or Project Settings → Edge Functions) — add one
   secret so invite emails point to your site:
   - `SITE_URL` = `https://sarnatnncc.ca`
   *(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
   provided automatically — you don't add those.)*

**Or with the CLI** (if you use it):

```bash
supabase functions deploy invite-user --no-verify-jwt
supabase secrets set SITE_URL=https://sarnatnncc.ca
```

## Step 7 — Put the files live

Commit/upload all the files to your repo
(`github.com/nncceducation-cpu/nncc-fellowship`). GitHub Pages redeploys
automatically in a minute or two. (See "Deploying to GitHub" below.)

## Step 8 — Test it

1. Visit `https://sarnatnncc.ca/login.html` → sign in as
   `khorshid.mohammad@gmail.com`.
2. You'll land on the portal; an **Admin** link appears in the top bar.
3. Open **Admin → Invite a member**, enter a name + email, **Send invite**.
4. That person gets an email → sets a password → can sign in.

---

## Important: sending invite emails to real people

Supabase's built-in email is fine for testing but is **rate-limited and not
meant for production**. To reliably send invites to any address, connect a free
SMTP provider:

- **Authentication → Emails → SMTP Settings** → enable custom SMTP.
- Use a free provider like **Resend** (<https://resend.com>) or **SendGrid**.
- Verify your domain so mail comes from `@sarnatnncc.ca`.

Until then, you can still create accounts manually in
**Authentication → Users → Add user** and give people their password directly.

---

## Optional: require login to view existing pages ("gate a page")

To make, say, `assessment.html` members-only, add these four lines to that
page's `<head>` (right after the `<title>` line):

```html
<script src="portal-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="portal-auth.js"></script>
<script src="portal-gate.js"></script>
```

Anyone not signed in is redirected to `login.html` and returned to the page
after they log in. Repeat for any page you want to protect. (Leave `index.html`
and the marketing pages public.)

---

## Deploying to GitHub

**Option A — GitHub web (no tools):**
1. Go to your repo → **Add file → Upload files**.
2. Drag in the new files (`login.html`, `portal.html`, `admin.html`,
   `forum.html`, `learning.html`, `portal-auth.js`, `portal-config.js`,
   `portal-gate.js`, `portal.css`) **and** the 7 updated pages, plus the
   `supabase/` folder.
3. **Commit changes**. Pages rebuilds automatically.

**Option B — Git (if you have the repo cloned):**
```bash
git add .
git commit -m "Add member portal (auth, admin invites, forum, modules)"
git push
```

---

## How security works (quick version)

- Every table has **Row-Level Security**: only signed-in users can read member
  content, and only **admins** can change roles, resources, or course content.
- Inviting users needs elevated rights, so it runs in the **Edge Function**,
  which checks you're an admin **before** creating anyone. The powerful
  `service_role` key lives only on Supabase's servers, never in the browser.
- Your admin status is enforced in the **database**, not just the page — hiding
  the Admin link isn't the security boundary; the policies are.
