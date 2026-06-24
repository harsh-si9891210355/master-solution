from datetime import datetime

from pydantic import BaseModel, Field


class EscalationStepBase(BaseModel):
    step_order: int = Field(..., ge=1)
    wait_seconds: int = Field(..., ge=0)
    escalate_to_role_id: int | None = None
    channels: list[str] = Field(default_factory=lambda: ["IN_APP"])


class EscalationStepResponse(EscalationStepBase):
    id: int
    escalate_to_role_name: str | None = None


class EscalationRuleBase(BaseModel):
    name: str = Field(..., max_length=255)
    alias_name: str | None = Field(default=None, max_length=255)
    usecase_id: int | None = None
    event_type: str | None = Field(default=None, max_length=255)
    severity_filter: str | None = Field(default=None, max_length=20)
    enabled: bool = True


class EscalationRuleCreate(EscalationRuleBase):
    steps: list[EscalationStepBase] = Field(default_factory=list)


class EscalationRuleUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    alias_name: str | None = Field(default=None, max_length=255)
    usecase_id: int | None = None
    event_type: str | None = Field(default=None, max_length=255)
    severity_filter: str | None = Field(default=None, max_length=20)
    enabled: bool | None = None
    steps: list[EscalationStepBase] | None = None


class EscalationRuleResponse(EscalationRuleBase):
    id: int
    created_by: int | None
    created_at: datetime
    updated_at: datetime | None
    steps: list[EscalationStepResponse]


class EscalationRulesResponse(BaseModel):
    rules: list[EscalationRuleResponse]


class EscalationDeleteResponse(BaseModel):
    message: str
