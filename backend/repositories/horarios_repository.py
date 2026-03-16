from backend.db import is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


DEFAULT_HORARIOS = {
    1: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "19:00"},
    2: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "19:00"},
    3: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "19:00"},
    4: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "19:00"},
    5: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "20:00"},
    6: {"aberto": True, "hora_inicio": "08:00", "hora_fim": "18:00"},
    0: {"aberto": False, "hora_inicio": "00:00", "hora_fim": "00:00"},
}


class HorariosFuncionamentoRepository(BaseRepository):
    @staticmethod
    def _sort_key(dia_semana: int):
        return 7 if int(dia_semana) == 0 else int(dia_semana)

    @staticmethod
    def _normalize_item(item: dict):
        return {
            "id": item.get("id"),
            "barbearia_id": item.get("barbearia_id"),
            "dia_semana": int(item.get("dia_semana")),
            "aberto": bool(item.get("aberto")),
            "hora_inicio": str(item.get("hora_inicio"))[:5],
            "hora_fim": str(item.get("hora_fim"))[:5],
        }

    @staticmethod
    def _fetch_all(barbearia_id: str):
        if is_db_ready():
            return query_all(
                """
                SELECT id, barbearia_id, dia_semana, aberto,
                       hora_inicio::text AS hora_inicio,
                       hora_fim::text AS hora_fim
                FROM barbearia_horarios_funcionamento
                WHERE barbearia_id = %s
                ORDER BY dia_semana
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("barbearia_horarios_funcionamento")
                .select("id,barbearia_id,dia_semana,aberto,hora_inicio,hora_fim")
                .eq("barbearia_id", barbearia_id)
                .order("dia_semana")
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def _upsert_many(barbearia_id: str, horarios: list[dict]):
        if not horarios:
            return

        if is_db_ready():
            for horario in horarios:
                query_one(
                    """
                    INSERT INTO barbearia_horarios_funcionamento (
                        barbearia_id, dia_semana, aberto, hora_inicio, hora_fim
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (barbearia_id, dia_semana)
                    DO UPDATE SET
                        aberto = EXCLUDED.aberto,
                        hora_inicio = EXCLUDED.hora_inicio,
                        hora_fim = EXCLUDED.hora_fim,
                        updated_at = NOW()
                    RETURNING id
                    """,
                    (
                        barbearia_id,
                        int(horario["dia_semana"]),
                        bool(horario["aberto"]),
                        horario["hora_inicio"],
                        horario["hora_fim"],
                    ),
                )
            return

        if is_supabase_ready():
            supabase = get_supabase_client()
            payload = [
                {
                    "barbearia_id": barbearia_id,
                    "dia_semana": int(horario["dia_semana"]),
                    "aberto": bool(horario["aberto"]),
                    "hora_inicio": horario["hora_inicio"],
                    "hora_fim": horario["hora_fim"],
                }
                for horario in horarios
            ]
            (
                supabase.table("barbearia_horarios_funcionamento")
                .upsert(payload, on_conflict="barbearia_id,dia_semana")
                .execute()
            )

    @staticmethod
    def ensure_defaults(barbearia_id: str):
        HorariosFuncionamentoRepository.require_tenant(barbearia_id)
        existing = HorariosFuncionamentoRepository._fetch_all(barbearia_id)
        existing_days = {int(item["dia_semana"]) for item in existing}
        missing_days = [day for day in DEFAULT_HORARIOS.keys() if day not in existing_days]

        if not missing_days:
            return

        HorariosFuncionamentoRepository._upsert_many(
            barbearia_id,
            [
                {
                    "dia_semana": day,
                    "aberto": DEFAULT_HORARIOS[day]["aberto"],
                    "hora_inicio": DEFAULT_HORARIOS[day]["hora_inicio"],
                    "hora_fim": DEFAULT_HORARIOS[day]["hora_fim"],
                }
                for day in missing_days
            ],
        )

    @staticmethod
    def list_all(barbearia_id: str):
        HorariosFuncionamentoRepository.require_tenant(barbearia_id)
        HorariosFuncionamentoRepository.ensure_defaults(barbearia_id)
        items = HorariosFuncionamentoRepository._fetch_all(barbearia_id)
        normalized = [HorariosFuncionamentoRepository._normalize_item(item) for item in items]
        normalized.sort(key=lambda item: HorariosFuncionamentoRepository._sort_key(item["dia_semana"]))
        return normalized

    @staticmethod
    def get_by_weekday(barbearia_id: str, dia_semana: int):
        HorariosFuncionamentoRepository.require_tenant(barbearia_id)
        HorariosFuncionamentoRepository.ensure_defaults(barbearia_id)

        if is_db_ready():
            result = query_one(
                """
                SELECT id, barbearia_id, dia_semana, aberto,
                       hora_inicio::text AS hora_inicio,
                       hora_fim::text AS hora_fim
                FROM barbearia_horarios_funcionamento
                WHERE barbearia_id = %s AND dia_semana = %s
                """,
                (barbearia_id, int(dia_semana)),
            )
            if result:
                return HorariosFuncionamentoRepository._normalize_item(result)

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("barbearia_horarios_funcionamento")
                .select("id,barbearia_id,dia_semana,aberto,hora_inicio,hora_fim")
                .eq("barbearia_id", barbearia_id)
                .eq("dia_semana", int(dia_semana))
                .limit(1)
                .execute()
            )
            data = response.data or []
            if data:
                return HorariosFuncionamentoRepository._normalize_item(data[0])

        fallback = DEFAULT_HORARIOS.get(int(dia_semana), DEFAULT_HORARIOS[1])
        return {
            "id": None,
            "barbearia_id": barbearia_id,
            "dia_semana": int(dia_semana),
            "aberto": fallback["aberto"],
            "hora_inicio": fallback["hora_inicio"],
            "hora_fim": fallback["hora_fim"],
        }

    @staticmethod
    def save_many(barbearia_id: str, horarios: list[dict]):
        HorariosFuncionamentoRepository.require_tenant(barbearia_id)
        HorariosFuncionamentoRepository._upsert_many(barbearia_id, horarios)
        return HorariosFuncionamentoRepository.list_all(barbearia_id)
