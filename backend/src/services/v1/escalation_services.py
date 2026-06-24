from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.crud.escalation import (
    create_rule,
    delete_rule,
    get_all_rules,
    get_rule_by_id,
    update_rule,
)
from src.models.escalation_rule import EscalationRule
from src.schemas.escalation import (
    EscalationRuleCreate,
    EscalationRuleResponse,
    EscalationRulesResponse,
    EscalationRuleUpdate,
    EscalationStepResponse,
)


def _build_rule_response(rule: EscalationRule) -> EscalationRuleResponse:
    return EscalationRuleResponse(
        id=rule.id,
        name=rule.name,
        alias_name=rule.alias_name,
        usecase_id=rule.usecase_id,
        event_type=rule.event_type,
        severity_filter=rule.severity_filter,
        enabled=rule.enabled,
        created_by=rule.created_by,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
        steps=[
            EscalationStepResponse(
                id=step.id,
                step_order=step.step_order,
                wait_seconds=step.wait_seconds,
                escalate_to_role_id=step.escalate_to_role_id,
                escalate_to_role_name=(step.escalate_to_role.name_en if step.escalate_to_role else None),
                channels=[c for c in (step.channels or "").split(",") if c],
            )
            for step in rule.steps
        ],
    )


def list_rules(db: Session) -> EscalationRulesResponse:
    return EscalationRulesResponse(rules=[_build_rule_response(r) for r in get_all_rules(db)])


def create_escalation_rule(db: Session, payload: EscalationRuleCreate, created_by: int) -> EscalationRuleResponse:
    rule = create_rule(
        db,
        data=payload.model_dump(exclude={"steps"}),
        steps=[s.model_dump() for s in payload.steps],
        created_by=created_by,
    )
    rule = get_rule_by_id(db, rule.id) or rule
    return _build_rule_response(rule)


def update_escalation_rule(db: Session, rule_id: int, payload: EscalationRuleUpdate) -> EscalationRuleResponse:
    rule = get_rule_by_id(db, rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation rule not found")
    steps = [s.model_dump() for s in payload.steps] if payload.steps is not None else None
    rule = update_rule(db, rule=rule, data=payload.model_dump(exclude={"steps"}, exclude_unset=True), steps=steps)
    rule = get_rule_by_id(db, rule.id) or rule
    return _build_rule_response(rule)


def delete_escalation_rule(db: Session, rule_id: int) -> None:
    rule = get_rule_by_id(db, rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Escalation rule not found")
    delete_rule(db, rule=rule)
