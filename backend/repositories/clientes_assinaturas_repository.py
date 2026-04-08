from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta, timezone
from typing import Any

from backend.db import execute, is_db_ready, query_all, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class ClientesAssinaturasRepository(BaseRepository):
    @staticmethod
    def _add_one_month(base: date) -> date:
        month = base.month + 1
        year = base.year
        if month == 13:
            month = 1
            year += 1
        last_day = calendar.monthrange(year, month)[1]
        day = min(base.day, last_day)
        return date(year, month, day)

    @staticmethod
    def _cycle_from_start(cycle_start: date) -> tuple[date, date, datetime]:
        next_start = ClientesAssinaturasRepository._add_one_month(cycle_start)
        cycle_end = next_start - timedelta(days=1)
        next_due_at = datetime.combine(next_start, time.min, tzinfo=timezone.utc)
        return cycle_start, cycle_end, next_due_at

    @staticmethod
    def _to_date(value: Any) -> date:
        if value is None:
            raise ValueError("date value is required")
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        raw = str(value).strip()
        if not raw:
            raise ValueError("date value is empty")
        try:
            return date.fromisoformat(raw)
        except ValueError:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed.date()

    @staticmethod
    def _to_datetime(value: Any) -> datetime | None:
        if not value:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)

    @staticmethod
    def _is_missing_table_or_column(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "does not exist" in message
            or "undefined table" in message
            or "schema cache" in message
            or "column" in message
        )

    @staticmethod
    def _is_transient_connection_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "server disconnected" in message
            or "connection reset" in message
            or "connection aborted" in message
            or "broken pipe" in message
            or "timeout" in message
            or "temporarily unavailable" in message
        )

    @staticmethod
    def _get_plan_services(barbearia_id: str, plano_id: str):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_all(
                """
                SELECT psi.id, psi.plano_id, psi.servico_id, psi.quantidade_mensal,
                       s.nome AS servico_nome
                FROM client_subscription_plan_services psi
                JOIN servicos s ON s.id = psi.servico_id AND s.barbearia_id = %s
                JOIN client_subscription_plans p ON p.id = psi.plano_id AND p.barbearia_id = %s
                WHERE psi.plano_id = %s
                ORDER BY s.nome
                """,
                (barbearia_id, barbearia_id, plano_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_plan_services")
                .select("id,plano_id,servico_id,quantidade_mensal,servicos!inner(nome)")
                .eq("plano_id", plano_id)
                .execute()
            )
            items = response.data or []
            normalized = []
            for item in items:
                nested = item.get("servicos") or {}
                normalized.append(
                    {
                        "id": item.get("id"),
                        "plano_id": item.get("plano_id"),
                        "servico_id": item.get("servico_id"),
                        "quantidade_mensal": item.get("quantidade_mensal"),
                        "servico_nome": nested.get("nome"),
                    }
                )
            return normalized

        return []

    @staticmethod
    def _count_active_subscriptions_by_plan(barbearia_id: str) -> dict[str, int]:
        ClientesAssinaturasRepository.require_tenant(barbearia_id)

        if is_db_ready():
            rows = query_all(
                """
                SELECT plano_id, COUNT(*)::int AS total
                FROM client_subscriptions
                WHERE barbearia_id = %s
                  AND status <> 'CANCELLED'
                GROUP BY plano_id
                """,
                (barbearia_id,),
            )
            return {
                str(item.get("plano_id")): int(item.get("total") or 0)
                for item in rows
                if item.get("plano_id")
            }

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscriptions")
                .select("plano_id")
                .eq("barbearia_id", barbearia_id)
                .neq("status", "CANCELLED")
                .execute()
            )
            counter: dict[str, int] = {}
            for item in response.data or []:
                plano_id = str(item.get("plano_id") or "")
                if not plano_id:
                    continue
                counter[plano_id] = counter.get(plano_id, 0) + 1
            return counter

        return {}

    @staticmethod
    def list_planos(barbearia_id: str):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        planos = []
        if is_db_ready():
            planos = query_all(
                """
                SELECT id, barbearia_id, nome, descricao, valor_mensal_centavos,
                       dias_carencia, ativo, created_at, updated_at
                FROM client_subscription_plans
                WHERE barbearia_id = %s
                ORDER BY ativo DESC, nome ASC
                """,
                (barbearia_id,),
            )
        elif is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_plans")
                .select("id,barbearia_id,nome,descricao,valor_mensal_centavos,dias_carencia,ativo,created_at,updated_at")
                .eq("barbearia_id", barbearia_id)
                .order("ativo", desc=True)
                .order("nome")
                .execute()
            )
            planos = response.data or []

        active_counts_by_plan = ClientesAssinaturasRepository._count_active_subscriptions_by_plan(barbearia_id)

        for plano in planos:
            plano["servicos"] = ClientesAssinaturasRepository._get_plan_services(
                barbearia_id,
                str(plano.get("id")),
            )
            plano["clientes_ativos_count"] = active_counts_by_plan.get(str(plano.get("id")), 0)
        return planos

    @staticmethod
    def create_plano(
        barbearia_id: str,
        nome: str,
        descricao: str | None,
        valor_mensal_centavos: int,
        dias_carencia: int,
        servicos: list[dict[str, Any]],
    ):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            plano = query_one(
                """
                INSERT INTO client_subscription_plans (
                    barbearia_id, nome, descricao, valor_mensal_centavos, dias_carencia, ativo
                ) VALUES (%s, %s, %s, %s, %s, TRUE)
                RETURNING id, barbearia_id, nome, descricao, valor_mensal_centavos,
                          dias_carencia, ativo, created_at, updated_at
                """,
                (barbearia_id, nome, descricao, valor_mensal_centavos, dias_carencia),
            )
            plano_id = str(plano.get("id"))
            for item in servicos:
                execute(
                    """
                    INSERT INTO client_subscription_plan_services (plano_id, servico_id, quantidade_mensal)
                    VALUES (%s, %s, %s)
                    """,
                    (plano_id, item["servico_id"], item["quantidade_mensal"]),
                )
            plano["servicos"] = ClientesAssinaturasRepository._get_plan_services(barbearia_id, plano_id)
            return plano

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_plans")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "nome": nome,
                        "descricao": descricao,
                        "valor_mensal_centavos": valor_mensal_centavos,
                        "dias_carencia": dias_carencia,
                        "ativo": True,
                    }
                )
                .execute()
            )
            data = response.data or []
            if not data:
                return None
            plano = data[0]
            plano_id = str(plano.get("id"))
            if servicos:
                supabase.table("client_subscription_plan_services").insert(
                    [
                        {
                            "plano_id": plano_id,
                            "servico_id": item["servico_id"],
                            "quantidade_mensal": item["quantidade_mensal"],
                        }
                        for item in servicos
                    ]
                ).execute()
            plano["servicos"] = ClientesAssinaturasRepository._get_plan_services(barbearia_id, plano_id)
            return plano

        return None

    @staticmethod
    def update_plano(
        barbearia_id: str,
        plano_id: str,
        nome: str,
        descricao: str | None,
        valor_mensal_centavos: int,
        dias_carencia: int,
        ativo: bool,
        servicos: list[dict[str, Any]],
    ):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            updated = query_one(
                """
                UPDATE client_subscription_plans
                SET nome = %s,
                    descricao = %s,
                    valor_mensal_centavos = %s,
                    dias_carencia = %s,
                    ativo = %s,
                    updated_at = NOW()
                WHERE id = %s AND barbearia_id = %s
                RETURNING id, barbearia_id, nome, descricao, valor_mensal_centavos,
                          dias_carencia, ativo, created_at, updated_at
                """,
                (nome, descricao, valor_mensal_centavos, dias_carencia, ativo, plano_id, barbearia_id),
            )
            if not updated:
                return None
            execute(
                "DELETE FROM client_subscription_plan_services WHERE plano_id = %s",
                (plano_id,),
            )
            for item in servicos:
                execute(
                    """
                    INSERT INTO client_subscription_plan_services (plano_id, servico_id, quantidade_mensal)
                    VALUES (%s, %s, %s)
                    """,
                    (plano_id, item["servico_id"], item["quantidade_mensal"]),
                )
            updated["servicos"] = ClientesAssinaturasRepository._get_plan_services(barbearia_id, plano_id)
            return updated

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_plans")
                .update(
                    {
                        "nome": nome,
                        "descricao": descricao,
                        "valor_mensal_centavos": valor_mensal_centavos,
                        "dias_carencia": dias_carencia,
                        "ativo": ativo,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .eq("id", plano_id)
                .eq("barbearia_id", barbearia_id)
                .execute()
            )
            data = response.data or []
            if not data:
                return None
            supabase.table("client_subscription_plan_services").delete().eq("plano_id", plano_id).execute()
            if servicos:
                supabase.table("client_subscription_plan_services").insert(
                    [
                        {
                            "plano_id": plano_id,
                            "servico_id": item["servico_id"],
                            "quantidade_mensal": item["quantidade_mensal"],
                        }
                        for item in servicos
                    ]
                ).execute()
            updated = data[0]
            updated["servicos"] = ClientesAssinaturasRepository._get_plan_services(barbearia_id, plano_id)
            return updated

        return None

    @staticmethod
    def delete_plano(barbearia_id: str, plano_id: str):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)

        if is_db_ready():
            in_use = query_one(
                """
                SELECT id
                FROM client_subscriptions
                WHERE barbearia_id = %s
                  AND plano_id = %s
                  AND status <> 'CANCELLED'
                LIMIT 1
                """,
                (barbearia_id, plano_id),
            )
            if in_use:
                return None, "Plano possui assinaturas ativas e não pode ser excluído"

            deleted = query_one(
                """
                DELETE FROM client_subscription_plans
                WHERE id = %s AND barbearia_id = %s
                RETURNING id
                """,
                (plano_id, barbearia_id),
            )
            return deleted, None

        if is_supabase_ready():
            supabase = get_supabase_client()

            in_use_response = (
                supabase.table("client_subscriptions")
                .select("id")
                .eq("barbearia_id", barbearia_id)
                .eq("plano_id", plano_id)
                .neq("status", "CANCELLED")
                .limit(1)
                .execute()
            )
            if in_use_response.data:
                return None, "Plano possui assinaturas ativas e não pode ser excluído"

            response = (
                supabase.table("client_subscription_plans")
                .delete()
                .eq("id", plano_id)
                .eq("barbearia_id", barbearia_id)
                .execute()
            )
            data = response.data or []
            deleted = data[0] if data else None
            return deleted, None

        return None, "Storage indisponível"

    @staticmethod
    def _get_plano(barbearia_id: str, plano_id: str):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, nome, descricao, valor_mensal_centavos,
                       dias_carencia, ativo, created_at, updated_at
                FROM client_subscription_plans
                WHERE id = %s AND barbearia_id = %s
                """,
                (plano_id, barbearia_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_plans")
                .select("id,barbearia_id,nome,descricao,valor_mensal_centavos,dias_carencia,ativo,created_at,updated_at")
                .eq("id", plano_id)
                .eq("barbearia_id", barbearia_id)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def _payment_exists_for_cycle(subscription_id: str, cycle_start: date, cycle_end: date) -> bool:
        if is_db_ready():
            row = query_one(
                """
                SELECT id
                FROM client_subscription_payments
                WHERE subscription_id = %s AND cycle_start = %s AND cycle_end = %s
                LIMIT 1
                """,
                (subscription_id, cycle_start, cycle_end),
            )
            return bool(row)

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_payments")
                .select("id")
                .eq("subscription_id", subscription_id)
                .eq("cycle_start", cycle_start.isoformat())
                .eq("cycle_end", cycle_end.isoformat())
                .limit(1)
                .execute()
            )
            return bool(response.data)

        return False

    @staticmethod
    def _update_subscription_state(subscription: dict[str, Any], status: str, grace_until: datetime | None):
        subscription_id = str(subscription.get("id"))
        if is_db_ready():
            updated = query_one(
                """
                UPDATE client_subscriptions
                SET status = %s,
                    grace_until = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, barbearia_id, cliente_id, plano_id, status,
                          started_at, current_cycle_start, current_cycle_end,
                          next_due_at, grace_until, cancelled_at, cancel_reason,
                          last_payment_at, last_payment_amount_centavos,
                          created_at, updated_at
                """,
                (status, grace_until, subscription_id),
            )
            return updated or subscription

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscriptions")
                .update(
                    {
                        "status": status,
                        "grace_until": grace_until.isoformat() if grace_until else None,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .eq("id", subscription_id)
                .execute()
            )
            data = response.data or []
            return data[0] if data else subscription

        return subscription

    @staticmethod
    def _advance_cycle_if_needed(subscription: dict[str, Any], grace_days: int):
        status = str(subscription.get("status") or "")
        if status in {"CANCELLED", "PAUSED"}:
            return subscription

        today = date.today()
        cycle_start = ClientesAssinaturasRepository._to_date(subscription.get("current_cycle_start"))
        cycle_end = ClientesAssinaturasRepository._to_date(subscription.get("current_cycle_end"))
        changed_cycle = False

        while today > cycle_end:
            cycle_start = cycle_end + timedelta(days=1)
            _, cycle_end, next_due_at = ClientesAssinaturasRepository._cycle_from_start(cycle_start)
            changed_cycle = True
            subscription["current_cycle_start"] = cycle_start
            subscription["current_cycle_end"] = cycle_end
            subscription["next_due_at"] = next_due_at

        if changed_cycle:
            if is_db_ready():
                subscription = query_one(
                    """
                    UPDATE client_subscriptions
                    SET current_cycle_start = %s,
                        current_cycle_end = %s,
                        next_due_at = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, barbearia_id, cliente_id, plano_id, status,
                              started_at, current_cycle_start, current_cycle_end,
                              next_due_at, grace_until, cancelled_at, cancel_reason,
                              last_payment_at, last_payment_amount_centavos,
                              created_at, updated_at
                    """,
                    (
                        cycle_start,
                        cycle_end,
                        subscription.get("next_due_at"),
                        str(subscription.get("id")),
                    ),
                ) or subscription
            elif is_supabase_ready():
                supabase = get_supabase_client()
                response = (
                    supabase.table("client_subscriptions")
                    .update(
                        {
                            "current_cycle_start": cycle_start.isoformat(),
                            "current_cycle_end": cycle_end.isoformat(),
                            "next_due_at": (
                                subscription.get("next_due_at").isoformat()
                                if isinstance(subscription.get("next_due_at"), datetime)
                                else str(subscription.get("next_due_at"))
                            ),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    .eq("id", str(subscription.get("id")))
                    .execute()
                )
                rows = response.data or []
                if rows:
                    subscription = rows[0]

        cycle_start = ClientesAssinaturasRepository._to_date(subscription.get("current_cycle_start"))
        cycle_end = ClientesAssinaturasRepository._to_date(subscription.get("current_cycle_end"))
        payment_exists = ClientesAssinaturasRepository._payment_exists_for_cycle(
            str(subscription.get("id")), cycle_start, cycle_end
        )

        if payment_exists:
            return ClientesAssinaturasRepository._update_subscription_state(subscription, "ACTIVE", None)

        grace_until = datetime.combine(cycle_end, time.max, tzinfo=timezone.utc) + timedelta(days=grace_days)
        now = datetime.now(timezone.utc)
        if now <= grace_until:
            return ClientesAssinaturasRepository._update_subscription_state(subscription, "GRACE", grace_until)

        return ClientesAssinaturasRepository._update_subscription_state(subscription, "PAST_DUE", grace_until)

    @staticmethod
    def _get_subscription_by_cliente(barbearia_id: str, cliente_id: str):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            return query_one(
                """
                SELECT id, barbearia_id, cliente_id, plano_id, status,
                       started_at, current_cycle_start, current_cycle_end,
                       next_due_at, grace_until, cancelled_at, cancel_reason,
                       last_payment_at, last_payment_amount_centavos,
                       created_at, updated_at
                FROM client_subscriptions
                WHERE barbearia_id = %s
                  AND cliente_id = %s
                  AND status <> 'CANCELLED'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (barbearia_id, cliente_id),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscriptions")
                .select("id,barbearia_id,cliente_id,plano_id,status,started_at,current_cycle_start,current_cycle_end,next_due_at,grace_until,cancelled_at,cancel_reason,last_payment_at,last_payment_amount_centavos,created_at,updated_at")
                .eq("barbearia_id", barbearia_id)
                .eq("cliente_id", cliente_id)
                .neq("status", "CANCELLED")
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def _count_usage_for_cycle(subscription_id: str, servico_id: str, cycle_start: date, cycle_end: date) -> int:
        if is_db_ready():
            row = query_one(
                """
                SELECT COALESCE(SUM(quantidade), 0) AS total
                FROM client_subscription_usages
                WHERE subscription_id = %s
                  AND servico_id = %s
                  AND reversed_at IS NULL
                  AND used_at::date BETWEEN %s AND %s
                """,
                (subscription_id, servico_id, cycle_start, cycle_end),
            )
            return int((row or {}).get("total") or 0)

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_usages")
                .select("quantidade")
                .eq("subscription_id", subscription_id)
                .eq("servico_id", servico_id)
                .is_("reversed_at", "null")
                .gte("used_at", f"{cycle_start.isoformat()}T00:00:00Z")
                .lte("used_at", f"{cycle_end.isoformat()}T23:59:59Z")
                .execute()
            )
            rows = response.data or []
            return int(sum(int(item.get("quantidade") or 0) for item in rows))

        return 0

    @staticmethod
    def get_assinatura_cliente(barbearia_id: str, cliente_id: str):
        subscription = ClientesAssinaturasRepository._get_subscription_by_cliente(barbearia_id, cliente_id)
        if not subscription:
            return None

        plano = ClientesAssinaturasRepository._get_plano(barbearia_id, str(subscription.get("plano_id")))
        if not plano:
            return None

        try:
            subscription = ClientesAssinaturasRepository._advance_cycle_if_needed(
                subscription,
                int(plano.get("dias_carencia") or 7),
            )
        except Exception as exc:
            if not ClientesAssinaturasRepository._is_transient_connection_error(exc):
                raise
        cycle_start = ClientesAssinaturasRepository._to_date(subscription.get("current_cycle_start"))
        cycle_end = ClientesAssinaturasRepository._to_date(subscription.get("current_cycle_end"))

        plan_services = ClientesAssinaturasRepository._get_plan_services(barbearia_id, str(plano.get("id")))
        benefits = []
        for item in plan_services:
            included = int(item.get("quantidade_mensal") or 0)
            consumed = ClientesAssinaturasRepository._count_usage_for_cycle(
                str(subscription.get("id")),
                str(item.get("servico_id")),
                cycle_start,
                cycle_end,
            )
            benefits.append(
                {
                    "servico_id": item.get("servico_id"),
                    "servico_nome": item.get("servico_nome"),
                    "quantidade_incluida": included,
                    "quantidade_consumida": consumed,
                    "quantidade_restante": max(included - consumed, 0),
                }
            )

        return {
            "subscription": subscription,
            "plano": {**plano, "servicos": plan_services},
            "beneficios": benefits,
        }

    @staticmethod
    def ativar_assinatura(
        barbearia_id: str,
        cliente_id: str,
        plano_id: str,
        start_date: date | None = None,
    ):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        plano = ClientesAssinaturasRepository._get_plano(barbearia_id, plano_id)
        if not plano or not bool(plano.get("ativo")):
            return None, "Plano não encontrado ou inativo"

        cycle_start = start_date or date.today()
        cycle_start, cycle_end, next_due_at = ClientesAssinaturasRepository._cycle_from_start(cycle_start)

        if is_db_ready():
            execute(
                """
                UPDATE client_subscriptions
                SET status = 'CANCELLED',
                    cancelled_at = NOW(),
                    cancel_reason = 'Substituída por nova assinatura',
                    updated_at = NOW()
                WHERE barbearia_id = %s
                  AND cliente_id = %s
                  AND status <> 'CANCELLED'
                """,
                (barbearia_id, cliente_id),
            )
            subscription = query_one(
                """
                INSERT INTO client_subscriptions (
                    barbearia_id, cliente_id, plano_id, status,
                    started_at, current_cycle_start, current_cycle_end,
                    next_due_at, grace_until
                ) VALUES (%s, %s, %s, 'ACTIVE', NOW(), %s, %s, %s, NULL)
                RETURNING id, barbearia_id, cliente_id, plano_id, status,
                          started_at, current_cycle_start, current_cycle_end,
                          next_due_at, grace_until, cancelled_at, cancel_reason,
                          last_payment_at, last_payment_amount_centavos,
                          created_at, updated_at
                """,
                (
                    barbearia_id,
                    cliente_id,
                    plano_id,
                    cycle_start,
                    cycle_end,
                    next_due_at,
                ),
            )
            return subscription, None

        if is_supabase_ready():
            supabase = get_supabase_client()
            supabase.table("client_subscriptions").update(
                {
                    "status": "CANCELLED",
                    "cancelled_at": datetime.now(timezone.utc).isoformat(),
                    "cancel_reason": "Substituída por nova assinatura",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("barbearia_id", barbearia_id).eq("cliente_id", cliente_id).neq("status", "CANCELLED").execute()

            response = (
                supabase.table("client_subscriptions")
                .insert(
                    {
                        "barbearia_id": barbearia_id,
                        "cliente_id": cliente_id,
                        "plano_id": plano_id,
                        "status": "ACTIVE",
                        "started_at": datetime.now(timezone.utc).isoformat(),
                        "current_cycle_start": cycle_start.isoformat(),
                        "current_cycle_end": cycle_end.isoformat(),
                        "next_due_at": next_due_at.isoformat(),
                        "grace_until": None,
                    }
                )
                .execute()
            )
            data = response.data or []
            if not data:
                return None, "Falha ao ativar assinatura"
            return data[0], None

        return None, "Storage indisponível"

    @staticmethod
    def cancelar_assinatura(barbearia_id: str, cliente_id: str, motivo: str | None):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        current = ClientesAssinaturasRepository._get_subscription_by_cliente(barbearia_id, cliente_id)
        if not current:
            return None

        if is_db_ready():
            return query_one(
                """
                UPDATE client_subscriptions
                SET status = 'CANCELLED',
                    cancelled_at = NOW(),
                    cancel_reason = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, barbearia_id, cliente_id, plano_id, status,
                          started_at, current_cycle_start, current_cycle_end,
                          next_due_at, grace_until, cancelled_at, cancel_reason,
                          last_payment_at, last_payment_amount_centavos,
                          created_at, updated_at
                """,
                (motivo, str(current.get("id"))),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscriptions")
                .update(
                    {
                        "status": "CANCELLED",
                        "cancelled_at": datetime.now(timezone.utc).isoformat(),
                        "cancel_reason": motivo,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .eq("id", str(current.get("id")))
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def atualizar_status_assinatura(
        barbearia_id: str,
        cliente_id: str,
        status: str,
        motivo: str | None = None,
    ):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        normalized_status = str(status or "").strip().upper()
        if normalized_status not in {"ACTIVE", "PAUSED"}:
            return None, "status inválido"

        current = ClientesAssinaturasRepository._get_subscription_by_cliente(barbearia_id, cliente_id)
        if not current:
            return None, "Cliente sem assinatura ativa"

        subscription_id = str(current.get("id"))

        if is_db_ready():
            updated = query_one(
                """
                UPDATE client_subscriptions
                SET status = %s,
                    grace_until = CASE WHEN %s = 'ACTIVE' THEN NULL ELSE grace_until END,
                    cancelled_at = NULL,
                    cancel_reason = CASE WHEN %s = 'PAUSED' THEN %s ELSE NULL END,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, barbearia_id, cliente_id, plano_id, status,
                          started_at, current_cycle_start, current_cycle_end,
                          next_due_at, grace_until, cancelled_at, cancel_reason,
                          last_payment_at, last_payment_amount_centavos,
                          created_at, updated_at
                """,
                (normalized_status, normalized_status, normalized_status, motivo, subscription_id),
            )
            if not updated:
                return None, "Assinatura não encontrada"
            return updated, None

        if is_supabase_ready():
            supabase = get_supabase_client()
            payload = {
                "status": normalized_status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "cancelled_at": None,
                "cancel_reason": motivo if normalized_status == "PAUSED" else None,
            }
            if normalized_status == "ACTIVE":
                payload["grace_until"] = None

            response = (
                supabase.table("client_subscriptions")
                .update(payload)
                .eq("id", subscription_id)
                .execute()
            )
            data = response.data or []
            if not data:
                return None, "Assinatura não encontrada"
            return data[0], None

        return None, "Storage indisponível"

    @staticmethod
    def registrar_pagamento_manual(
        barbearia_id: str,
        cliente_id: str,
        amount_centavos: int,
        metodo: str,
        observacao: str | None,
        created_by: str | None,
        created_role: str | None,
    ):
        assinatura = ClientesAssinaturasRepository.get_assinatura_cliente(barbearia_id, cliente_id)
        if not assinatura:
            return None, "Cliente sem assinatura ativa"

        subscription = assinatura["subscription"]
        plan = assinatura["plano"]
        subscription_id = str(subscription.get("id"))
        cycle_start = ClientesAssinaturasRepository._to_date(subscription.get("current_cycle_start"))
        cycle_end = ClientesAssinaturasRepository._to_date(subscription.get("current_cycle_end"))
        valor = amount_centavos if amount_centavos > 0 else int(plan.get("valor_mensal_centavos") or 0)
        if valor <= 0:
            return None, "Valor do pagamento inválido"

        if is_db_ready():
            payment = query_one(
                """
                INSERT INTO client_subscription_payments (
                    subscription_id, barbearia_id, cycle_start, cycle_end,
                    amount_centavos, paid_at, metodo, observacao, created_by, created_role
                ) VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s)
                RETURNING id, subscription_id, barbearia_id, cycle_start, cycle_end,
                          amount_centavos, paid_at, metodo, observacao, created_by, created_role, created_at
                """,
                (
                    subscription_id,
                    barbearia_id,
                    cycle_start,
                    cycle_end,
                    valor,
                    metodo,
                    observacao,
                    created_by,
                    created_role,
                ),
            )
            query_one(
                """
                UPDATE client_subscriptions
                SET status = 'ACTIVE',
                    grace_until = NULL,
                    last_payment_at = NOW(),
                    last_payment_amount_centavos = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id
                """,
                (valor, subscription_id),
            )
            return payment, None

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_payments")
                .insert(
                    {
                        "subscription_id": subscription_id,
                        "barbearia_id": barbearia_id,
                        "cycle_start": cycle_start.isoformat(),
                        "cycle_end": cycle_end.isoformat(),
                        "amount_centavos": valor,
                        "paid_at": datetime.now(timezone.utc).isoformat(),
                        "metodo": metodo,
                        "observacao": observacao,
                        "created_by": created_by,
                        "created_role": created_role,
                    }
                )
                .execute()
            )
            data = response.data or []
            if not data:
                return None, "Falha ao registrar pagamento"
            supabase.table("client_subscriptions").update(
                {
                    "status": "ACTIVE",
                    "grace_until": None,
                    "last_payment_at": datetime.now(timezone.utc).isoformat(),
                    "last_payment_amount_centavos": valor,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", subscription_id).execute()
            return data[0], None

        return None, "Storage indisponível"

    @staticmethod
    def apply_usage_for_appointment(barbearia_id: str, agendamento: dict[str, Any]):
        cliente_id = str(agendamento.get("cliente_id") or "")
        servico_id = str(agendamento.get("servico_id") or "")
        agendamento_id = str(agendamento.get("id") or "")
        if not cliente_id or not servico_id or not agendamento_id:
            return {"aplicado": False, "motivo": "dados insuficientes"}

        assinatura = ClientesAssinaturasRepository.get_assinatura_cliente(barbearia_id, cliente_id)
        if not assinatura:
            return {"aplicado": False, "motivo": "cliente sem assinatura"}

        subscription = assinatura["subscription"]
        status = str(subscription.get("status") or "")
        if status not in {"ACTIVE", "GRACE"}:
            return {"aplicado": False, "motivo": f"assinatura {status.lower()}"}

        benefit = None
        for item in assinatura["beneficios"]:
            if str(item.get("servico_id")) == servico_id:
                benefit = item
                break

        if not benefit:
            return {"aplicado": False, "motivo": "serviço fora da franquia"}

        restante = int(benefit.get("quantidade_restante") or 0)
        if restante <= 0:
            return {"aplicado": False, "motivo": "franquia esgotada"}

        if is_db_ready():
            existing = query_one(
                """
                SELECT id
                FROM client_subscription_usages
                WHERE agendamento_id = %s
                LIMIT 1
                """,
                (agendamento_id,),
            )
            if existing:
                return {"aplicado": False, "motivo": "consumo já registrado"}

            usage = query_one(
                """
                INSERT INTO client_subscription_usages (
                    subscription_id, barbearia_id, cliente_id, agendamento_id, servico_id, quantidade, used_at
                ) VALUES (%s, %s, %s, %s, %s, 1, NOW())
                RETURNING id, subscription_id, agendamento_id, servico_id, quantidade, used_at
                """,
                (
                    str(subscription.get("id")),
                    barbearia_id,
                    cliente_id,
                    agendamento_id,
                    servico_id,
                ),
            )
            return {
                "aplicado": True,
                "motivo": "consumo registrado",
                "usage": usage,
                "restante_apos": max(restante - 1, 0),
            }

        if is_supabase_ready():
            supabase = get_supabase_client()
            check = (
                supabase.table("client_subscription_usages")
                .select("id")
                .eq("agendamento_id", agendamento_id)
                .limit(1)
                .execute()
            )
            if check.data:
                return {"aplicado": False, "motivo": "consumo já registrado"}

            response = (
                supabase.table("client_subscription_usages")
                .insert(
                    {
                        "subscription_id": str(subscription.get("id")),
                        "barbearia_id": barbearia_id,
                        "cliente_id": cliente_id,
                        "agendamento_id": agendamento_id,
                        "servico_id": servico_id,
                        "quantidade": 1,
                        "used_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .execute()
            )
            data = response.data or []
            usage = data[0] if data else None
            return {
                "aplicado": bool(usage),
                "motivo": "consumo registrado" if usage else "falha ao registrar consumo",
                "usage": usage,
                "restante_apos": max(restante - 1, 0),
            }

        return {"aplicado": False, "motivo": "storage indisponível"}

    @staticmethod
    def reverse_usage_for_appointment(barbearia_id: str, agendamento_id: str, reason: str):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)
        if is_db_ready():
            usage = query_one(
                """
                SELECT id
                FROM client_subscription_usages
                WHERE barbearia_id = %s AND agendamento_id = %s AND reversed_at IS NULL
                LIMIT 1
                """,
                (barbearia_id, agendamento_id),
            )
            if not usage:
                return None
            return query_one(
                """
                UPDATE client_subscription_usages
                SET reversed_at = NOW(), reversal_reason = %s
                WHERE id = %s
                RETURNING id, reversed_at, reversal_reason
                """,
                (reason, str(usage.get("id"))),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            current = (
                supabase.table("client_subscription_usages")
                .select("id")
                .eq("barbearia_id", barbearia_id)
                .eq("agendamento_id", agendamento_id)
                .is_("reversed_at", "null")
                .limit(1)
                .execute()
            )
            rows = current.data or []
            if not rows:
                return None
            response = (
                supabase.table("client_subscription_usages")
                .update(
                    {
                        "reversed_at": datetime.now(timezone.utc).isoformat(),
                        "reversal_reason": reason,
                    }
                )
                .eq("id", str(rows[0].get("id")))
                .execute()
            )
            data = response.data or []
            return data[0] if data else None

        return None

    @staticmethod
    def list_pagamentos_assinatura(barbearia_id: str, cliente_id: str):
        assinatura = ClientesAssinaturasRepository.get_assinatura_cliente(barbearia_id, cliente_id)
        if not assinatura:
            return []
        subscription_id = str(assinatura["subscription"].get("id"))

        if is_db_ready():
            return query_all(
                """
                SELECT id, subscription_id, cycle_start, cycle_end,
                       amount_centavos, paid_at, metodo, observacao,
                       created_by, created_role, created_at
                FROM client_subscription_payments
                WHERE subscription_id = %s
                ORDER BY paid_at DESC
                LIMIT 24
                """,
                (subscription_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("client_subscription_payments")
                .select("id,subscription_id,cycle_start,cycle_end,amount_centavos,paid_at,metodo,observacao,created_by,created_role,created_at")
                .eq("subscription_id", subscription_id)
                .order("paid_at", desc=True)
                .limit(24)
                .execute()
            )
            return response.data or []

        return []

    @staticmethod
    def list_clientes_com_assinatura(barbearia_id: str):
        ClientesAssinaturasRepository.require_tenant(barbearia_id)

        if is_db_ready():
            return query_all(
                """
                SELECT c.id AS cliente_id,
                       c.nome AS cliente_nome,
                       c.telefone AS cliente_telefone,
                       s.id AS assinatura_id,
                       s.status,
                       s.current_cycle_start,
                       s.current_cycle_end,
                       s.next_due_at,
                       p.id AS plano_id,
                                             p.nome AS plano_nome,
                                             (
                                                 SELECT COALESCE(SUM(psi.quantidade_mensal), 0)
                                                 FROM client_subscription_plan_services psi
                                                 WHERE psi.plano_id = s.plano_id
                                             )::int AS franquia_incluida_total,
                                             (
                                                 SELECT COALESCE(SUM(u.quantidade), 0)
                                                 FROM client_subscription_usages u
                                                 WHERE u.subscription_id = s.id
                                                     AND u.reversed_at IS NULL
                                                     AND u.used_at::date BETWEEN s.current_cycle_start AND s.current_cycle_end
                                             )::int AS franquia_consumida_total,
                                             (
                                                 CASE
                                                     WHEN (
                                                         SELECT COALESCE(SUM(psi2.quantidade_mensal), 0)
                                                         FROM client_subscription_plan_services psi2
                                                         WHERE psi2.plano_id = s.plano_id
                                                     ) > 0
                                                     THEN ROUND(
                                                         (
                                                             (
                                                                 SELECT COALESCE(SUM(u2.quantidade), 0)
                                                                 FROM client_subscription_usages u2
                                                                 WHERE u2.subscription_id = s.id
                                                                     AND u2.reversed_at IS NULL
                                                                     AND u2.used_at::date BETWEEN s.current_cycle_start AND s.current_cycle_end
                                                             )::numeric
                                                             /
                                                             (
                                                                 SELECT COALESCE(SUM(psi3.quantidade_mensal), 0)
                                                                 FROM client_subscription_plan_services psi3
                                                                 WHERE psi3.plano_id = s.plano_id
                                                             )::numeric
                                                         ) * 100
                                                     )::int
                                                     ELSE 0
                                                 END
                                             ) AS franquia_utilizacao_percent
                FROM client_subscriptions s
                JOIN clientes c
                  ON c.id = s.cliente_id
                 AND c.barbearia_id = s.barbearia_id
                JOIN client_subscription_plans p
                  ON p.id = s.plano_id
                 AND p.barbearia_id = s.barbearia_id
                WHERE s.barbearia_id = %s
                  AND s.status <> 'CANCELLED'
                ORDER BY c.nome ASC
                """,
                (barbearia_id,),
            )

        if is_supabase_ready():
            supabase = get_supabase_client()

            subscriptions_response = (
                supabase.table("client_subscriptions")
                .select("id,cliente_id,plano_id,status,current_cycle_start,current_cycle_end,next_due_at")
                .eq("barbearia_id", barbearia_id)
                .neq("status", "CANCELLED")
                .order("created_at", desc=True)
                .execute()
            )
            subscriptions = subscriptions_response.data or []
            if not subscriptions:
                return []

            cliente_ids = sorted({str(item.get("cliente_id")) for item in subscriptions if item.get("cliente_id")})
            plano_ids = sorted({str(item.get("plano_id")) for item in subscriptions if item.get("plano_id")})

            clientes_map: dict[str, dict[str, Any]] = {}
            planos_map: dict[str, dict[str, Any]] = {}
            included_by_plan: dict[str, int] = {}
            consumed_by_subscription: dict[str, int] = {}

            if cliente_ids:
                clientes_response = (
                    supabase.table("clientes")
                    .select("id,nome,telefone")
                    .eq("barbearia_id", barbearia_id)
                    .in_("id", cliente_ids)
                    .execute()
                )
                for row in clientes_response.data or []:
                    clientes_map[str(row.get("id"))] = row

            if plano_ids:
                planos_response = (
                    supabase.table("client_subscription_plans")
                    .select("id,nome")
                    .eq("barbearia_id", barbearia_id)
                    .in_("id", plano_ids)
                    .execute()
                )
                for row in planos_response.data or []:
                    planos_map[str(row.get("id"))] = row

                plan_services_response = (
                    supabase.table("client_subscription_plan_services")
                    .select("plano_id,quantidade_mensal")
                    .in_("plano_id", plano_ids)
                    .execute()
                )
                for row in plan_services_response.data or []:
                    plano_id = str(row.get("plano_id") or "")
                    if not plano_id:
                        continue
                    included_by_plan[plano_id] = included_by_plan.get(plano_id, 0) + int(row.get("quantidade_mensal") or 0)

            subscription_ids = sorted({str(item.get("id")) for item in subscriptions if item.get("id")})
            if subscription_ids:
                usages_response = (
                    supabase.table("client_subscription_usages")
                    .select("subscription_id,quantidade,used_at")
                    .eq("barbearia_id", barbearia_id)
                    .is_("reversed_at", "null")
                    .in_("subscription_id", subscription_ids)
                    .execute()
                )

                cycle_by_subscription: dict[str, tuple[date, date]] = {}
                for item in subscriptions:
                    sid = str(item.get("id") or "")
                    if not sid:
                        continue
                    try:
                        cycle_start = ClientesAssinaturasRepository._to_date(item.get("current_cycle_start"))
                        cycle_end = ClientesAssinaturasRepository._to_date(item.get("current_cycle_end"))
                        cycle_by_subscription[sid] = (cycle_start, cycle_end)
                    except Exception:
                        continue

                for row in usages_response.data or []:
                    sid = str(row.get("subscription_id") or "")
                    if not sid or sid not in cycle_by_subscription:
                        continue
                    used_at_raw = row.get("used_at")
                    try:
                        used_at_date = ClientesAssinaturasRepository._to_datetime(used_at_raw)
                        if not used_at_date:
                            continue
                        used_date = used_at_date.date()
                    except Exception:
                        continue

                    cycle_start, cycle_end = cycle_by_subscription[sid]
                    if cycle_start <= used_date <= cycle_end:
                        consumed_by_subscription[sid] = consumed_by_subscription.get(sid, 0) + int(row.get("quantidade") or 0)

            result = []
            for item in subscriptions:
                cliente_id = str(item.get("cliente_id") or "")
                plano_id = str(item.get("plano_id") or "")
                assinatura_id = str(item.get("id") or "")
                cliente = clientes_map.get(cliente_id, {})
                plano = planos_map.get(plano_id, {})
                included_total = int(included_by_plan.get(plano_id, 0))
                consumed_total = int(consumed_by_subscription.get(assinatura_id, 0))
                utilization_percent = int(round((consumed_total / included_total) * 100)) if included_total > 0 else 0
                result.append(
                    {
                        "cliente_id": cliente_id,
                        "cliente_nome": cliente.get("nome"),
                        "cliente_telefone": cliente.get("telefone"),
                        "assinatura_id": assinatura_id,
                        "status": item.get("status"),
                        "current_cycle_start": item.get("current_cycle_start"),
                        "current_cycle_end": item.get("current_cycle_end"),
                        "next_due_at": item.get("next_due_at"),
                        "plano_id": plano_id,
                        "plano_nome": plano.get("nome"),
                        "franquia_incluida_total": included_total,
                        "franquia_consumida_total": consumed_total,
                        "franquia_utilizacao_percent": utilization_percent,
                    }
                )

            result.sort(key=lambda row: str(row.get("cliente_nome") or "").lower())
            return result

        return []
