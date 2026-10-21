import json
from uuid import uuid4

import httpx
from fastapi.testclient import TestClient

from app.main import create_app

AUTH = {'Authorization': 'Bearer test-access'}
TEXT = '请于2026年10月23日18:00前通过教学平台提交项目书PDF，答辩时间另行通知。'


def request_body():
    return {'request_id': str(uuid4()), 'text': TEXT, 'actions': ['提交项目书PDF']}


def result_body():
    return {
        'summary': '需要按时通过教学平台提交项目书PDF，答辩时间尚未明确。',
        'summary_quote': '提交项目书PDF',
        'steps': [
            {'instruction': '先检查项目书PDF内容是否完整', 'why': '提交前核对文件可以发现遗漏', 'source_quote': '项目书PDF'},
            {'instruction': '在截止前通过教学平台提交', 'why': '通知明确了提交渠道和时间', 'source_quote': '2026年10月23日18:00前'},
        ],
        'questions': [{'question': '答辩时间何时公布？', 'reason': '通知只说另行通知，没有给出日期'}],
    }


def provider_response(data):
    return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(data, ensure_ascii=False)}, 'finish_reason': 'stop'}]})


def test_deep_read_is_real_model_output_with_grounded_quotes_and_cache(settings):
    calls = []

    def provider(request):
        calls.append(json.loads(request.content))
        return provider_response(result_body())

    payload = request_body()
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        first = client.post('/api/v1/deep-read', json=payload, headers=AUTH)
        second = client.post('/api/v1/deep-read', json=payload, headers=AUTH)
        assert first.status_code == 200
        assert first.json()['mode'] == 'ai_deep_read'
        assert first.json()['steps'][1]['source_quote'] in TEXT
        assert second.json()['cached'] is True
        assert len(calls) == 1
        assert calls[0]['model'] == settings.model_id
        assert 'notice_text' in calls[0]['messages'][1]['content']
        assert client.post('/api/v1/deep-read', json={**payload, 'text': '另一条通知'}, headers=AUTH).status_code == 409


def test_deep_read_rejects_ungrounded_quotes_and_keeps_provider_text_private(settings):
    calls = []
    wrong = result_body()
    wrong['steps'][0]['source_quote'] = '学校规定必须盖章'

    def provider(request):
        calls.append(json.loads(request.content))
        return provider_response(wrong)

    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/deep-read', json=request_body(), headers=AUTH)
        assert response.status_code == 502
        assert response.json()['code'] == 'INVALID_MODEL_OUTPUT'
        assert '盖章' not in response.text
        assert len(calls) == 3
        assert '逐字连续复制' in calls[1]['messages'][-1]['content']
        assert '逐字连续复制' in calls[2]['messages'][-1]['content']


def test_deep_read_repairs_malformed_json_and_bad_quote_before_returning(settings):
    calls = []
    wrong_quote = result_body()
    wrong_quote['summary_quote'] = '通知没有的句子'
    responses = iter([
        httpx.Response(200, json={'choices': [{'message': {'content': '{"summary":'}, 'finish_reason': 'length'}]}),
        provider_response(wrong_quote),
        provider_response(result_body()),
    ])

    def provider(request):
        calls.append(json.loads(request.content))
        return next(responses)

    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/deep-read', json=request_body(), headers=AUTH)

    assert response.status_code == 200
    assert len(calls) == 3
    assert 'JSON完整' in calls[1]['messages'][-1]['content']
    assert '逐字连续复制' in calls[2]['messages'][-1]['content']
    assert calls[2]['messages'][-2]['role'] == 'assistant'


def test_deep_read_requires_token_and_strict_input_without_provider_call(settings):
    with TestClient(create_app(settings, httpx.MockTransport(lambda _: (_ for _ in ()).throw(AssertionError('provider called'))))) as client:
        payload = request_body()
        assert client.post('/api/v1/deep-read', json=payload).status_code == 401
        assert client.post('/api/v1/deep-read', json={**payload, 'actions': ['字' * 61]}, headers=AUTH).status_code == 400
        assert client.post('/api/v1/deep-read', json={**payload, 'text': '字' * 12001}, headers=AUTH).status_code == 400
