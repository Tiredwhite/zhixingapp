import hashlib
import hmac
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from contextlib import contextmanager
from pathlib import Path

from .errors import ApiError

_SCRYPT_N = 1 << 14
_SCRYPT_R = 8
_SCRYPT_P = 1
_PASSWORD_BYTES = 32
_DUMMY_SALT = b'zhixing-account-login-padding'
SESSION_SECONDS = 30 * 24 * 60 * 60


class AccountStore:
    """Stores username-only accounts and hashed, expiring bearer sessions."""

    def __init__(self, path: str):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self._connection() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS accounts (
                username TEXT PRIMARY KEY,
                salt BLOB NOT NULL,
                password_hash BLOB NOT NULL,
                created_at INTEGER NOT NULL
            )''')
            db.execute('''CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                username TEXT NOT NULL REFERENCES accounts(username) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            )''')
            db.execute('CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)')
        try:
            Path(path).chmod(0o600)
        except OSError:
            pass

    def _connect(self):
        db = sqlite3.connect(self.path, timeout=3)
        db.execute('PRAGMA foreign_keys=ON')
        return db

    @contextmanager
    def _connection(self):
        db = self._connect()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def _derive(password: str, salt: bytes) -> bytes:
        return hashlib.scrypt(password.encode('utf-8'), salt=salt, n=_SCRYPT_N,
                              r=_SCRYPT_R, p=_SCRYPT_P, dklen=_PASSWORD_BYTES)

    def register(self, username: str, password: str):
        salt = secrets.token_bytes(16)
        password_hash = self._derive(password, salt)
        try:
            with self._connection() as db:
                db.execute('INSERT INTO accounts(username,salt,password_hash,created_at) VALUES(?,?,?,?)',
                           (username, salt, password_hash, int(time.time())))
        except sqlite3.IntegrityError as exc:
            raise ApiError(409, 'USERNAME_TAKEN', '这个账号名已被使用，请换一个') from exc

    def login(self, username: str, password: str) -> tuple[str, int]:
        with self._connection() as db:
            row = db.execute('SELECT salt,password_hash FROM accounts WHERE username=?', (username,)).fetchone()
        salt = row[0] if row else _DUMMY_SALT
        actual = self._derive(password, salt)
        if not row or not hmac.compare_digest(actual, row[1]):
            raise ApiError(401, 'INVALID_CREDENTIALS', '账号或密码不正确')

        token = secrets.token_urlsafe(32)
        expires_at = int(time.time()) + SESSION_SECONDS
        token_hash = hashlib.sha256(token.encode('ascii')).hexdigest()
        with self._connection() as db:
            db.execute('DELETE FROM sessions WHERE expires_at<=?', (int(time.time()),))
            db.execute('INSERT INTO sessions(token_hash,username,expires_at) VALUES(?,?,?)',
                       (token_hash, username, expires_at))
        return token, expires_at

    def authenticate(self, token: str) -> str | None:
        if not token:
            return None
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        with self._connection() as db:
            row = db.execute('SELECT username FROM sessions WHERE token_hash=? AND expires_at>?',
                             (token_hash, int(time.time()))).fetchone()
        return row[0] if row else None

    def revoke(self, token: str):
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        with self._connection() as db:
            db.execute('DELETE FROM sessions WHERE token_hash=?', (token_hash,))


class AuthRateLimiter:
    def __init__(self, limit: int = 10, period: int = 600):
        self.limit = limit
        self.period = period
        self.attempts = defaultdict(deque)

    def check(self, ip: str):
        now = time.monotonic()
        window = self.attempts[ip]
        while window and window[0] <= now - self.period:
            window.popleft()
        if len(window) >= self.limit:
            raise ApiError(429, 'AUTH_RATE_LIMIT', '尝试次数过多，请稍后再试', True)
        window.append(now)
        if len(self.attempts) > 1000:
            self.attempts = defaultdict(deque, {key: values for key, values in self.attempts.items()
                                                 if values and values[-1] > now - self.period})
