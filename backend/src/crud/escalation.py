from sqlalchemy.orm import Session, selectinload

from src.models.escalation_rule import EscalationRule, EscalationStep


def get_rule_by_id(db: Session, rule_id: int) -> EscalationRule | None:
    return (
        db.query(EscalationRule)
        .options(selectinload(EscalationRule.steps).selectinload(EscalationStep.escalate_to_role))
        .filter(EscalationRule.id == rule_id)
        .first()
    )


def get_all_rules(db: Session) -> list[EscalationRule]:
    return (
        db.query(EscalationRule)
        .options(selectinload(EscalationRule.steps).selectinload(EscalationStep.escalate_to_role))
        .order_by(EscalationRule.id.desc())
        .all()
    )


def _apply_steps(rule: EscalationRule, steps: list[dict]) -> None:
    rule.steps.clear()
    for step in steps:
        rule.steps.append(
            EscalationStep(
                step_order=step["step_order"],
                wait_seconds=step["wait_seconds"],
                escalate_to_role_id=step.get("escalate_to_role_id"),
                channels=",".join(step.get("channels") or ["IN_APP"]),
            )
        )


def create_rule(db: Session, *, data: dict, steps: list[dict], created_by: int | None) -> EscalationRule:
    rule = EscalationRule(
        name=data["name"],
        alias_name=data.get("alias_name"),
        usecase_id=data.get("usecase_id"),
        event_type=data.get("event_type"),
        severity_filter=data.get("severity_filter"),
        enabled=data.get("enabled", True),
        created_by=created_by,
    )
    _apply_steps(rule, steps)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def update_rule(db: Session, *, rule: EscalationRule, data: dict, steps: list[dict] | None) -> EscalationRule:
    for key in ("name", "alias_name", "usecase_id", "event_type", "severity_filter", "enabled"):
        if key in data and data[key] is not None:
            setattr(rule, key, data[key])
    if steps is not None:
        _apply_steps(rule, steps)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def delete_rule(db: Session, *, rule: EscalationRule) -> None:
    db.delete(rule)
    db.commit()
