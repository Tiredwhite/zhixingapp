import json
from uuid import uuid4

import httpx
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.main import create_app
from conftest import model_response, model_result

AUTH = {'Authorization': 'Bearer test-access'}


def test_real_contract_with_mocked_provider(settings, payload):
    calls = []

    def provider(request):
        calls.append(json.loads(request.content))
        assert request.headers['Authorization'] == 'Bearer test-key-not-live'
        return model_response()

    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/parse', json=payload, headers=AUTH)
        assert response.status_code == 200
        data = response.json()
        assert data['mode'] == 'ai'
        assert data['items'][0]['due_at'] == '2026-10-23T18:00:00+08:00'
        assert data['items'][0]['evidence']['action'] in payload['text']
        assert calls[0]['model'] == 'deepseek-flash'
        assert calls[0]['thinking'] == {'type': 'disabled'}
        assert response.headers['Cache-Control'] == 'no-store'


def test_credentials_and_invalid_input_never_reach_provider(settings, payload):
    def forbidden(_):
        raise AssertionError('Provider must not be called')
    with TestClient(create_app(settings, httpx.MockTransport(forbidden))) as client:
        assert client.post('/api/v1/parse', json=payload).status_code == 401
        assert client.post('/api/v1/parse', json={**payload, 'text': ' '}, headers=AUTH).status_code == 400
        assert client.post('/api/v1/parse', json={**payload, 'text': '字' * 12001}, headers=AUTH).status_code == 400
        result = client.post('/api/v1/parse', json={**payload, 'extra': True}, headers=AUTH)
        assert result.status_code == 400
        assert 'text' not in result.json()
        assert 'test-key' not in result.text


def test_missing_key_explicitly_fails_instead_of_returning_fixture(settings, payload):
    settings.model_api_key = SecretStr('')
    with TestClient(create_app(settings)) as client:
        response = client.post('/api/v1/parse', json=payload, headers=AUTH)
        assert response.status_code == 503
        assert response.json()['code'] == 'MODEL_NOT_CONFIGURED'
        assert client.get('/healthz').json()['ai_configured'] is False


def test_repeated_request_is_cached_and_conflicting_body_rejected(settings, payload):
    calls = []
    def provider(request):
        calls.append(1)
        return model_response()
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        a = client.post('/api/v1/parse', json=payload, headers=AUTH).json()
        b = client.post('/api/v1/parse', json=payload, headers=AUTH).json()
        assert a['parse_id'] == b['parse_id'] and b['cached'] is True
        assert len(calls) == 1
        conflict = client.post('/api/v1/parse', json={**payload, 'text': '改成另一条通知'}, headers=AUTH)
        assert conflict.status_code == 409


def test_invalid_json_only_gets_one_repair(settings, payload):
    calls = []
    def provider(request):
        calls.append(json.loads(request.content))
        return httpx.Response(200, json={'choices': [{'message': {'content': '{not json'}}]})
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/parse', json=payload, headers=AUTH)
        assert response.status_code == 502
        assert response.json()['code'] == 'INVALID_MODEL_OUTPUT'
        assert len(calls) == 2
        assert calls[1]['messages'][-2] == {'role': 'assistant', 'content': '{not json'}
        assert 'items每项' in calls[1]['messages'][-1]['content']
        assert 'steps每项' not in calls[1]['messages'][-1]['content']


def test_repair_includes_failed_answer_and_can_recover(settings, payload):
    calls = []
    def provider(request):
        calls.append(json.loads(request.content))
        if len(calls) == 1:
            return httpx.Response(200, json={'choices': [{'message': {'content': '{broken'}, 'finish_reason': 'stop'}]})
        return model_response()
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/parse', json=payload, headers=AUTH)
        assert response.status_code == 200
        assert response.json()['items'][0]['action'] == '提交项目书PDF'
        assert calls[1]['messages'][-2] == {'role': 'assistant', 'content': '{broken'}
        assert 'JSON不完整' in calls[1]['messages'][-1]['content']


def test_parse_accepts_fenced_json_but_keeps_strict_schema(settings, payload):
    data = model_result()
    content = '```json\n' + json.dumps(data, ensure_ascii=False) + '\n```'
    provider = lambda _: httpx.Response(200, json={'choices': [{'message': {'content': content}, 'finish_reason': 'stop'}]})
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/parse', json=payload, headers=AUTH)
    assert response.status_code == 200
    assert response.json()['items'][0]['action'] == '提交项目书PDF'


def test_empty_and_extra_model_fields_are_not_accepted(settings, payload):
    data = model_result()
    data['execute_shell'] = 'do not execute'
    with TestClient(create_app(settings, httpx.MockTransport(lambda _: model_response(data)))) as client:
        response = client.post('/api/v1/parse', json=payload, headers=AUTH)
        assert response.status_code == 502


def test_provider_auth_failure_is_sanitized_and_not_retried(settings, payload):
    calls = []
    def provider(_):
        calls.append(1)
        return httpx.Response(401, text='sensitive provider diagnostics test-key-not-live')
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/parse', json=payload, headers=AUTH)
        assert response.json()['code'] == 'MODEL_CREDENTIALS'
        assert 'sensitive' not in response.text and 'test-key' not in response.text
        assert len(calls) == 1


def test_busy_provider_honors_budget_and_does_not_wait_long_retry_after(settings, payload):
    calls = []
    def provider(_):
        calls.append(1)
        return httpx.Response(429, headers={'Retry-After': '120'})
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/parse', json=payload, headers=AUTH)
        assert response.json()['code'] == 'MODEL_BUSY'
        assert len(calls) == 1


def test_daily_quota_persists_after_server_restart(settings, payload):
    settings.daily_attempt_limit = 1
    transport = httpx.MockTransport(lambda _: model_response())
    with TestClient(create_app(settings, transport)) as client:
        assert client.post('/api/v1/parse', json=payload, headers=AUTH).status_code == 200
    with TestClient(create_app(settings, transport)) as client:
        response = client.post('/api/v1/parse', json={**payload, 'request_id': str(uuid4())}, headers=AUTH)
        assert response.status_code == 429
        assert response.json()['code'] == 'DAILY_LIMIT'


def test_rate_limit_and_health_do_not_consume_model_quota(settings, payload):
    settings.per_minute_limit = 1
    calls = []
    def provider(_):
        calls.append(1)
        return model_response()
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        assert client.get('/healthz').status_code == 200
        assert client.post('/api/v1/parse', json=payload, headers=AUTH).status_code == 200
        result = client.post('/api/v1/parse', json={**payload, 'request_id': str(uuid4())}, headers=AUTH)
        assert result.status_code == 429 and len(calls) == 1


def test_network_error_is_bounded(settings, payload, monkeypatch):
    calls = []
    async def no_wait(_):
        pass
    monkeypatch.setattr('app.model.asyncio.sleep', no_wait)
    def provider(_):
        calls.append(1)
        raise httpx.ReadTimeout('private message')
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        result = client.post('/api/v1/parse', json=payload, headers=AUTH)
        assert result.status_code == 504
        assert result.json()['code'] == 'MODEL_TIMEOUT'
        assert len(calls) == 2
        assert 'private' not in result.text

