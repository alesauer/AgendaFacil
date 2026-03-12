from flask import Blueprint, g

from backend.middleware.auth import auth_required
from backend.repositories.agendamentos_repository import AgendamentosRepository
from backend.utils.http import success

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@dashboard_bp.get("/metricas")
@auth_required
def metricas():
    return success(AgendamentosRepository.dashboard_metrics(g.barbearia_id) or {})
