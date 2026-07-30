# NNCC Portal — Mobile App Runbook

Turns the existing portal (sarnatnncc.ca) into installable iPhone + Android apps using
**Capacitor**. One codebase: the app bundles the portal's page shells, and course /
webinar / forum content keeps streaming live from Supabase — so most updates need **no**
app resubmission.

- App name: **NNCC Portal**  ·  App ID: **ca.sarnatnncc.portal**
- Apple Developer account: khorshid.mohammadprofcorp@gmail.com
- Google Play account: nncceducation@gmail.com

---

## What was added to the repo
| File | Purpose |
|------|---------|
| `capacitor.config.json` | App id, name, splash config |
| `package.json` | Capacitor dependencies + build scripts |
| `tools/build-www.mjs` | Assembles the `www/` bundle the app ships |
| `manifest.webmanifest`, `sw.js`, `offline.html` | Web/PWA install + offline shell |
| `app-boot.js` | Bottom tab bar (Home · Courses · Webinars · Forum) + PWA/native glue |
| `portal-mobile.css` | Phone polish: tap targets, safe-area insets, fluid video |
| `resources/icon.png`, `resources/splash.png` | App icon + splash (from your logo) |
| `.github/workflows/android.yml` | CI: builds a **signed** Android `.aab` |
| `.github/workflows/ios.yml` | CI: builds a signed iOS `.ipa` and uploads to TestFlight |
| `scripts/make-keystore.sh` | You run this to create the Android signing key |
| `scripts/patch-android.py` | Re-applies SDK/version/signing after each build |
| `store/` | Listing copy, privacy + data-safety answers, review notes, screenshot spec |

The generated `www/`, `ios/`, `android/`, `node_modules/` are git-ignored — CI regenerates them.

---

## Stage 0 — Get these files into your repo
Everything above is in the delivered project folder. Commit it to
`github.com/nncceducation-cpu/nncc-fellowship` on a new branch `mobile-app`, then merge.
(I can walk you through the push, or drive it in your browser.)

Once pushed, Netlify/GitHub Pages redeploys sarnatnncc.ca automatically — the **PWA goes
live immediately** (members can already "Add to Home Screen" and the bottom tab bar appears
on phones). That's your instant test channel while the stores review.

## Stage 1 — Android signing key (you, once)
On your Mac/PC in a clone of the repo:
```
bash scripts/make-keystore.sh
```
It creates `nncc-upload-key.jks` and prints the exact commands to store 4 GitHub secrets:
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`. **Back up the .jks file** and keep the passwords safe.
(I never touch the key or passwords — that's yours to control.)

## Stage 2 — Apple signing secrets (you, once)
In App Store Connect → Users and Access → **Integrations → App Store Connect API** → create a
key with **App Manager** access. Download the `.p8` (one-time). Then set GitHub secrets:
`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` (base64 of the .p8), `APPLE_TEAM_ID`.
If a `.p8` is ever pasted anywhere public, revoke it immediately.

## Stage 3 — Build the apps (CI does the heavy lifting)
GitHub → **Actions**:
- Run **Build Android (.aab)** → download the `nncc-portal-android-aab` artifact.
- Run **Build iOS (.ipa)** → it uploads straight to TestFlight; the `.ipa` is also an artifact.
(The Android release bundle is memory-hungry and is built on CI, not locally, on purpose.)

## Stage 4 — Google Play
1. Play Console → create app "NNCC Portal", app id `ca.sarnatnncc.portal`.
2. Fill the listing from `store/store-listing.md`; icon = `android-chrome-512x512.png`;
   feature graphic 1024×500; screenshots per `store/screenshot-spec.md`.
3. Complete **Data safety** using `store/privacy-and-data-safety.md` (this app DOES collect
   email/name — do not answer "no data collected"). Add the privacy policy URL.
4. Upload the `.aab` to **Closed testing** (not internal — see below).
5. Wait for the **initial review to pass**: Publishing overview → Submission activity →
   status flips to **Published**. Until then testers see "(unreviewed)" and downloads fail
   with "Item not found" — that's normal, not a delay to wait out differently.
6. **The 14-day rule:** personal Play accounts need **≥12 testers opted in, held continuously
   for 14 days** before production unlocks. Circulate the **closed** opt-in link
   `play.google.com/apps/testing/ca.sarnatnncc.portal` (NOT the internal link). Each tester must
   tap **Become a tester**. Don't attach your tester list to the Internal track or it steals
   priority and those opt-ins won't count. **Start collecting 12+ tester emails now.**
7. After 14 days at ≥12: apply for production access → promote to Production.

## Stage 5 — Apple App Store
1. App Store Connect → new app, bundle id `ca.sarnatnncc.portal`, category Medical.
2. TestFlight: the CI upload appears after processing; add testers to try it immediately.
3. Fill metadata from `store/store-listing.md`; **App Privacy** per
   `store/privacy-and-data-safety.md`; screenshots at EXACT sizes (1284×2778 iPhone,
   2048×2732 iPad — universal build requires iPad shots).
4. Paste `store/review-notes.md` into the reviewer notes and include a **test account**
   (create a reviewer login in Supabase). Submit → status "Waiting for Review."

## Credentials & final clicks
I prepare everything and give exact steps, but **you** enter every password and press the
final **Submit / Send for review / Publish** buttons on both consoles. I won't type
credentials or push the irreversible submit.

## When you change the site later
- Content (modules, events, forum) is live from Supabase → nothing to do.
- If you change the HTML/CSS/JS shells: bump `CACHE_VERSION` in `sw.js`, push (PWA updates),
  and re-run the two CI builds with an incremented version to ship a store update.
