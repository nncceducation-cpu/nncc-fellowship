#!/usr/bin/env python3
"""Re-apply Android settings that `npx cap add android` / `cap sync` wipe.
Run AFTER the android/ project is (re)generated. Reads config from env:
  ANDROID_VERSION_CODE, ANDROID_VERSION_NAME  (build numbering)
  KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD (release signing)
Self-verifies and prints every change so CI fails loudly on a miss.
"""
import os, re, sys, pathlib

ROOT = pathlib.Path("android")
SDK = "35"                      # Play requires API 35 (bump to 36 before 31 Aug 2026)
changes = []

def edit(path, subs, label):
    p = ROOT / path
    if not p.exists():
        sys.exit(f"[patch-android] MISSING {p} — was `cap add android` run first?")
    txt = p.read_text()
    for pat, repl in subs:
        new, n = re.subn(pat, repl, txt)
        if n:
            txt = new; changes.append(f"{path}: {label}")
    p.write_text(txt)

# 1) SDK levels
edit("variables.gradle", [
    (r"compileSdkVersion\s*=\s*\d+", f"compileSdkVersion = {SDK}"),
    (r"targetSdkVersion\s*=\s*\d+",  f"targetSdkVersion = {SDK}"),
], f"compile/target SDK -> {SDK}")

# 2) version code / name
vc = os.environ.get("ANDROID_VERSION_CODE", "1")
vn = os.environ.get("ANDROID_VERSION_NAME", "1.0.0")
edit("app/build.gradle", [
    (r"versionCode\s+\d+",         f"versionCode {vc}"),
    (r'versionName\s+"[^"]*"',      f'versionName "{vn}"'),
], f"version {vn} ({vc})")

# 3) release signing config injected from env
ks   = os.environ.get("KEYSTORE_PATH")
kspw = os.environ.get("KEYSTORE_PASSWORD")
al   = os.environ.get("KEY_ALIAS")
alpw = os.environ.get("KEY_PASSWORD")
if ks and kspw and al and alpw:
    bg = (ROOT / "app/build.gradle").read_text()
    if "signingConfigs" not in bg:
        block = (
            "    signingConfigs {\n"
            "        release {\n"
            f'            storeFile file(System.getenv("KEYSTORE_PATH"))\n'
            f'            storePassword System.getenv("KEYSTORE_PASSWORD")\n'
            f'            keyAlias System.getenv("KEY_ALIAS")\n'
            f'            keyPassword System.getenv("KEY_PASSWORD")\n'
            "        }\n"
            "    }\n"
        )
        bg = re.sub(r"(android\s*\{\s*\n)", r"\1" + block, bg, count=1)
        # attach to release buildType
        bg = re.sub(r"(buildTypes\s*\{\s*\n\s*release\s*\{\s*\n)",
                    r"\1            signingConfig signingConfigs.release\n", bg, count=1)
        (ROOT / "app/build.gradle").write_text(bg)
        changes.append("app/build.gradle: injected release signingConfig")
else:
    print("[patch-android] no signing env set — building unsigned (debug) only")

if not changes:
    sys.exit("[patch-android] nothing changed — patterns did not match; check template version")
print("[patch-android] applied:\n  - " + "\n  - ".join(changes))
