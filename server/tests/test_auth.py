import json
import sqlite3

import httpx
from fastapi.testclient import TestClient

from app.main import create_app


def credentials(username='campus_user', password='long-enough-pass-123'):
    return {'username': username, 'password': password}


def test_account_registration_login_and_session_authenticate_chat(settings):
    def provider(request):
        payload = json.loads(request.content)
        return httpx.Response(200, json={'choices': [{'message': {'content': json.dumps(
            {'reply': '先看通知原文，再核对截止时间和提交渠道。'}, ensure_ascii=False)}}]})

    with TestClient(create_app(settings, httpx.MockTransport(provider))) as client:
        registered = client.post('/api/v1/auth/register', json=credentials())
        assert registered.status_code == 201
        assert registered.json()['username'] == 'campus_user'
        assert 'phone' not in registered.json()

        duplicate = client.post('/api/v1/auth/register', json=credentials())
        assert duplicate.status_code == 409
        assert duplicate.json()['code'] == 'USERNAME_TAKEN'

        denied = client.post('/api/v1/auth/login', json=credentials(password='wrong-password'))
        assert denied.status_code == 401
        assert denied.json()['code'] == 'INVALID_CREDENTIALS'

        logged_in = client.post('/api/v1/auth/login', json=credentials())
        assert logged_in.status_code == 200
        session = logged_in.json()
        assert session['token_type'] == 'Bearer'
        assert len(session['access_token']) >= 40
        auth = {'Authorization': f"Bearer {session['access_token']}"}
        assert client.get('/api/v1/auth/me', headers=auth).json() == {'username': 'campus_user'}
        chat = client.post('/api/v1/chat', json={'messages': [{'role': 'user', 'content': '如何理解通知？'}]}, headers=auth)
        assert chat.status_code == 200
        assert chat.json()['reply'].startswith('先看通知原文')

        with sqlite3.connect(settings.auth_db) as db:
            row = db.execute('SELECT salt,password_hash FROM accounts WHERE username=?', ('campus_user',)).fetchone()
            stored_session = db.execute('SELECT token_hash FROM sessions').fetchone()[0]
        assert row and b'long-enough-pass-123' not in row[1]
        assert stored_session != session['access_token']

        assert client.post('/api/v1/auth/logout', headers=auth).status_code == 200
        assert client.get('/api/v1/auth/me', headers=auth).status_code == 401
        assert client.post('/api/v1/chat', json={'messages': [{'role': 'user', 'content': '你好'}]}, headers=auth).status_code == 401


def test_registration_collects_no_extra_identity_fields_and_enforces_password_length(settings):
    with TestClient(create_app(settings)) as client:
        extra = client.post('/api/v1/auth/register', json={**credentials(), 'phone': '13800000000'})
        assert extra.status_code == 400
        short = client.post('/api/v1/auth/register', json=credentials(username='new_user', password='123'))
        assert short.status_code == 400
        bad_name = client.post('/api/v1/auth/register', json=credentials(username='用户甲'))
        assert bad_name.status_code == 400
