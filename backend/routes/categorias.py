from flask import Blueprint, g, request

from backend.middleware.auth import auth_required
from backend.repositories.categorias_repository import CategoriasRepository
from backend.utils.http import error, success

categorias_bp = Blueprint("categorias", __name__, url_prefix="/categorias")


@categorias_bp.get("")
@auth_required
def list_categorias():
    return success(CategoriasRepository.list_all(g.barbearia_id))


@categorias_bp.post("")
@auth_required
def create_categoria():
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    descricao = payload.get("descricao")
    if not nome:
        return error("nome é obrigatório", 400)
    categoria = CategoriasRepository.create(g.barbearia_id, nome, descricao)
    return success(categoria, 201)


@categorias_bp.put("/<categoria_id>")
@auth_required
def update_categoria(categoria_id: str):
    payload = request.get_json(silent=True) or {}
    nome = (payload.get("nome") or "").strip()
    descricao = payload.get("descricao")
    if not nome:
        return error("nome é obrigatório", 400)
    categoria = CategoriasRepository.update(g.barbearia_id, categoria_id, nome, descricao)
    if not categoria:
        return error("Categoria não encontrada", 404)
    return success(categoria)


@categorias_bp.delete("/<categoria_id>")
@auth_required
def delete_categoria(categoria_id: str):
    try:
        if CategoriasRepository.has_linked_services(g.barbearia_id, categoria_id):
            return error(
                "Esta categoria possui serviços vinculados. Realoque ou exclua os serviços antes de excluir a categoria.",
                409,
            )

        deleted = CategoriasRepository.delete(g.barbearia_id, categoria_id)
        if not deleted:
            return error("Categoria não encontrada", 404)
        return success({"id": deleted["id"]})
    except Exception as exc:
        message = str(exc).lower()
        if "foreign key" in message:
            return error(
                "Esta categoria possui serviços vinculados. Realoque ou exclua os serviços antes de excluir a categoria.",
                409,
            )
        return error("Falha interna ao excluir categoria.", 500)
