import hashlib
import sqlite3
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .errors import ApiError


class Quota:
    """Single-worker rate window; transactional daily budget survives restarts."""
    def __init__(self, path: str, daily_limit: int, minute_limit: int):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.daily_limit = daily_limit
        self.minute_limit = minute_limit
        self.windows = defaultdict(deque)
        with sqlite3.connect(path) as db:
            db.execute('CREATE TABLE IF NOT EXISTS daily (day TEXT PRIMARY KEY, count INTEGER NOT NULL)')

    def check_rate(self, identity: str, client_ip: str):
        now = time.monotonic()
        keys = [f'token:{identity}', f'ip:{client_ip}']
        for key in keys:
            window = self.windows[key]
            while window and window[0] <= now - 60:
                window.popleft()
            if len(window) >= self.minute_limit:
                raise ApiError(429, 'RATE_LIMIT', '操作较频繁，请一分钟后再试', True)
        for key in keys:
            self.windows[key].append(now)
        # Remove inactive identities to keep memory bounded for public deployments.
        if len(self.windows) > 1000:
            self.windows = defaultdict(deque, {k: v for k, v in self.windows.items() if v and v[-1] > now - 60})

    def consume_attempt(self):
        today = datetime.now(timezone(timedelta(hours=8))).date().isoformat()
        with sqlite3.connect(self.path, timeout=2) as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT count FROM daily WHERE day=?', (today,)).fetchone()
            count = row[0] if row else 0
            if count >= self.daily_limit:
                raise ApiError(429, 'DAILY_LIMIT', '今日 AI 调用额度已用完，可手动整理', False)
            db.execute('INSERT INTO daily(day,count) VALUES (?,?) ON CONFLICT(day) DO UPDATE SET count=excluded.count', (today, count + 1))
            db.execute('DELETE FROM daily WHERE day < date(?, ?)', (today, '-7 days'))


def identity_hash(token: str):
    return hashlib.sha256(token.encode()).hexdigest()[:24]

