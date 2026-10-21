import hmac
import logging
import time
from pathlib import Path
from uuid import uuid4

import sqlite3
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .auth import AccountStore, AuthRateLimiter
from .config import SERVER_ROOT, Settings
from .documents import MAX_DOCUMENT_BYTES, extract_document
from .errors import ApiError
from .model import ModelClient
from .quota import Quota, identity_hash
from .schemas import AccountCredentials, AccountLoginResponse, AccountRegistrationResponse, ChatRequest, ChatResponse, DeepReadRequest, DeepReadResponse, ParseRequest, ParseResponse
from .service import ParseService

logger = logging.getLogger('zhixing')
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s'))
    logger.addHandler(handler)
logger.propagate = False


def create_app(settings: Settings | None = None, model_transport=None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(title='知行 API', version='0.3.1',
                  docs_url='/docs' if settings.app_env == 'development' else None,
                  redoc_url=None, openapi_url='/openapi.json' if settings.app_env == 'development' else None)
    app.state.settings = settings
    quota_path = Path(settings.quota_db)
    if not quota_path.is_absolute():
        quota_path = SERVER_ROOT / quota_path
    quota = Quota(str(quota_path), settings.daily_attempt_limit, settings.per_minute_limit)
    auth_path = Path(settings.auth_db)
    if not auth_path.is_absolute():
        auth_path = SERVER_ROOT / auth_path
    accounts = AccountStore(str(auth_path))
    auth_limiter = AuthRateLimiter()
    service = ParseService(settings, ModelClient(settings, quota, transport=model_transport), quota)
    app.state.accounts = accounts
    app.state.service = service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=['GET', 'POST'],
        allow_headers=['Content-Type', 'Authorization'],
    )

    @app.middleware('http')
    async def request_metadata(request: Request, call_next):
        request.state.request_id = str(uuid4())
        started = time.monotonic()
        response = await call_next(request)
        response.headers['X-Request-ID'] = request.state.request_id
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        if request.url.path in ('/api/v1/parse', '/api/v1/deep-read'):
            logger.info('ai path=%s request_id=%s status=%s elapsed_ms=%d model=%s',
                        request.url.path,
                        request.state.request_id, response.status_code,
                        int((time.monotonic() - started) * 1000), settings.model_id)
        return response

    def error_body(request, code, message, retryable=False):
        return {'code': code, 'message': message, 'retryable': retryable, 'request_id': request.state.request_id}

    @app.exception_handler(ApiError)
    async def api_error(request, error):
        return JSONResponse(status_code=error.status, content=error_body(request, error.code, error.message, error.retryable))

    @app.exception_handler(RequestValidationError)
    async def input_error(request, error):
        return JSONResponse(status_code=400, content=error_body(request, 'INVALID_INPUT', '请检查通知长度、发布时间与请求格式'))

    @app.exception_handler(sqlite3.Error)
    async def storage_error(request, error):
        return JSONResponse(status_code=503, content=error_body(request, 'QUOTA_UNAVAILABLE', '调用配额暂时无法校验，请稍后重试', True))

    def authorize(request: Request):
        expected = settings.demo_access_token.get_secret_value()
        authorization = request.headers.get('Authorization', '')
        given = authorization[7:] if authorization.startswith('Bearer ') else ''
        client_ip = request.client.host if request.client else 'unknown'
        if expected and hmac.compare_digest(expected.encode(), given.encode()):
            return identity_hash(expected), client_ip
        username = accounts.authenticate(given)
        if username:
            return identity_hash(f'account:{username}'), client_ip
        if expected:
            raise ApiError(401, 'INVALID_TOKEN', '账号登录已失效，请重新登录')
        if settings.app_env == 'production' or client_ip not in ('127.0.0.1', '::1', 'testclient'):
            raise ApiError(401, 'TOKEN_REQUIRED', '远程访问需要配置连接令牌')
        return identity_hash(expected or 'local-development'), client_ip

    @app.post('/api/v1/auth/register', response_model=AccountRegistrationResponse, status_code=201)
    def register_account(payload: AccountCredentials, request: Request):
        client_ip = request.client.host if request.client else 'unknown'
        auth_limiter.check(client_ip)
        accounts.register(payload.username, payload.password)
        return AccountRegistrationResponse(username=payload.username,
                                           message='注册成功，请返回知行 App 登录')

    @app.post('/api/v1/auth/login', response_model=AccountLoginResponse)
    def login_account(payload: AccountCredentials, request: Request):
        client_ip = request.client.host if request.client else 'unknown'
        auth_limiter.check(client_ip)
        token, expires_at = accounts.login(payload.username, payload.password)
        return AccountLoginResponse(username=payload.username, access_token=token, expires_at=expires_at)

    @app.get('/api/v1/auth/me')
    def current_account(request: Request):
        authorization = request.headers.get('Authorization', '')
        given = authorization[7:] if authorization.startswith('Bearer ') else ''
        username = accounts.authenticate(given)
        if not username:
            raise ApiError(401, 'LOGIN_REQUIRED', '请先登录账号')
        return {'username': username}

    @app.post('/api/v1/auth/logout')
    def logout_account(request: Request):
        authorization = request.headers.get('Authorization', '')
        given = authorization[7:] if authorization.startswith('Bearer ') else ''
        username = accounts.authenticate(given)
        if not username:
            raise ApiError(401, 'LOGIN_REQUIRED', '登录状态已失效')
        accounts.revoke(given)
        return {'ok': True}

    @app.post('/api/v1/parse', response_model=ParseResponse)
    async def parse_notice(payload: ParseRequest, request: Request):
        request.state.request_id = str(payload.request_id)
        identity, client_ip = authorize(request)
        return await service.parse(payload, identity, client_ip)

    @app.post('/api/v1/deep-read', response_model=DeepReadResponse)
    async def deep_read(payload: DeepReadRequest, request: Request):
        request.state.request_id = str(payload.request_id)
        identity, client_ip = authorize(request)
        return await service.deep_read(payload, identity, client_ip)

    @app.post('/api/v1/documents/extract')
    async def extract_notice_document(request: Request, file: UploadFile = File(...)):
        authorize(request)
        try:
            raw = await file.read(MAX_DOCUMENT_BYTES + 1)
            text, kind = extract_document(file.filename, raw)
        finally:
            await file.close()
        return {'text': text, 'kind': kind, 'characters': len(text)}

    @app.post('/api/v1/documents/extract-raw')
    async def extract_notice_document_raw(request: Request):
        authorize(request)
        if not request.headers.get('content-type', '').startswith('application/octet-stream'):
            raise ApiError(415, 'DOCUMENT_UNSUPPORTED', '请求文件类型不受支持')
        raw = await request.body()
        text, kind = extract_document(request.query_params.get('filename'), raw)
        return {'text': text, 'kind': kind, 'characters': len(text)}

    @app.post('/api/v1/chat', response_model=ChatResponse)
    async def chat(payload: ChatRequest, request: Request):
        identity, client_ip = authorize(request)
        return await service.chat(payload, identity, client_ip)

    @app.get('/healthz')
    def health():
        return {
            'status': 'ok', 'version': app.version,
            'ai_configured': bool(settings.model_api_key.get_secret_value()),
            'model_id': settings.model_id,
        }

    return app


app = create_app()
