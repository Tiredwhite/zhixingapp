"""Create a portable-source copy for HBuilderX without modifying the source tree.

The existing signing certificate and credentials stay in .local/secrets.
This command prepares files only. It does not submit a cloud build.
"""
import json
import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    signing = ROOT/'.local/secrets/android-signing.json'
    if not signing.is_file():
        raise SystemExit('Existing project signing configuration is required. Do not generate a new update certificate.')
    credentials = json.loads(signing.read_text(encoding='utf-8'))
    keystore = Path(credentials['keystore'])
    if not keystore.is_file():
        raise SystemExit('Project keystore is missing; restore the private backup first.')
    stage = ROOT/'.local'/('android-hx-'+datetime.now().strftime('%Y%m%d-%H%M%S'))
    if stage.exists():
        raise SystemExit('Staging directory already exists. Refusing to overwrite an active build.')
    shutil.copytree(ROOT/'mobile/src', stage, ignore=shutil.ignore_patterns('unpackage','.hbuilderx','__pycache__'))
    manifest_path = stage/'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    icons = manifest['app-plus']['distribute']['icons']['android']
    for density, relative in icons.items():
        icon = (stage/relative).resolve(strict=True)
        if stage.resolve() not in icon.parents:
            raise SystemExit('Icon path must stay inside the prepared source directory.')
        icons[density] = icon.as_posix()
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    config = {
        'project':str(stage), 'platform':'android', 'safemode':True, 'sourceMap':False,
        'isconfusion':False, 'splashads':False, 'rpads':False, 'unimpads':False,
        'android':{
            'packagename':'cn.tiredwhite.zhixing', 'androidpacktype':0,
            'certfile':str(keystore), 'certalias':credentials['alias'],
            'certpassword':credentials['keyPassword'], 'storepassword':credentials['storePassword'],
            'antiResignAppid':True, 'antiResignPackageName':True, 'antiResignCertificate':False,
        },
    }
    output = ROOT/'.local'/(stage.name+'-pack.json')
    output.write_text(json.dumps(config,indent=2),encoding='utf-8')
    print('Prepared source:',stage)
    print('Private build config:',output)
    print('Import the prepared source, then pass the config to HBuilderX CLI pack --config.')
    print('No cloud task submitted. Signing credentials were not printed.')


if __name__ == '__main__':
    main()
