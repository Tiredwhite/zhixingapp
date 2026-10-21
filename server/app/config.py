from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVER_ROOT / '.env', env_file_encoding='utf-8', extra='ignore'
    )
    app_env: Literal['development', 'production'] = 'development'
    model_api_base: str = 'https://api.deepseek.com'
    model_id: str = 'deepseek-flash'
    model_api_key: SecretStr = SecretStr('')
    model_thinking_disabled: bool = True
    demo_access_token: SecretStr = SecretStr('')
    cors_origins: list[str] = ['http://localhost:5173', 'http://127.0.0.1:5173']
    daily_attempt_limit: int = Field(default=100, ge=1)
    per_minute_limit: int = Field(default=5, ge=1)
    max_concurrent_requests: int = Field(default=2, ge=1, le=8)
    quota_db: str = 'data/quota.sqlite3'
    auth_db: str = 'data/accounts.sqlite3'

    @model_validator(mode='after')
    def production_credentials(self):
        if self.app_env == 'production' and len(self.demo_access_token.get_secret_value()) < 24:
            raise ValueError('Production requires DEMO_ACCESS_TOKEN with at least 24 characters')
        if not self.model_api_base.startswith('https://'):
            if self.app_env == 'production':
                raise ValueError('Production model API must use HTTPS')
        return self

