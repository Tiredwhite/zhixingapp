from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class ParseRequest(StrictModel):
    request_id: UUID
    text: str = Field(min_length=2, max_length=2000)
    source_time: datetime | None = None
    timezone: Literal['Asia/Shanghai'] = 'Asia/Shanghai'

    @field_validator('source_time')
    @classmethod
    def source_has_timezone(cls, value):
        if value is not None and value.utcoffset() is None:
            raise ValueError('发布时间必须包含时区')
        return value


class Evidence(StrictModel):
    action: str = Field(min_length=1, max_length=500)
    due: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=500)
    materials: list[str] = Field(default_factory=list, max_length=10)


class ModelItem(StrictModel):
    action: str = Field(min_length=1, max_length=60)
    due_text: str | None = Field(default=None, max_length=200)
    due_date: str | None = Field(default=None, max_length=20)
    due_at: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=100)
    materials: list[str] = Field(default_factory=list, max_length=10)
    evidence: Evidence
    review_reasons: list[str] = Field(default_factory=list, max_length=10)

    @field_validator('materials', 'review_reasons')
    @classmethod
    def short_strings(cls, values):
        if any(not item or len(item) > 200 for item in values):
            raise ValueError('列表项必须为1—200个字符')
        return values


class ModelResult(StrictModel):
    items: list[ModelItem] = Field(max_length=5)
    warnings: list[str] = Field(default_factory=list, max_length=10)


class Candidate(ModelItem):
    id: str


class ParseResponse(StrictModel):
    request_id: str
    parse_id: str
    mode: Literal['ai'] = 'ai'
    model_id: str
    items: list[Candidate]
    warnings: list[str]
    cached: bool = False


class DeepReadRequest(StrictModel):
    request_id: UUID
    text: str = Field(min_length=2, max_length=2000)
    actions: list[str] = Field(default_factory=list, max_length=5)

    @field_validator('actions')
    @classmethod
    def short_actions(cls, values):
        if any(not item or len(item) > 60 for item in values):
            raise ValueError('行动名称须为1—60个字符')
        return values


class DeepReadStep(StrictModel):
    instruction: str = Field(min_length=2, max_length=100)
    why: str = Field(min_length=2, max_length=160)
    source_quote: str = Field(min_length=1, max_length=200)


class DeepReadQuestion(StrictModel):
    question: str = Field(min_length=2, max_length=120)
    reason: str = Field(min_length=2, max_length=160)


class DeepReadResult(StrictModel):
    summary: str = Field(min_length=2, max_length=180)
    summary_quote: str = Field(min_length=1, max_length=200)
    steps: list[DeepReadStep] = Field(min_length=1, max_length=5)
    questions: list[DeepReadQuestion] = Field(default_factory=list, max_length=3)


class DeepReadResponse(DeepReadResult):
    request_id: str
    model_id: str
    mode: Literal['ai_deep_read'] = 'ai_deep_read'
    cached: bool = False

