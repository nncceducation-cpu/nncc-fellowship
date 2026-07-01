# Deploying the NNCC Fellowship Website

A plain-English, step-by-step guide to putting this website online on your own domain.

This site is **static HTML/CSS** — the easiest, cheapest, most secure kind of site to host. You do **not** need a server, a database, or any coding to publish it.

---

## First, the one concept that trips everyone up

A **domain** and **hosting** are two different things:

- **Domain** = the address people type (e.g. `nnccfellowship.com`). You rent this from Namecheap (~$10–15/year).
- **Hosting** = the computer that actually stores your files and serves them to visitors. This is separate.

So the plan is always: **buy the domain at Namecheap → put the files on a host → point the domain at the host.**

Both routes below use a **free** host. Your only cost is the domain.

---

## What's in this folder

```
nncc-website-deploy/
├── index.html            ← Home page (open this to preview locally)
├── fellowship.html       ← Program & Curriculum
├── competencies.html     ← Competencies
├── assessment.html       ← Assessment & Portfolio
├── governance.html       ← Governance & People
├── innovation.html       ← Innovation Lab
├── styles.css            ← Shared styling for all pages
├── netlify.toml          ← Optional Netlify config (safe to ignore)
├── .gitignore            ← For the GitHub route
├── README.md
├── DEPLOYMENT-GUIDE.md   ← This file
└── images/
    ├── download-images.sh    ← Optional: bundle images locally (Mac/Linux)
    ├── download-images.ps1   ← Optional: bundle images locally (Windows)
    └── README.txt
```

To preview right now, just double-click **index.html** — it opens in your browser.

---

## Optional first step: make the site fully self-contained

Right now the photos load from Thinkific's servers (the same place your current site keeps them). The pages will display correctly as long as those image links stay live.

If you'd rather **bundle the images into this folder** so the site never depends on Thinkific, run the included script **on your own computer** (it downloads the 9 images and rewrites the pages to use local copies):

- **Windows:** right-click `images/download-images.ps1` → *Run with PowerShell*
  (or in PowerShell: `powershell -ExecutionPolicy Bypass -File images\download-images.ps1`)
- **Mac / Linux:** in Terminal, from this folder: `bash images/download-images.sh`

You can skip this and deploy as-is; the site works either way.

---

# Route A — Namecheap domain + Netlify  *(recommended: easiest, no coding)*

Netlify hosts static sites free, gives you automatic HTTPS, a global CDN, and lets you update the site by dragging a folder. Total setup time: ~15 minutes.

### Step 1 — Create a Netlify account
Go to **netlify.com** → *Sign up* (free). You can sign up with email or a GitHub/Google account.

### Step 2 — Put the site online (drag-and-drop)
1. In the Netlify dashboard, click **Add new site → Deploy manually**.
2. Drag **this whole folder** (the one containing `index.html`) onto the upload area.
3. In a few seconds your site is live at a random address like `https://calm-otter-12345.netlify.app`. Click it to confirm everything looks right.

> Tip: rename the site under **Site configuration → Change site name** to something tidy like `nncc-fellowship` → `nncc-fellowship.netlify.app`.

### Step 3 — Buy your domain at Namecheap
On **namecheap.com**, search for the domain you want (e.g. `nnccfellowship.com`), add to cart, and complete checkout.

### Step 4 — Add the domain in Netlify
1. In Netlify: **Domain management → Add a domain**.
2. Type your domain (e.g. `nnccfellowship.com`) and confirm. Netlify automatically sets up both `nnccfellowship.com` and `www.nnccfellowship.com`.

### Step 5 — Point Namecheap at Netlify
Choose **one** of these two methods:

**Method 1 — Netlify DNS (simplest, recommended).** Let Netlify run your DNS.
1. When you add the domain, Netlify offers **"Set up Netlify DNS"** and shows **4 nameservers** (like `dns1.p03.nsone.net`, …). Copy them.
2. In Namecheap: **Domain List → Manage** (next to your domain) → **Nameservers** → choose **Custom DNS** → paste the 4 Netlify nameservers → click the green ✓ to save.
3. Done. Netlify handles the rest.

**Method 2 — Keep Namecheap's DNS.** Add records manually.
1. In Namecheap: **Domain List → Manage → Advanced DNS**.
2. **Delete** the two default records Namecheap adds (a `CNAME Record` for `www` pointing to `parkingpage…`, and a `URL Redirect Record` for `@`).
3. Add these records:

   | Type          | Host  | Value                          |
   |---------------|-------|--------------------------------|
   | A Record      | `@`   | `75.2.60.5`                    |
   | CNAME Record  | `www` | `YOUR-SITE.netlify.app`        |

   (Replace `YOUR-SITE` with your actual Netlify subdomain from Step 2.)

### Step 6 — HTTPS (the padlock)
Netlify provisions a free Let's Encrypt SSL certificate automatically once DNS resolves. Under **Domain management → HTTPS**, you'll see it go from pending to active (usually minutes, occasionally up to a day). Nothing to buy.

### Updating the site later
- **Quick way:** make your edits, then drag the updated folder onto **Deploys** again — it replaces the live site in seconds.
- **Automatic way:** connect a GitHub repo (see Route B) to Netlify once, and every change you push goes live automatically.

---

# Route B — Namecheap domain + GitHub Pages  *(free, with version history)*

GitHub Pages hosts static sites free and keeps a full history of every change. Slightly more technical than Netlify, but great if you want a record of edits.

### Step 1 — Create a GitHub account
Sign up at **github.com** (free).

### Step 2 — Create a repository
1. Click **+ → New repository**.
2. Name it (e.g. `nncc-fellowship`), set it to **Public**, and click **Create repository**.

### Step 3 — Upload the site files
Easiest (no Git needed):
1. On the empty repo page, click **uploading an existing file**.
2. Drag in **all the files from this folder** — `index.html`, the other `.html` files, `styles.css`, and the `images` folder.
   > Important: `index.html` must sit at the **top level** of the repo, not inside a subfolder.
3. Click **Commit changes**.

### Step 4 — Turn on GitHub Pages
1. In the repo: **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)** → **Save**.
4. After a minute your site is live at `https://YOUR-USERNAME.github.io/nncc-fellowship/`.

### Step 5 — Add your custom domain
1. Buy the domain at Namecheap (as in Route A, Step 3).
2. In the repo: **Settings → Pages → Custom domain** → type `nnccfellowship.com` → **Save**. (This adds a `CNAME` file to your repo automatically.)

### Step 6 — Point Namecheap at GitHub
In Namecheap: **Domain List → Manage → Advanced DNS**. **Delete** the default `www` CNAME (to `parkingpage…`) and the `@` URL Redirect record, then add:

**Apex domain (the A records):**

| Type     | Host | Value             |
|----------|------|-------------------|
| A Record | `@`  | `185.199.108.153` |
| A Record | `@`  | `185.199.109.153` |
| A Record | `@`  | `185.199.110.153` |
| A Record | `@`  | `185.199.111.153` |

**The www subdomain:**

| Type          | Host  | Value                       |
|---------------|-------|-----------------------------|
| CNAME Record  | `www` | `YOUR-USERNAME.github.io.`  |

(Use your GitHub username, **without** the repo name. The trailing dot is optional in Namecheap.)

*Optional — IPv6:* you can also add four `AAAA` records for `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.

### Step 7 — Enforce HTTPS
Back in **Settings → Pages**, wait for the certificate to provision (can take up to 24 hours), then tick **Enforce HTTPS**.

### Updating the site later
Edit any file directly on GitHub (click the file → pencil icon → commit), or push changes with Git. GitHub Pages rebuilds automatically within a minute.

---

## Where to click in Namecheap (quick reference)

- **Change nameservers:** Domain List → **Manage** → *Nameservers* section → **Custom DNS**.
- **Add/edit DNS records:** Domain List → **Manage** → **Advanced DNS** tab → *Host Records* → **Add New Record**.
- Always **delete Namecheap's two default records** (the `www` parking CNAME and the `@` URL redirect) or they'll fight your new ones.
- `@` in the Host field means the bare domain (`nnccfellowship.com`); `www` means `www.nnccfellowship.com`.

---

## Netlify vs GitHub Pages — which to pick

| | **Netlify** | **GitHub Pages** |
|---|---|---|
| Cost | Free | Free |
| Setup difficulty | Easiest (drag & drop) | A little more technical |
| Update method | Drag folder, or Git | Edit on GitHub, or Git |
| Version history | Only if you use Git | Built in |
| Custom domain + HTTPS | Yes, automatic | Yes, automatic |
| Best for | Getting online fastest | Keeping a change history |

**Recommendation:** start with **Netlify** if you just want it live quickly. Move to (or add) **GitHub** later if you want tracked history and automatic deploys.

---

## Troubleshooting

- **"This site can't be reached" right after setup.** DNS changes take time to spread — anywhere from a few minutes to 24–48 hours. Be patient; check again later.
- **"Not secure" warning / no padlock.** The SSL certificate is still provisioning. Wait (up to 24h on GitHub Pages), then make sure "Enforce HTTPS" is on.
- **Page loads but looks unstyled.** `styles.css` must be in the **same folder** as the HTML files. Don't move it into a subfolder.
- **404 / blank on the homepage.** `index.html` must be at the **root** (top level) of what you uploaded, not inside another folder.
- **Images missing.** Either the Thinkific links changed, or you're offline — run the `download-images` script to bundle images locally and remove that dependency.
- **Namecheap won't save an A record for `@`.** Make sure you deleted the default "URL Redirect Record" for `@` first; the two can't coexist.

---

## A note about the images

The photographs currently load from Thinkific's CDN, so an internet connection is required to see them and they depend on those links staying live. Running the included `download-images` script makes the site fully self-contained. The icons and all page styling are built into the files and need nothing external (except the Google Fonts link, which also just needs an internet connection).
