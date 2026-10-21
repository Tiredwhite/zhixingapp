import asyncio
import hashlib
import json
import time
from dataclasses import dataclass
from uuid import uuid4

from .errors import ApiError
from .schemas import DeepReadRequest, DeepReadResponse, ParseRequest, ParseResponse
from .validation import validate_result


@dataclass
class Entry:
    fingerprint: str
    created: float
    task: asyncio.Task


class ParseService:
    def __init__(self, settings, model, quota):
        self.settings, self.model, self.quota = settings, model, quota
        self.cache: dict[tuple[str, ...], Entry] = {}
        self.active = 0

    async def parse(self, request: ParseRequest, identity: str, ip: str):
        now = time.monotonic()
        for key, entry in list(self.cache.items()):
            if entry.task.done() and (now - entry.created > 600 or entry.task.cancelled() or entry.task.exception() is not None):
                del self.cache[key]
        key = (identity, str(request.request_id))
        fingerprint = hashlib.sha256(json.dumps(request.model_dump(mode='json'), sort_keys=True).encode()).hexdigest()
        if key in self.cache:
            existing = self.cache[key]
            if existing.fingerprint != fingerprint:
                raise ApiError(409, 'REQUEST_CONFLICT', '请求标识已用于其他内容，请重新发起')
            result = await asyncio.shield(existing.task)
            return result.model_copy(update={'cached': True})
        self.quota.check_rate(identity, ip)
        if not self.settings.model_api_key.get_secret_value():
            raise ApiError(503, 'MODEL_NOT_CONFIGURED', 'AI 尚未配置，你可以先体验示例或手动整理')
        if self.active >= self.settings.max_concurrent_requests:
            raise ApiError(429, 'SERVER_BUSY', '当前解析较多，请稍后再试', True)
        if len(self.cache) >= 200:
            finished = [k for k, v in self.cache.items() if v.task.done()]
            if not finished:
                raise ApiError(429, 'SERVER_BUSY', '当前解析较多，请稍后再试', True)
            del self.cache[finished[0]]
        self.active += 1

        async def run():
            try:
                raw = await self.model.parse(request)
                items, warnings = validate_result(raw, request)
                return ParseResponse(
                    request_id=str(request.request_id), parse_id=str(uuid4()), model_id=self.settings.model_id,
                    items=items, warnings=warnings,
                )
            finally:
                self.active -= 1

        task = asyncio.create_task(run())
        # Observe task errors even if the caller disconnects after sending the request.
        task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)
        self.cache[key] = Entry(fingerprint, now, task)
        return await asyncio.shield(task)

    async def deep_read(self, request: DeepReadRequest, identity: str, ip: str):
        now = time.monotonic()
        for key, entry in list(self.cache.items()):
            if entry.task.done() and (now - entry.created > 600 or entry.task.cancelled() or entry.task.exception() is not None):
                del self.cache[key]
        key = (identity, 'deep', str(request.request_id))
        fingerprint = hashlib.sha256(json.dumps(request.model_dump(mode='json'), sort_keys=True).encode()).hexdigest()
        if key in self.cache:
            existing = self.cache[key]
            if existing.fingerprint != fingerprint:
                raise ApiError(409, 'REQUEST_CONFLICT', '请求标识已用于其他内容，请重新发起')
            return (await asyncio.shield(existing.task)).model_copy(update={'cached': True})
        self.quota.check_rate(identity, ip)
        if not self.settings.model_api_key.get_secret_value():
            raise ApiError(503, 'MODEL_NOT_CONFIGURED', 'AI 尚未配置，可稍后重试')
        if self.active >= self.settings.max_concurrent_requests:
            raise ApiError(429, 'SERVER_BUSY', '当前解析较多，请稍后再试', True)
        if len(self.cache) >= 200:
            finished = [k for k, v in self.cache.items() if v.task.done()]
            if not finished:
                raise ApiError(429, 'SERVER_BUSY', '当前解析较多，请稍后再试', True)
            del self.cache[finished[0]]
        self.active += 1

        async def run():
            try:
                result = await self.model.deep_read(request)
                return DeepReadResponse(request_id=str(request.request_id), model_id=self.settings.model_id,
                                        summary=result.summary, summary_quote=result.summary_quote,
                                        steps=result.steps, questions=result.questions)
            finally:
                self.active -= 1

        task = asyncio.create_task(run())
        task.add_done_callback(lambda t: t.exception() if not t.cancelled() else None)
        self.cache[key] = Entry(fingerprint, now, task)
        return await asyncio.shield(task)

