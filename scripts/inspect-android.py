"""Inspect a signed APK with the official tools bundled in HBuilderX.

Run with the server virtualenv Python. No phone installation is performed.
Reports only public certificate fingerprints and metadata, never credentials.
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path
from zipfile import ZipFile

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = 'cn.tiredwhite.zhixing'
APPID = '__UNI__435D6C0'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('apk', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--hbuilderx', type=Path, default=Path(r'D:\code-app\HBuilderX.5.26.2026091802\HBuilderX'))
    args = parser.parse_args()
    apk = args.apk.resolve(strict=True)
    plugin = args.hbuilderx / 'plugins/app-safe-pack'
    tool = ROOT / '.local/tools/aapt_64.exe'
    tool.parent.mkdir(parents=True, exist_ok=True)
    if not tool.exists():
        with ZipFile(plugin/'apktool.jar') as archive:
            tool.write_bytes(archive.read('prebuilt/windows/aapt_64.exe'))
    apk_hash = hashlib.sha256(apk.read_bytes()).hexdigest()
    tool_apk = apk
    # The bundled Windows aapt rejects Unicode APK filenames. Inspect an exact
    # hash-named copy while reporting the user's original delivery filename.
    if not str(apk).isascii():
        tool_apk = tool.parent / ('inspect-'+apk_hash+'.apk')
        if not tool_apk.exists():
            shutil.copyfile(apk, tool_apk)
        if hashlib.sha256(tool_apk.read_bytes()).hexdigest() != apk_hash:
            raise SystemExit('Inspection copy does not match the original APK.')
    badging = subprocess.run([str(tool), 'dump', 'badging', str(tool_apk)], capture_output=True, text=True,
                             encoding='utf-8', errors='replace', check=True).stdout
    signature = subprocess.run([str(args.hbuilderx/'plugins/amazon-corretto/bin/java.exe'), '-jar',
                                str(plugin/'apksigner.jar'), 'verify', '--verbose', '--print-certs', str(tool_apk)],
                               capture_output=True, text=True, encoding='utf-8', errors='replace')
    info = re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging)
    if not info:
        raise SystemExit('Could not read APK identity')
    permissions = sorted(set(re.findall(r"uses-permission: name='([^']+)'", badging)))
    allowed = {'android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE',
               'android.permission.READ_CALENDAR', 'android.permission.WRITE_CALENDAR',
               PACKAGE+'.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'}
    secret_values = []
    env = ROOT/'.local/secrets/server.production.env'
    if env.exists():
        values = dotenv_values(env)
        secret_values.extend(value.encode() for key,value in values.items()
                             if value and key in ('MODEL_API_KEY','DEMO_ACCESS_TOKEN'))
    signing = ROOT/'.local/secrets/android-signing.json'
    if signing.exists():
        values = json.loads(signing.read_text(encoding='utf-8'))
        secret_values.extend(values[key].encode() for key in ('storePassword','keyPassword'))
    file_hits, value_hits, app_ids, embedded_signing = [], [], [], []
    with ZipFile(apk) as archive:
        corrupt = archive.testzip()
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            name = entry.filename
            data = archive.read(entry)
            if Path(name).name.startswith('.env') or Path(name).suffix.lower() in ('.jks','.keystore','.key','.pem'):
                file_hits.append(name)
            if any(value in data for value in secret_values):
                value_hits.append(name)
            if name.startswith('assets/apps/') and name.endswith('/www/manifest.json'):
                manifest = json.loads(data)
                app_ids.append(manifest.get('id'))
                google = manifest.get('plus',{}).get('distribute',{}).get('google',{})
                embedded_signing += [key for key in ('password','keypwd','storepwd','keystore') if google.get(key)]
    cert = re.search(r'Signer #1 certificate SHA-256 digest: ([a-f0-9]+)', signature.stdout)
    abis = re.findall(r"'([^']+)'", next((line for line in badging.splitlines() if line.startswith('native-code:')), ''))
    passed = (signature.returncode == 0 and 'Verified using v2 scheme (APK Signature Scheme v2): true' in signature.stdout
              and info.group(1) == PACKAGE and app_ids == [APPID] and set(abis) == {'arm64-v8a','armeabi-v7a'}
              and not (set(permissions)-allowed) and not file_hits and not value_hits and not embedded_signing
              and corrupt is None)
    report = {
        'apk': apk.name, 'bytes': apk.stat().st_size, 'sha256': apk_hash,
        'package':info.group(1), 'version_code':info.group(2), 'version_name':info.group(3), 'app_ids':app_ids,
        'min_sdk':re.search(r"sdkVersion:'([^']+)'",badging).group(1),
        'target_sdk':re.search(r"targetSdkVersion:'([^']+)'",badging).group(1),
        'abis':abis, 'permissions':permissions, 'unexpected_permissions':sorted(set(permissions)-allowed),
        'signature_verified':signature.returncode == 0, 'signature_v2': 'Verified using v2 scheme (APK Signature Scheme v2): true' in signature.stdout,
        'certificate_sha256':cert.group(1) if cert else None,
        'signer_warning_count':(signature.stdout+signature.stderr).count('WARNING:'),
        'private_value_scan_configured':bool(secret_values), 'private_value_matches':len(value_hits),
        'private_file_matches':len(file_hits), 'embedded_signing_fields':embedded_signing,
        'zip_crc_valid':corrupt is None, 'checks_passed':passed,
        'phone_installation': 'not tested',
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if not passed:
        raise SystemExit('APK inspection requires follow-up; see public metadata above.')


if __name__ == '__main__':
    main()
