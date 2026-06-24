from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.db_connection import get_db
from src.schemas.escalation import (
    EscalationDeleteResponse,
    EscalationRuleCreate,
    EscalationRuleResponse,
    EscalationRulesResponse,
    EscalationRuleUpdate,
)
from src.services.v1.escalation_services import (
    create_escalation_rule,
    delete_escalation_rule,
    list_rules,
    update_escalation_rule,
)
from src.utils.auth.auth import require_permission

router = APIRouter()


@router.get("/rules", response_model=EscalationRulesResponse, dependencies=[Depends(require_permission("escalation:read"))])
def list_rules_route(db: Session = Depends(get_db)) -> EscalationRulesResponse:
    return list_rules(db)


@router.post("/rules", response_model=EscalationRuleResponse, status_code=201)
def create_rule_route(
    payload: EscalationRuleCreate,
    db: Session = Depends(get_db),
    current=Depends(require_permission("escalation:create")),
) -> EscalationRuleResponse:
    return create_escalation_rule(db, payload, current["user"].id)


@router.put("/rules/{rule_id}", response_model=EscalationRuleResponse, dependencies=[Depends(require_permission("escalation:update"))])
def update_rule_route(
    rule_id: int,
    payload: EscalationRuleUpdate,
    db: Session = Depends(get_db),
) -> EscalationRuleResponse:
    return update_escalation_rule(db, rule_id, payload)


@router.delete("/rules/{rule_id}", response_model=EscalationDeleteResponse, dependencies=[Depends(require_permission("escalation:delete"))])
def delete_rule_route(rule_id: int, db: Session = Depends(get_db)) -> EscalationDeleteResponse:
    delete_escalation_rule(db, rule_id)
    return EscalationDeleteResponse(message="Escalation rule deleted")
