import hmac
import logging
import time
from pathlib import Path
from uuid import uuid4

import sqlite3
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .config import SERVER_ROOT, Settings
from .errors import ApiError
from .model import ModelClient
from .quota import Quota, identity_hash
from .schemas import ParseRequest, ParseResponse
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
    app = FastAPI(title='知行 API', version='0.1.0',
                  docs_url='/docs' if settings.app_env == 'development' else None,
                  redoc_url=None, openapi_url='/openapi.json' if settings.app_env == 'development' else None)
    app.state.settings = settings
    quota_path = Path(settings.quota_db)
    if not quota_path.is_absolute():
        quota_path = SERVER_ROOT / quota_path
    quota = Quota(str(quota_path), settings.daily_attempt_limit, settings.per_minute_limit)
    service = ParseService(settings, ModelClient(settings, quota, transport=model_transport), quota)
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
        if request.url.path == '/api/v1/parse':
            logger.info('parse request_id=%s status=%s elapsed_ms=%d model=%s',
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

    @app.post('/api/v1/parse', response_model=ParseResponse)
    async def parse_notice(payload: ParseRequest, request: Request):
        request.state.request_id = str(payload.request_id)
        expected = settings.demo_access_token.get_secret_value()
        authorization = request.headers.get('Authorization', '')
        given = authorization[7:] if authorization.startswith('Bearer ') else ''
        client_ip = request.client.host if request.client else 'unknown'
        if expected:
            if not hmac.compare_digest(expected.encode(), given.encode()):
                raise ApiError(401, 'INVALID_TOKEN', '连接令牌无效，请检查连接设置')
        elif settings.app_env == 'production' or client_ip not in ('127.0.0.1', '::1', 'testclient'):
            raise ApiError(401, 'TOKEN_REQUIRED', '远程访问需要配置连接令牌')
        return await service.parse(payload, identity_hash(expected or 'local-development'), client_ip)

    @app.get('/healthz')
    def health():
        return {
            'status': 'ok', 'version': app.version,
            'ai_configured': bool(settings.model_api_key.get_secret_value()),
            'model_id': settings.model_id,
        }

    return app


app = create_app()
