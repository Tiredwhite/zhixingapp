import asyncio
from uuid import uuid4

import pytest

from app.errors import ApiError
from app.quota import Quota
from app.schemas import ModelResult, ParseRequest
from app.service import ParseService
from conftest import model_result


def test_simultaneous_duplicate_requests_share_one_provider_call(settings, payload):
    class Provider:
        calls = 0
        async def parse(self, request):
            self.calls += 1
            await asyncio.sleep(0.01)
            return ModelResult.model_validate(model_result())
    async def run():
        provider = Provider()
        service = ParseService(settings, provider, Quota(settings.quota_db, 100, 100))
        req = ParseRequest.model_validate(payload)
        results = await asyncio.gather(service.parse(req, 'identity', 'local'), service.parse(req, 'identity', 'local'))
        assert provider.calls == 1
        assert results[0].parse_id == results[1].parse_id
        assert service.active == 0
    asyncio.run(run())


def test_provider_concurrency_is_rejected_without_unbounded_queue(settings, payload):
    class Provider:
        def __init__(self):
            self.started = asyncio.Event()
            self.release = asyncio.Event()
        async def parse(self, request):
            self.started.set()
            await self.release.wait()
            return ModelResult.model_validate(model_result())
    async def run():
        settings.max_concurrent_requests = 1
        provider = Provider()
        service = ParseService(settings, provider, Quota(settings.quota_db, 100, 100))
        first = asyncio.create_task(service.parse(ParseRequest.model_validate(payload), 'a', 'local'))
        await provider.started.wait()
        with pytest.raises(ApiError) as error:
            await service.parse(ParseRequest.model_validate({**payload, 'request_id': str(uuid4())}), 'a', 'local')
        assert error.value.code == 'SERVER_BUSY'
        provider.release.set()
        await first
        assert service.active == 0
    asyncio.run(run())

