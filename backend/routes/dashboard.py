from flask import Blueprint, g

from backend.middleware.auth import auth_required
from backend.repositories.agendamentos_repository import AgendamentosRepository
from backend.repositories.barbearia_repository import BarbeariaRepository
from backend.utils.http import success

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@dashboard_bp.get("/metricas")
@auth_required
def metricas():
    return success(AgendamentosRepository.dashboard_metrics(g.barbearia_id) or {})


@dashboard_bp.get("/insights")
@auth_required
def insights():
    identity = BarbeariaRepository.get_identity(g.barbearia_id) or {}
    churn_threshold = int(identity.get("churn_risk_days_threshold") or 45)
    return success(AgendamentosRepository.dashboard_insights(g.barbearia_id, churn_threshold) or {})
