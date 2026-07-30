#!/usr/bin/env bash
# Generate the Android UPLOAD keystore on YOUR machine, then print the
# commands to load the CI secrets. Run this yourself — never let automation
# store the key or its passwords. Back up the .jks file somewhere safe.
set -euo pipefail

KS="nncc-upload-key.jks"
ALIAS="nncc-upload"

if [ -f "$KS" ]; then echo "$KS already exists — not overwriting."; exit 0; fi

echo "You'll be asked for a keystore password (choose a strong one and SAVE it)."
keytool -genkeypair -v \
  -keystore "$KS" -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000

echo
echo "=== Set these as GitHub repo secrets (Settings → Secrets and variables → Actions) ==="
echo "Run each line yourself; replace <...> with the passwords you just chose."
echo
echo "  gh secret set ANDROID_KEYSTORE_BASE64 --body \"\$(base64 -w0 $KS)\""
echo "  gh secret set ANDROID_KEYSTORE_PASSWORD --body '<your keystore password>'"
echo "  gh secret set ANDROID_KEY_ALIAS --body '$ALIAS'"
echo "  gh secret set ANDROID_KEY_PASSWORD --body '<your key password>'"
echo
echo "(No gh CLI? Paste the same values in the GitHub Secrets web UI. For the"
echo " base64 one on macOS use:  base64 -i $KS | pbcopy )"
