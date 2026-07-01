#!/usr/bin/env bash
#
# Downloads the site photographs into images/ and rewrites the HTML pages to
# use the local copies, making the website fully self-contained.
#
# Run from anywhere:  bash images/download-images.sh
# (It locates the site root automatically.)
#
set -euo pipefail

# Move to the site root (parent of this script's folder).
cd "$(dirname "$0")/.."

mkdir -p images

# url|local-path  (one pair per line)
PAIRS='
https://files.cdn.thinkific.com/file_uploads/278624/images/387/9ed/d91/H.Sarnat2.jpg|images/harvey-sarnat.jpg
https://s3.amazonaws.com/thinkific/file_uploads/278624/images/7ae/ff5/b1b/1.jpg|images/cranial-phantom.jpg
https://s3.amazonaws.com/thinkific/file_uploads/278624/images/200/a54/7b4/2.jpg|images/cranial-simulator.jpg
https://s3.amazonaws.com/thinkific/file_uploads/278624/images/345/0e0/6a4/4.jpg|images/doppler-model.jpg
https://files.cdn.thinkific.com/file_uploads/278624/images/e91/569/e27/Slide1.PNG|images/mca-model.png
https://s3.amazonaws.com/thinkific/file_uploads/278624/images/038/3c7/eba/5.jpg|images/neuro-exam-simulator.jpg
https://s3.amazonaws.com/thinkific/file_uploads/278624/images/331/ccf/fc2/6.jpg|images/neuro-mannequin.jpg
https://s3.amazonaws.com/thinkific/file_uploads/278624/images/854/7e7/ee0/7.jpg|images/eeg-simulator.jpg
https://s3.amazonaws.com/thinkific/file_uploads/278624/images/b40/1cb/44d/8.png|images/eeg-teaching.png
'

echo "Downloading images..."
echo "$PAIRS" | while IFS='|' read -r url out; do
  [ -z "$url" ] && continue
  echo "  -> $out"
  curl -fsSL "$url" -o "$out"
done

echo "Rewriting HTML to use local images..."
for f in *.html; do
  [ -e "$f" ] || continue
  cp "$f" "$f.bak"
  echo "$PAIRS" | while IFS='|' read -r url out; do
    [ -z "$url" ] && continue
    # '#' delimiter avoids clashing with the slashes in URLs.
    sed -i.tmp "s#${url}#${out}#g" "$f"
  done
  rm -f "$f.tmp"
done

# Remove backups once done (comment out the next line to keep them).
rm -f ./*.bak

echo "Done. Images are bundled in images/ and the pages now use local copies."
