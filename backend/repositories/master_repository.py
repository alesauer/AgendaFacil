from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from backend.db import is_db_ready, query_all, query_one
from backend.supabase_client import get_supabase_client, is_supabase_ready


class MasterRepository:
    @staticmethod
    def _start_30d_iso_date() -> str:
        start = datetime.now(tz=timezone.utc).date() - timedelta(days=29)
        return start.isoformat()

    @staticmethod
    def _start_30d_iso_datetime() -> str:
        start = datetime.now(tz=timezone.utc) - timedelta(days=30)
        return start.isoformat()

    @staticmethod
    def list_tenants_metrics(search: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
        search_term = (search or "").strip().lower()
        status_filter = (status or "").strip().upper()
        start_date = MasterRepository._start_30d_iso_date()
        start_datetime = MasterRepository._start_30d_iso_datetime()

        if is_db_ready():
            rows = query_all(
                """
                WITH clientes_30d AS (
                  SELECT barbearia_id, COUNT(DISTINCT cliente_id) AS total
                  FROM agendamentos
                  WHERE data >= %s::date
                    AND status <> 'BLOCKED'
                  GROUP BY barbearia_id
                ),
                agendamentos_30d AS (
                  SELECT barbearia_id, COUNT(*) AS total
                  FROM agendamentos
                  WHERE data >= %s::date
                    AND status <> 'BLOCKED'
                  GROUP BY barbearia_id
                ),
                mensagens_30d AS (
                  SELECT barbearia_id, COUNT(*) AS total
                  FROM notification_dispatches
                  WHERE created_at >= %s::timestamptz
                    AND status = 'SENT'
                  GROUP BY barbearia_id
                ),
                receita_30d AS (
                  SELECT barbearia_id, COALESCE(SUM(valor_final), 0) AS total
                  FROM agendamentos
                  WHERE data >= %s::date
                    AND status IN ('COMPLETED', 'COMPLETED_OP', 'COMPLETED_FIN')
                  GROUP BY barbearia_id
                ),
                ultimo_acesso AS (
                  SELECT barbearia_id, MAX(updated_at) AS ultimo
                  FROM usuarios
                  GROUP BY barbearia_id
                )
                SELECT
                  b.id,
                  b.nome,
                  b.slug,
                  COALESCE(b.plano, 'BASIC') AS plano,
                  COALESCE(b.assinatura_status, 'ACTIVE') AS assinatura_status,
                  b.created_at,
                  COALESCE(c.total, 0) AS clientes_30d,
                  COALESCE(a.total, 0) AS agendamentos_30d,
                  COALESCE(m.total, 0) AS mensagens_30d,
                  COALESCE(r.total, 0) AS receita_30d,
                  u.ultimo AS ultimo_acesso
                FROM barbearias b
                LEFT JOIN clientes_30d c ON c.barbearia_id = b.id
                LEFT JOIN agendamentos_30d a ON a.barbearia_id = b.id
                LEFT JOIN mensagens_30d m ON m.barbearia_id = b.id
                LEFT JOIN receita_30d r ON r.barbearia_id = b.id
                LEFT JOIN ultimo_acesso u ON u.barbearia_id = b.id
                ORDER BY b.created_at DESC
                """,
                (start_date, start_date, start_datetime, start_date),
            )
            return MasterRepository._filter_rows(rows, search_term, status_filter)

        if is_supabase_ready():
            supabase = get_supabase_client()

            try:
                tenants_response = (
                    supabase.table("barbearias")
                    .select("id,nome,slug,plano,assinatura_status,created_at")
                    .order("created_at", desc=True)
                    .execute()
                )
            except Exception:
                tenants_response = (
                    supabase.table("barbearias")
                    .select("id,nome,slug,created_at")
                    .order("created_at", desc=True)
                    .execute()
                )

            tenants = tenants_response.data or []
            if not tenants:
                return []

            appointments_response = (
                supabase.table("agendamentos")
                .select("barbearia_id,cliente_id,status,valor_final,data")
                .gte("data", start_date)
                .execute()
            )
            appointments = appointments_response.data or []

            dispatches_response = (
                supabase.table("notification_dispatches")
                .select("barbearia_id,status,created_at")
                .gte("created_at", start_datetime)
                .execute()
            )
            dispatches = dispatches_response.data or []

            users_response = (
                supabase.table("usuarios")
                .select("barbearia_id,updated_at")
                .execute()
            )
            users = users_response.data or []

            by_tenant: dict[str, dict[str, Any]] = {}
            for tenant in tenants:
                tenant_id = str(tenant.get("id") or "")
                if not tenant_id:
                    continue
                by_tenant[tenant_id] = {
                    "id": tenant_id,
                    "nome": tenant.get("nome") or "Barbearia",
                    "slug": tenant.get("slug") or "",
                    "plano": tenant.get("plano") or "BASIC",
                    "assinatura_status": tenant.get("assinatura_status") or "ACTIVE",
                    "created_at": tenant.get("created_at"),
                    "clientes_30d": 0,
                    "agendamentos_30d": 0,
                    "mensagens_30d": 0,
                    "receita_30d": 0.0,
                    "ultimo_acesso": None,
                }

            distinct_clients_by_tenant: dict[str, set[str]] = {tenant_id: set() for tenant_id in by_tenant}

            for item in appointments:
                tenant_id = str(item.get("barbearia_id") or "")
                if tenant_id not in by_tenant:
                    continue
                status = str(item.get("status") or "").upper()
                if status != "BLOCKED":
                    by_tenant[tenant_id]["agendamentos_30d"] += 1
                client_id = str(item.get("cliente_id") or "")
                if client_id and status != "BLOCKED":
                    distinct_clients_by_tenant[tenant_id].add(client_id)
                if status in {"COMPLETED", "COMPLETED_OP", "COMPLETED_FIN"}:
                    try:
                        by_tenant[tenant_id]["receita_30d"] += float(item.get("valor_final") or 0)
                    except Exception:
                        pass

            for tenant_id, client_ids in distinct_clients_by_tenant.items():
                by_tenant[tenant_id]["clientes_30d"] = len(client_ids)

            for item in dispatches:
                tenant_id = str(item.get("barbearia_id") or "")
                if tenant_id not in by_tenant:
                    continue
                if str(item.get("status") or "").upper() == "SENT":
                    by_tenant[tenant_id]["mensagens_30d"] += 1

            for item in users:
                tenant_id = str(item.get("barbearia_id") or "")
                if tenant_id not in by_tenant:
                    continue
                updated = item.get("updated_at")
                current = by_tenant[tenant_id]["ultimo_acesso"]
                if updated and (current is None or str(updated) > str(current)):
                    by_tenant[tenant_id]["ultimo_acesso"] = updated

            rows = list(by_tenant.values())
            return MasterRepository._filter_rows(rows, search_term, status_filter)

        return []

    @staticmethod
    def _filter_rows(rows: list[dict[str, Any]], search_term: str, status_filter: str) -> list[dict[str, Any]]:
        filtered = rows
        if search_term:
            filtered = [
                row for row in filtered
                if search_term in str(row.get("nome", "")).lower() or search_term in str(row.get("slug", "")).lower()
            ]

        if status_filter:
            filtered = [
                row for row in filtered
                if str(row.get("assinatura_status", "")).upper() == status_filter
            ]

        return filtered

    @staticmethod
    def get_overview(search: str | None = None, status: str | None = None) -> dict[str, Any]:
        tenants = MasterRepository.list_tenants_metrics(search=search, status=status)
        return {
            "total_tenants": len(tenants),
            "tenants_ativos": len([item for item in tenants if str(item.get("assinatura_status", "")).upper() == "ACTIVE"]),
            "clientes_30d": sum(int(item.get("clientes_30d") or 0) for item in tenants),
            "agendamentos_30d": sum(int(item.get("agendamentos_30d") or 0) for item in tenants),
            "mensagens_30d": sum(int(item.get("mensagens_30d") or 0) for item in tenants),
            "receita_30d": round(sum(float(item.get("receita_30d") or 0) for item in tenants), 2),
        }
