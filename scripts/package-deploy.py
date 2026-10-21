"""Package prebuilt assets and explicit server inputs, never local secrets."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ".local" / "release" / "zhixing-deploy.zip"


def main():
    entries = {}
    for source, target in [
        ("server/app", "server/app"),
        ("mobile/dist/build/h5", "web"),
        ("mobile/dist/build/app", "app-resources"),
    ]:
        folder = ROOT / source
        if not folder.is_dir():
            raise SystemExit(f"Missing build input: {source}")
        for item in sorted(folder.rglob("*")):
            if not item.is_file() or "__pycache__" in item.parts:
                continue
            if item.name.startswith(".env") or item.suffix in {".pyc", ".pem", ".key", ".jks", ".keystore"}:
                raise SystemExit("Unexpected secret or runtime file in release input")
            entries[f"{target}/{item.relative_to(folder).as_posix()}"] = item.read_bytes()
    for name in [
        "server/requirements.txt", "server/.env.example",
        "deploy/Dockerfile", "deploy/compose.yaml", "deploy/nginx.conf.example",
        "deploy/inspect-server.sh", "deploy/zhixing.service.example", "deploy/renew-nginx.sh", "docs/deployment.md", "docs/testing.md",
        "docs/dependency-review.md", ".dockerignore",
    ]:
        entries[name] = (ROOT / name).read_bytes()
    entries["README.txt"] = (
        "知行部署准备包\n"
        "web/ 为已构建的静态网页；app-resources/ 为App资源，不是APK。\n"
        "未包含模型密钥、访问令牌、数据库或签名文件。\n"
        "目标服务器已有部署验收记录，见 docs/deployment.md 与 docs/testing.md。\n"
        "当前归档用于重建或迁移，每次安装仍须核对实际环境。\n"
        "先核对服务器环境和依赖审查记录，再按 docs/deployment.md 配置。\n"
        "inspect-server.sh 只读取环境信息，不安装或重启服务。\n"
    ).encode("utf-8")
    manifest = {name: hashlib.sha256(data).hexdigest() for name, data in sorted(entries.items())}
    entries["SHA256.json"] = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo(name)
            info.create_system = 3
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o100644 << 16)
            archive.writestr(info, data)
    with zipfile.ZipFile(OUTPUT) as archive:
        assert archive.testzip() is None
        for name, expected in manifest.items():
            assert hashlib.sha256(archive.read(name)).hexdigest() == expected
    print(f"Package: {OUTPUT}\nFiles: {len(entries)}\nBytes: {OUTPUT.stat().st_size}")


if __name__ == "__main__":
    main()
