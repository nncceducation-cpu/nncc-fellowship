# Screenshots — exact dimensions (rejections are instant)

Capture on the LIVE app once the mobile UI is deployed (sarnatnncc.ca/login.html →
sign in → each screen). Capture in a phone viewport, then resize to EXACT pixels below.

## Apple App Store (required)
- iPhone 6.5" display: **1284 × 2778** px  (do NOT use 1290×2796 — rejected for this slot)
- iPad 13" display:     **2048 × 2732** px  (REQUIRED because Capacitor ships a universal build;
  to avoid iPad shots, set the app to iPhone-only in Xcode target → Deployment Info)
- 3–5 screenshots each. Suggested screens: Dashboard, a Course lesson with video,
  Coaching & Webinars, Forum, Certificate.

## Google Play (required)
- Phone: 2–8 screenshots, 16:9 or 9:16, min 1080 px on the short side (1080 × 1920 is safe)
- 7" tablet and 10" tablet screenshots (recommended; some flows require them)
- Feature graphic: **1024 × 500** px (no transparency)
- App icon: 512 × 512 (already have android-chrome-512x512.png)

## How to generate reproducibly (after deploy)
Use headless Chromium (Playwright) at the exact device viewport, log in with a test account,
navigate to each screen, screenshot, then resize to the pixel spec above. Ask me to run this
step once the mobile UI is live and I'll produce all the sized PNGs + the 1024×500 feature graphic.
