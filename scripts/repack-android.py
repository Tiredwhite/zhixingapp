"""Repack compiled uni-app assets into the project's existing signed DCloud shell.

This is the documented local fallback when an HBuilderX cloud pack is unavailable.
Signing credentials are loaded from .local/secrets and passed only to apksigner's
child process environment; they are never printed or written to the repository.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_ID = "__UNI__435D6C0"


def run(command, *, env=None):
    subprocess.run(command, check=True, env=env)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True, help="App version, such as 0.3.4")
    parser.add_argument("--code", required=True, type=int, help="Android version code")
    parser.add_argument("--decoded", required=True, type=Path, help="Decoded base APK directory")
    parser.add_argument("--build", type=Path, default=ROOT / "mobile/dist/build/app")
    parser.add_argument("--hbuilderx", type=Path,
                        default=Path(r"D:\code-app\HBuilderX.5.26.2026091802\HBuilderX"))
    args = parser.parse_args()

    decoded = args.decoded.resolve(strict=True)
    build = args.build.resolve(strict=True)
    local = (ROOT / ".local").resolve(strict=True)
    secrets = local / "secrets"
    credentials = json.loads((secrets / "android-signing.json").read_text(encoding="utf-8"))
    keystore = Path(credentials["keystore"]).resolve(strict=True)
    plugin = args.hbuilderx / "plugins/app-safe-pack"
    java = args.hbuilderx / "plugins/amazon-corretto/bin/java.exe"
    apktool = plugin / "apktool.jar"
    signer = plugin / "apksigner.jar"
    zipalign = plugin / "zipalign/zipalign.exe"
    for path in (java, apktool, signer, zipalign):
        if not path.is_file():
            raise SystemExit(f"Required HBuilderX tool is missing: {path}")

    stage = local / f"android-repack-{args.version}"
    if stage.exists():
        raise SystemExit(f"Refusing to overwrite existing staging directory: {stage}")
    shutil.copytree(decoded, stage)

    web_assets = stage / "assets/apps" / APP_ID / "www"
    resolved_assets = web_assets.resolve()
    if not resolved_assets.is_relative_to(stage.resolve()):
        raise SystemExit("Compiled asset destination escaped the private staging directory.")
    if web_assets.exists():
        shutil.rmtree(web_assets)
    shutil.copytree(build, web_assets)

    app_manifest = json.loads((web_assets / "manifest.json").read_text(encoding="utf-8"))
    if app_manifest.get("id") != APP_ID or app_manifest.get("version") != {
            "name": args.version, "code": str(args.code)}:
        raise SystemExit("Compiled App manifest does not match the requested release identity.")

    apktool_yml = stage / "apktool.yml"
    yml = apktool_yml.read_text(encoding="utf-8")
    yml, code_count = re.subn(r"(?m)^  versionCode: \d+$",
                              f"  versionCode: {args.code}", yml)
    yml, name_count = re.subn(r"(?m)^  versionName: .*?$",
                              f"  versionName: {args.version}", yml)
    if code_count != 1 or name_count != 1:
        raise SystemExit("Could not safely update decoded APK version metadata.")
    apktool_yml.write_text(yml, encoding="utf-8")

    release = local / "release"
    release.mkdir(exist_ok=True)
    output = release / f"zhixing-{args.version}.apk"
    if output.exists():
        raise SystemExit(f"Refusing to overwrite an existing release APK: {output}")
    unaligned = stage / "unsigned.apk"
    aligned = stage / "aligned.apk"
    run([str(java), "-jar", str(apktool), "b", str(stage), "-o", str(unaligned)])
    run([str(zipalign), "-f", "-p", "4", str(unaligned), str(aligned)])

    signing_env = os.environ.copy()
    signing_env["ZHIXING_STOREPASS"] = credentials["storePassword"]
    signing_env["ZHIXING_KEYPASS"] = credentials["keyPassword"]
    run([str(java), "-jar", str(signer), "sign", "--ks", str(keystore),
         "--ks-key-alias", credentials["alias"], "--ks-pass", "env:ZHIXING_STOREPASS",
         "--key-pass", "env:ZHIXING_KEYPASS", "--out", str(output), str(aligned)],
        env=signing_env)
    signing_env.pop("ZHIXING_STOREPASS", None)
    signing_env.pop("ZHIXING_KEYPASS", None)

    print(f"Created signed APK: {output}")
    print("Run scripts/inspect-android.py next to verify package identity, signature, permissions, and secrets.")


if __name__ == "__main__":
    main()
