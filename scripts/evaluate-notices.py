"""Explicit live evaluation of synthetic notices; never runs during normal tests.

Run with server/.venv/Scripts/python.exe scripts/evaluate-notices.py --live.
Uses the deployment token from the ignored production env, never the model key.
The reference annotations are AI drafted and require independent human review.
"""
import argparse
import hashlib
import json
import math
import time
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import httpx
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]


def evaluate(case, response):
    items = response.get('items', [])
    expected = case['expected']
    available = set(range(len(items)))
    checks = {'action_count': len(items) == len(expected)}
    for index, reference in enumerate(expected):
        match = next((j for j in sorted(available) if all(
            word in items[j].get('action', '') for word in reference['action_keywords'])), None)
        checks[f'{index}.action'] = match is not None
        if match is None:
            for field in ('due_date', 'due_at', 'location', 'materials'):
                checks[f'{index}.{field}'] = False
            continue
        available.remove(match)
        actual = items[match]
        for field in ('due_date', 'due_at', 'location'):
            checks[f'{index}.{field}'] = actual.get(field) == reference[field]
        checks[f'{index}.materials'] = sorted(actual.get('materials', [])) == sorted(reference['materials'])
    quotes = []
    for item in items:
        evidence = item.get('evidence', {})
        quotes.extend(evidence.get(field) for field in ('action', 'due', 'location'))
        quotes.extend(evidence.get('materials', []))
    # Membership only establishes verbatim grounding, not semantic correctness.
    grounding = all(quote in case['text'] for quote in quotes if quote)
    review = bool(response.get('warnings')) or any(item.get('review_reasons') for item in items)
    return {'checks': checks, 'quote_membership': grounding, 'review_visible': review}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live', action='store_true', help='Consume real model quota')
    args = parser.parse_args()
    if not args.live:
        parser.error('Live calls require explicit --live')
    fixture_path = ROOT / 'evaluation/notices.v1.json'
    fixture = json.loads(fixture_path.read_text(encoding='utf-8'))
    token = dotenv_values(ROOT / '.local/secrets/server.production.env').get('DEMO_ACCESS_TOKEN')
    if not token:
        raise SystemExit('Production connection token is not configured.')
    out = ROOT / '.local/evaluation'
    out.mkdir(parents=True, exist_ok=True)
    report_path = out / 'notices-v1-results.json'
    if report_path.exists():
        raise SystemExit('Existing results found; refusing to silently overwrite the first run.')
    report = {'started_at': datetime.now().astimezone().isoformat(),
              'fixture_sha256': hashlib.sha256(fixture_path.read_bytes()).hexdigest(),
              'annotation_status': fixture['annotation_status'],
              'environment': 'Windows client -> public HTTPS API -> DeepSeek; not Android device latency',
              'endpoint': 'https://tiredwhite.cn/api/v1/parse', 'results': []}
    last_start = None
    with httpx.Client(timeout=27, follow_redirects=False) as client:
        for case in fixture['cases']:
            if last_start is not None:
                time.sleep(max(0, 13 - (time.perf_counter() - last_start)))
            last_start = time.perf_counter()
            payload = {'request_id': str(uuid4()), 'text': case['text'],
                       'source_time': case['source_time'], 'timezone': 'Asia/Shanghai'}
            row = {'id': case['id'], 'category': case['category'], 'request_id': payload['request_id']}
            try:
                response = client.post(report['endpoint'], json=payload,
                                       headers={'Authorization': 'Bearer ' + token})
                row.update(status=response.status_code, elapsed_ms=round((time.perf_counter()-last_start)*1000),
                           response=response.json())
                if response.status_code == 200:
                    row['evaluation'] = evaluate(case, row['response'])
            except (httpx.HTTPError, ValueError):
                row.update(status='client_error', elapsed_ms=round((time.perf_counter()-last_start)*1000))
            report['results'].append(row)
            report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
            print(f"{case['id']} status={row['status']} elapsed_ms={row['elapsed_ms']}", flush=True)
    rows = report['results']
    successful = [row for row in rows if row['status'] == 200]
    first_ten = rows[:10]
    timings = sorted(row['elapsed_ms'] for row in first_ten if row['status'] == 200 and not row['response'].get('cached'))
    clear_checks = [passed for row in successful if row['category'] == 'clear'
                    for key, passed in row['evaluation']['checks'].items() if key != 'action_count']
    report['summary'] = {
        'responses_200': len(successful), 'total': len(rows),
        'quote_membership_pass': sum(row['evaluation']['quote_membership'] for row in successful),
        'ambiguous_review_pass': sum(row['evaluation']['review_visible'] for row in successful if row['category'] == 'ambiguous'),
        'clear_automated_field_checks_pass': sum(clear_checks), 'clear_automated_field_checks_total': len(clear_checks),
        'first_ten_uncached_successes': len(timings),
        'first_ten_p95_ms_nearest_rank': timings[math.ceil(.95*len(timings))-1] if timings else None,
        'raw_model_schema_rate': 'unavailable: API exposes validated/repaired results, not first model responses',
        'limitations': 'AI-drafted references; exact keyword/field checks are proxies; no independent annotation or phone timing'}
    report['finished_at'] = datetime.now().astimezone().isoformat()
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report['summary'], ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
