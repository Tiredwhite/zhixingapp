from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(title='知行 API', version='0.1.0')
    app.state.settings = settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=['GET', 'POST'],
        allow_headers=['Content-Type', 'Authorization'],
    )

    @app.get('/healthz')
    def health():
        return {
            'status': 'ok', 'version': app.version,
            'ai_configured': bool(settings.model_api_key.get_secret_value()),
            'model_id': settings.model_id,
        }

    return app


app = create_app()
