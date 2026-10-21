import json

import httpx
from fastapi.testclient import TestClient

from app.main import create_app

AUTH = {'Authorization': 'Bearer test-access'}


def test_chat_sends_bounded_history_to_model_and_returns_reply(settings):
    calls = []

    def provider(request):
        payload = json.loads(request.content)
        calls.append(payload)
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps({'reply': '先确认截止时间，再按通知指定渠道提交。'}, ensure_ascii=False)}}]})

    messages = [
        {'role': 'user', 'content': '我该怎么做？'},
        {'role': 'assistant', 'content': '请把通知发来。'},
        {'role': 'user', 'content': '请于周五前提交材料。'},
    ]
    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        response = client.post('/api/v1/chat', json={'messages': messages}, headers=AUTH)

    assert response.status_code == 200
    assert response.json()['mode'] == 'chat'
    assert response.json()['model_id'] == settings.model_id
    assert response.json()['reply'].startswith('先确认截止时间')
    assert calls[0]['messages'][-3:] == messages
    assert calls[0]['messages'][0]['role'] == 'system'


def test_chat_requires_token_and_last_message_must_be_from_user(settings):
    with TestClient(create_app(settings, httpx.MockTransport(lambda _: (_ for _ in ()).throw(AssertionError('provider called'))))) as client:
        assert client.post('/api/v1/chat', json={'messages': [{'role': 'user', 'content': '你好'}]}).status_code == 401
        response = client.post('/api/v1/chat', json={'messages': [
            {'role': 'user', 'content': '你好'},
            {'role': 'assistant', 'content': '嗨'},
        ]}, headers=AUTH)
        assert response.status_code == 400


def test_chat_provider_output_is_validated_and_private(settings):
    with TestClient(create_app(settings, httpx.MockTransport(lambda _: httpx.Response(200, json={
        'choices': [{'message': {'content': '{bad-json with private details'}}]
    })))) as client:
        response = client.post('/api/v1/chat', json={'messages': [{'role': 'user', 'content': '你好'}]}, headers=AUTH)
    assert response.status_code == 502
    assert response.json()['code'] == 'INVALID_MODEL_OUTPUT'
    assert 'private details' not in response.text
