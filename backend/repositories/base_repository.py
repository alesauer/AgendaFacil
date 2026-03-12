class BaseRepository:
    @staticmethod
    def require_tenant(barbearia_id: str):
        if not barbearia_id:
            raise ValueError("barbearia_id é obrigatório")
