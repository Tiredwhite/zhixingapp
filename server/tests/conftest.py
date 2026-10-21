import json
from uuid import uuid4

import httpx
import pytest

from app.config import Settings

TEXT = '请于2026年10月23日18:00前提交项目书PDF至教学平台。'


def model_result():
    return {'items': [{
        'action': '提交项目书PDF', 'due_text': '2026年10月23日18:00前',
        'due_date': '2026-10-23', 'due_at': '2026-10-23T18:00:00+08:00',
        'location': '教学平台', 'materials': ['项目书PDF'],
        'evidence': {'action': '提交项目书PDF', 'due': '2026年10月23日18:00前', 'location': '教学平台', 'materials': ['项目书PDF']},
        'review_reasons': [],
    }], 'warnings': []}


def model_response(data=None):
    return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(data if data is not None else model_result(), ensure_ascii=False)}, 'finish_reason': 'stop'}]})


@pytest.fixture
def settings(tmp_path):
    return Settings(_env_file=None, model_api_key='test-key-not-live', demo_access_token='test-access', quota_db=str(tmp_path / 'quota.sqlite3'), auth_db=str(tmp_path / 'accounts.sqlite3'), per_minute_limit=100)


@pytest.fixture
def payload():
    return {'request_id': str(uuid4()), 'text': TEXT, 'source_time': None, 'timezone': 'Asia/Shanghai'}

