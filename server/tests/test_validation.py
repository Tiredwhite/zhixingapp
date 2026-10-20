from datetime import datetime

import pytest

from app.schemas import ModelResult, ParseRequest
from app.validation import parse_due, validate_result
from conftest import model_result


@pytest.mark.parametrize('text,source,date,time', [
    ('2026年10月23日18:00前', None, '2026-10-23', '2026-10-23T18:00:00+08:00'),
    ('2026-10-23', None, '2026-10-23', None),
    ('明天下午', None, None, None),
    ('2026年2月30日', None, None, None),
    ('2026年10月23日周四', None, None, None),
    ('2026年10月23日25:00', None, None, None),
    ('2026年10月23日或2026年10月24日', None, None, None),
    ('明天18:00', datetime.fromisoformat('2026-10-20T09:00:00+08:00'), '2026-10-21', '2026-10-21T18:00:00+08:00'),
    ('下周一下午3点', datetime.fromisoformat('2026-10-20T09:00:00+08:00'), '2026-10-26', '2026-10-26T15:00:00+08:00'),
])
def test_date_rules(text, source, date, time):
    actual_date, actual_time, _ = parse_due(text, source)
    assert (actual_date, actual_time) == (date, time)


def test_hallucinated_fields_removed_and_valid_evidence_preserved(payload):
    data = model_result()
    item = data['items'][0]
    item['location'] = '虚构教室'
    item['evidence']['location'] = '原文没有这个教室'
    item['materials'].append('身份证')
    item['evidence']['materials'].append('身份证')
    items, _ = validate_result(ModelResult.model_validate(data), ParseRequest.model_validate(payload))
    assert items[0].location is None
    assert items[0].materials == ['项目书PDF']
    assert len(items[0].review_reasons) >= 2


def test_false_action_evidence_drops_candidate(payload):
    data = model_result()
    data['items'][0]['evidence']['action'] = '不存在的摘句'
    items, warnings = validate_result(ModelResult.model_validate(data), ParseRequest.model_validate(payload))
    assert items == [] and warnings


def test_model_machine_date_cannot_override_source(payload):
    data = model_result()
    data['items'][0]['due_at'] = '2026-12-30T18:00:00+08:00'
    items, _ = validate_result(ModelResult.model_validate(data), ParseRequest.model_validate(payload))
    assert items[0].due_at == '2026-10-23T18:00:00+08:00'
    assert any('不一致' in r for r in items[0].review_reasons)

