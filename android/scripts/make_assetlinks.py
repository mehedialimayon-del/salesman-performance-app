"""Write Digital Asset Links from the EXACT release APK signing certificate."""
import argparse
import json
import re
import subprocess
from pathlib import Path

PACKAGE = "com.fieldforcehub.mobile"


def assetlinks_from_keytool_output(text):
    m = re.search(r"SHA256:\s*((?:[0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2})", text)
    if not m:
        raise ValueError("No SHA256 certificate fingerprint found")
    return [{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": PACKAGE,
            "sha256_cert_fingerprints": [m.group(1).upper()],
        },
    }]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--keystore", type=Path, required=True)
    p.add_argument("--storepass", required=True)
    p.add_argument("--alias", required=True)
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    if not args.keystore.is_file():
        p.error("Signing keystore was not found")
    cp = subprocess.run([
        "keytool", "-list", "-v", "-keystore", str(args.keystore),
        "-storepass", args.storepass, "-alias", args.alias,
    ], check=True, capture_output=True, text=True)
    value = assetlinks_from_keytool_output(cp.stdout)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print("Asset links JSON generated from production signing certificate.")


if __name__ == "__main__":
    main()
