"""Explicit real-provider checks with authored sample text; never prints credentials."""
import json
import time
from pathlib import Path
from uuid import uuid4

import httpx

from app.config import Settings

settings = Settings()
token = settings.demo_access_token.get_secret_value()
headers = {'Authorization': f'Bearer {token}'} if token else {}
cases = [
    ('clear', '请于2026年10月23日18:00前提交项目书PDF至教学平台。请准备3分钟演示视频。答辩时间另行通知。'),
    ('ambiguous', '请各小组明天下午到实验楼102室领取设备，携带学生证。'),
    ('no_action', '校园图书馆本月推出了新的阅读空间，欢迎了解相关介绍。'),
]
records = []
with httpx.Client(timeout=27) as client:
    health = client.get('http://127.0.0.1:8000/healthz').json()
    if not health['ai_configured']:
        raise SystemExit('Model key not configured; no live request made')
    for name, text in cases:
        started = time.monotonic()
        response = client.post('http://127.0.0.1:8000/api/v1/parse', headers=headers, json={
            'request_id': str(uuid4()), 'text': text, 'source_time': None, 'timezone': 'Asia/Shanghai',
        })
        body = response.json()
        row = {'case': name, 'status': response.status_code, 'elapsed_ms': round((time.monotonic() - started) * 1000),
               'request_id': body.get('request_id'), 'mode': body.get('mode'), 'model': body.get('model_id'),
               'error_code': body.get('code'), 'items': body.get('items', []), 'warnings': body.get('warnings', [])}
        records.append(row)
report = Path(__file__).resolve().parents[2] / '.local' / 'live-smoke.json'
report.parent.mkdir(exist_ok=True)
report.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
for row in records:
    print(json.dumps({k: v for k, v in row.items() if k not in ('items', 'warnings')} | {'items': len(row['items'])}, ensure_ascii=True))
print('Report saved under .local (not committed)')
