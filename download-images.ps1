BUNDLING THE IMAGES LOCALLY (optional)
======================================

By default the website loads its photographs from Thinkific's servers (CDN).
The pages display correctly as long as those links stay live and you have an
internet connection.

If you want the site to be fully self-contained (no dependency on Thinkific),
run one of the scripts in this folder ON YOUR OWN COMPUTER. Each script:

  1. Downloads the 9 photographs into this images/ folder, and
  2. Rewrites the HTML pages to point at the local copies.

WINDOWS
-------
Right-click "download-images.ps1"  ->  Run with PowerShell
   or, in a PowerShell window opened in the site folder:
   powershell -ExecutionPolicy Bypass -File images\download-images.ps1

MAC / LINUX
-----------
Open Terminal in the site folder (the one containing index.html) and run:
   bash images/download-images.sh

After it finishes, open index.html to confirm the images still appear, then
deploy the folder as described in DEPLOYMENT-GUIDE.md.

To undo, just re-copy the original HTML files (or restore the .bak files the
script leaves behind before you delete them).
