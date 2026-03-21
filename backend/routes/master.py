from flask import Blueprint, request

from backend.middleware.auth import master_auth_required
from backend.repositories.master_repository import MasterRepository
from backend.utils.http import success

master_bp = Blueprint("master", __name__, url_prefix="/master")


@master_bp.get("/tenants")
@master_auth_required
def list_tenants():
    search = request.args.get("search")
    status = request.args.get("status")
    data = MasterRepository.list_tenants_metrics(search=search, status=status)
    return success(data)


@master_bp.get("/overview")
@master_auth_required
def overview():
    search = request.args.get("search")
    status = request.args.get("status")
    data = MasterRepository.get_overview(search=search, status=status)
    return success(data)
