"""Deterministic evidence and date checks. Model proposals never execute actions."""
import re
from datetime import datetime, timedelta, timezone

from .schemas import Candidate, ModelResult, ParseRequest

SHANGHAI = timezone(timedelta(hours=8))
ABSOLUTE_DATE = re.compile(r'(?P<y>20\d{2})\s*(?:年|[-/])\s*(?P<m>\d{1,2})\s*(?:月|[-/])\s*(?P<d>\d{1,2})\s*日?')
CLOCK = re.compile(r'(?:(上午|下午|晚上|中午)\s*)?(\d{1,2})\s*(?::|：|点|时)\s*(\d{1,2})?\s*分?')
WEEKDAY = {'一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6, '天': 6}


def parse_due(text: str | None, source_time: datetime | None):
    if not text:
        return None, None, ['未提供明确截止日期，可保留时间未定']
    reasons = []
    dates = list(ABSOLUTE_DATE.finditer(text))
    day = None
    try:
        if len(dates) > 1:
            return None, None, ['同一依据中出现多个日期，请选择正确的截止日期']
        if dates:
            match = dates[0]
            day = datetime(int(match['y']), int(match['m']), int(match['d']), tzinfo=SHANGHAI)
            weekday = re.search(r'(?:星期|周)([一二三四五六日天])', text)
            if weekday and WEEKDAY[weekday[1]] != day.weekday():
                return None, None, ['日期与星期不一致，请核对原通知']
        else:
            relative = re.findall(r'今天|明天|后天|(?:本|下)周[一二三四五六日天]', text)
            if len(relative) != 1 or source_time is None:
                return None, None, ['日期缺失或依赖发布时间，请手动确认']
            base = source_time.astimezone(SHANGHAI).replace(hour=0, minute=0, second=0, microsecond=0)
            token = relative[0]
            if token in ['今天', '明天', '后天']:
                day = base + timedelta(days=['今天', '明天', '后天'].index(token))
            else:
                day = base - timedelta(days=base.weekday()) + timedelta(days=WEEKDAY[token[-1]] + (7 if token.startswith('下') else 0))
            reasons.append('相对日期已按你提供的通知发布时间换算，请核对')
        clocks = list(CLOCK.finditer(text))
        if len(clocks) > 1:
            return None, None, ['出现多个时刻，请手动核对']
        if not clocks:
            return day.date().isoformat(), None, reasons + ['只有日期，没有明确时刻']
        period, hour, minute = clocks[0].groups()
        hour, minute = int(hour), int(minute or 0)
        if period in ['下午', '晚上'] and 1 <= hour < 12:
            hour += 12
        if period == '上午' and hour == 12:
            hour = 0
        if minute > 59 or hour > 23:
            raise ValueError('Invalid time')
        due = day.replace(hour=hour, minute=minute)
        return due.date().isoformat(), due.isoformat(timespec='seconds'), reasons
    except (ValueError, OverflowError):
        return None, None, ['原文日期或时间不合法，请手动核对']


def validate_result(result: ModelResult, request: ParseRequest, now: datetime | None = None):
    now = now or datetime.now(SHANGHAI)
    warnings = [str(w)[:200] for w in result.warnings]
    items = []
    for index, original in enumerate(result.items):
        item = original.model_copy(deep=True)
        reasons = list(item.review_reasons)
        if item.evidence.action not in request.text:
            warnings.append(f'第{index + 1}项缺少有效事项依据，已移除')
            continue
        if item.location and (not item.evidence.location or item.evidence.location not in request.text or item.location not in item.evidence.location):
            item.location = None
            item.evidence.location = None
            reasons.append('地点缺少有效原文依据，已清空')
        valid_materials, valid_quotes = [], []
        for material in item.materials:
            quote = next((q for q in item.evidence.materials if q and q in request.text and material in q), None)
            if quote:
                valid_materials.append(material)
                valid_quotes.append(quote)
            else:
                reasons.append(f'材料“{material[:30]}”缺少原文依据，已移除')
        item.materials = valid_materials
        item.evidence.materials = valid_quotes
        valid_due = item.evidence.due and item.evidence.due in request.text
        if item.due_text and (not valid_due or item.due_text not in item.evidence.due):
            reasons.append('时间缺少有效原文依据，已清空')
            item.due_text = None
            item.evidence.due = None
            valid_due = False
        # Normalize from evidence, never trust the model's machine-readable date.
        due_date, due_at, date_reasons = parse_due(item.evidence.due if valid_due else None, request.source_time)
        if item.due_at and due_at:
            try:
                if datetime.fromisoformat(item.due_at) != datetime.fromisoformat(due_at):
                    date_reasons.append('模型日期与原文不一致，已按原文重新换算，请核对')
            except ValueError:
                date_reasons.append('模型日期格式不合法，已按原文重新换算，请核对')
        if due_at and datetime.fromisoformat(due_at) < now:
            date_reasons.append('该截止时间已过去，请确认是否仍需办理')
        item.due_date, item.due_at = due_date, due_at
        item.review_reasons = list(dict.fromkeys(reasons + date_reasons))[:10]
        items.append(Candidate(id=f'action-{index + 1}', **item.model_dump()))
    if not items:
        warnings.append('未发现可核对的明确行动，可保留原文并手动整理')
    return items, list(dict.fromkeys(warnings))[:20]

