from __future__ import annotations

from datetime import datetime, timedelta, timezone
import time
from typing import Any

from flask import current_app

from backend.db import get_conn, is_db_ready, query_all, query_one
from backend.repositories.agendamentos_repository import AgendamentosRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class MasterRepository:
    _CHECKIN_ALLOWED_CURRENT_STATUS = {"CONFIRMED", "REOPENED", "IN_PROGRESS"}
    _TENANT_STATUS_VALUES = {"ACTIVE", "TRIAL", "PAST_DUE", "CANCELLED", "SUSPENDED"}

    @staticmethod
    def _normalize_slug(value: str | None) -> str:
        slug = str(value or "").strip().lower()
        if not slug:
            return ""
        allowed = set("abcdefghijklmnopqrstuvwxyz0123456789-")
        if any(char not in allowed for char in slug):
            return ""
        return slug

    @staticmethod
    def _as_datetime(value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)

        text = str(value).strip()
        if not text:
            return None

        try:
            normalized = text.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    @staticmethod
    def _supabase_execute_with_retries(fetch_fn, fallback):
        retries = int(current_app.config.get("SUPABASE_TENANT_RETRIES", 3) or 3)
        retries = max(1, retries)
        last_exc = None

        for attempt in range(retries):
            try:
                return fetch_fn()
            except Exception as exc:
                last_exc = exc
                if attempt < retries - 1:
                    time.sleep(0.4 * (attempt + 1))

        if current_app.config.get("DEBUG") and last_exc is not None:
            current_app.logger.warning("MasterRepository Supabase fallback após falhas: %s", last_exc)

        return fallback

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
                                    b.telefone,
                                    b.cidade,
                                    b.plano,
                                    b.assinatura_status,
                                    b.ciclo_cobranca,
                                    b.valor_plano_centavos,
                                    b.assinatura_inicio_em,
                                    b.proxima_cobranca_em,
                                    b.stripe_last_event_type,
                                    b.stripe_webhook_updated_at,
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
                tenants_response = MasterRepository._supabase_execute_with_retries(
                    lambda: (
                        supabase.table("barbearias")
                        .select(
                            "id,nome,slug,telefone,cidade,plano,assinatura_status,ciclo_cobranca,valor_plano_centavos,"
                            "assinatura_inicio_em,proxima_cobranca_em,stripe_last_event_type,"
                            "stripe_webhook_updated_at,created_at"
                        )
                        .order("created_at", desc=True)
                        .execute()
                    ),
                    None,
                )
            except Exception:
                tenants_response = MasterRepository._supabase_execute_with_retries(
                    lambda: (
                        supabase.table("barbearias")
                        .select("id,nome,slug,telefone,cidade,created_at")
                        .order("created_at", desc=True)
                        .execute()
                    ),
                    None,
                )

            tenants = (tenants_response.data or []) if tenants_response else []
            if not tenants:
                return []

            appointments_response = MasterRepository._supabase_execute_with_retries(
                lambda: (
                    supabase.table("agendamentos")
                    .select("barbearia_id,cliente_id,status,valor_final,data")
                    .gte("data", start_date)
                    .execute()
                ),
                None,
            )
            appointments = (appointments_response.data or []) if appointments_response else []

            dispatches_response = MasterRepository._supabase_execute_with_retries(
                lambda: (
                    supabase.table("notification_dispatches")
                    .select("barbearia_id,status,created_at")
                    .gte("created_at", start_datetime)
                    .execute()
                ),
                None,
            )
            dispatches = (dispatches_response.data or []) if dispatches_response else []

            users_response = MasterRepository._supabase_execute_with_retries(
                lambda: (
                    supabase.table("usuarios")
                    .select("barbearia_id,updated_at")
                    .execute()
                ),
                None,
            )
            users = (users_response.data or []) if users_response else []

            by_tenant: dict[str, dict[str, Any]] = {}
            for tenant in tenants:
                tenant_id = str(tenant.get("id") or "")
                if not tenant_id:
                    continue
                by_tenant[tenant_id] = {
                    "id": tenant_id,
                    "nome": tenant.get("nome") or "Barbearia",
                    "slug": tenant.get("slug") or "",
                    "telefone": tenant.get("telefone"),
                    "cidade": tenant.get("cidade"),
                    "plano": tenant.get("plano"),
                    "assinatura_status": tenant.get("assinatura_status"),
                    "ciclo_cobranca": tenant.get("ciclo_cobranca"),
                    "valor_plano_centavos": tenant.get("valor_plano_centavos"),
                    "assinatura_inicio_em": tenant.get("assinatura_inicio_em"),
                    "proxima_cobranca_em": tenant.get("proxima_cobranca_em"),
                    "stripe_last_event_type": tenant.get("stripe_last_event_type"),
                    "stripe_webhook_updated_at": tenant.get("stripe_webhook_updated_at"),
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
        now = datetime.now(timezone.utc)
        seven_days_ahead = now + timedelta(days=7)
        seven_days_ago = now - timedelta(days=7)
        day_ago = now - timedelta(hours=24)

        ativos = [item for item in tenants if str(item.get("assinatura_status") or "").upper() == "ACTIVE"]
        trial = [item for item in tenants if str(item.get("assinatura_status") or "").upper() == "TRIAL"]
        inadimplentes = [item for item in tenants if str(item.get("assinatura_status") or "").upper() == "PAST_DUE"]
        canceladas = [item for item in tenants if str(item.get("assinatura_status") or "").upper() == "CANCELLED"]

        vencendo_7d = [
            item
            for item in tenants
            if str(item.get("assinatura_status") or "").upper() in {"ACTIVE", "TRIAL"}
            and (lambda due: due is not None and now <= due <= seven_days_ahead)(
                MasterRepository._as_datetime(item.get("proxima_cobranca_em"))
            )
        ]

        pagamentos_ok_7d = [
            item
            for item in tenants
            if str(item.get("stripe_last_event_type") or "").lower() == "invoice.paid"
            and (lambda updated: updated is not None and updated >= seven_days_ago)(
                MasterRepository._as_datetime(item.get("stripe_webhook_updated_at"))
            )
        ]

        falhas_7d = [
            item
            for item in tenants
            if str(item.get("stripe_last_event_type") or "").lower() == "invoice.payment_failed"
            and (lambda updated: updated is not None and updated >= seven_days_ago)(
                MasterRepository._as_datetime(item.get("stripe_webhook_updated_at"))
            )
        ]

        sem_webhook_recente_24h = [
            item
            for item in tenants
            if (lambda updated: updated is None or updated < day_ago)(
                MasterRepository._as_datetime(item.get("stripe_webhook_updated_at"))
            )
        ]

        mrr_estimado = round(
            sum(
                float(item.get("valor_plano_centavos") or 0)
                for item in tenants
                if str(item.get("assinatura_status") or "").upper() in {"ACTIVE", "TRIAL"}
            ) / 100,
            2,
        )

        return {
            "total_tenants": len(tenants),
            "tenants_ativos": len(ativos),
            "tenants_trial": len(trial),
            "tenants_inadimplentes": len(inadimplentes),
            "tenants_canceladas": len(canceladas),
            "vencendo_7d": len(vencendo_7d),
            "mrr_estimado": mrr_estimado,
            "pagamentos_ok_7d": len(pagamentos_ok_7d),
            "falhas_7d": len(falhas_7d),
            "sem_webhook_recente_24h": len(sem_webhook_recente_24h),
            "clientes_30d": sum(int(item.get("clientes_30d") or 0) for item in tenants),
            "agendamentos_30d": sum(int(item.get("agendamentos_30d") or 0) for item in tenants),
            "mensagens_30d": sum(int(item.get("mensagens_30d") or 0) for item in tenants),
            "receita_30d": round(sum(float(item.get("receita_30d") or 0) for item in tenants), 2),
        }

    @staticmethod
    def provision_tenant_with_admin(
        *,
        tenant_nome: str,
        tenant_slug: str,
        tenant_telefone: str | None,
        tenant_cidade: str | None,
        admin_nome: str,
        admin_telefone: str,
        admin_email: str | None,
        admin_senha_hash: str,
    ):
        slug = MasterRepository._normalize_slug(tenant_slug)
        if not slug:
            return {"error": "slug inválido. Use apenas letras minúsculas, números e hífen."}

        if is_db_ready():
            try:
                with get_conn() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT id FROM barbearias WHERE slug = %s", (slug,))
                        if cur.fetchone():
                            conn.rollback()
                            return {"error": "Slug já cadastrado"}

                        cur.execute(
                            """
                            INSERT INTO barbearias (nome, slug, telefone, cidade)
                            VALUES (%s, %s, %s, %s)
                            RETURNING id, nome, slug, telefone, cidade, created_at
                            """,
                            (tenant_nome, slug, tenant_telefone, tenant_cidade),
                        )
                        tenant = cur.fetchone()
                        if not tenant:
                            conn.rollback()
                            return {"error": "Falha ao criar barbearia"}

                        cur.execute(
                            """
                            INSERT INTO usuarios (barbearia_id, nome, telefone, email, senha_hash, role, ativo)
                            VALUES (%s, %s, %s, %s, %s, 'ADMIN', true)
                            RETURNING id, barbearia_id, nome, telefone, email, role, ativo, created_at
                            """,
                            (
                                str(tenant.get("id")),
                                admin_nome,
                                admin_telefone,
                                admin_email,
                                admin_senha_hash,
                            ),
                        )
                        admin = cur.fetchone()
                        if not admin:
                            conn.rollback()
                            return {"error": "Falha ao criar usuário admin"}

                        conn.commit()
                        return {
                            "tenant": tenant,
                            "admin": admin,
                        }
            except Exception as exc:
                message = str(exc).lower()
                if "uq_barbearias_slug" in message or "slug" in message and "unique" in message:
                    return {"error": "Slug já cadastrado"}
                if "uq_usuarios_barbearia_telefone" in message:
                    return {"error": "Telefone do admin já cadastrado nesta barbearia"}
                return {"error": f"Falha ao provisionar tenant: {exc}"}

        if is_supabase_ready():
            supabase = get_supabase_client()

            existing = (
                supabase.table("barbearias")
                .select("id")
                .eq("slug", slug)
                .limit(1)
                .execute()
            )
            if existing.data:
                return {"error": "Slug já cadastrado"}

            tenant_response = (
                supabase.table("barbearias")
                .insert(
                    {
                        "nome": tenant_nome,
                        "slug": slug,
                        "telefone": tenant_telefone,
                        "cidade": tenant_cidade,
                    }
                )
                .execute()
            )
            tenant_rows = tenant_response.data or []
            tenant = tenant_rows[0] if tenant_rows else None
            if not tenant:
                return {"error": "Falha ao criar barbearia"}

            try:
                admin_response = (
                    supabase.table("usuarios")
                    .insert(
                        {
                            "barbearia_id": tenant.get("id"),
                            "nome": admin_nome,
                            "telefone": admin_telefone,
                            "email": admin_email,
                            "senha_hash": admin_senha_hash,
                            "role": "ADMIN",
                            "ativo": True,
                        }
                    )
                    .execute()
                )
            except Exception as exc:
                try:
                    supabase.table("barbearias").delete().eq("id", tenant.get("id")).execute()
                except Exception:
                    pass
                return {"error": f"Falha ao criar usuário admin: {exc}"}

            admin_rows = admin_response.data or []
            admin = admin_rows[0] if admin_rows else None
            if not admin:
                try:
                    supabase.table("barbearias").delete().eq("id", tenant.get("id")).execute()
                except Exception:
                    pass
                return {"error": "Falha ao criar usuário admin"}

            return {
                "tenant": tenant,
                "admin": admin,
            }

        return {"error": "Banco não configurado"}

    @staticmethod
    def search_checkin_candidates(*, tenant_slug: str, date: str, phone: str):
        slug = MasterRepository._normalize_slug(tenant_slug)
        if not slug:
            return {"error": "tenant_slug inválido", "rows": []}

        barbearia_id = None
        if is_db_ready():
            row = query_one("SELECT id FROM barbearias WHERE slug = %s", (slug,))
            if row:
                barbearia_id = row.get("id")
        if not barbearia_id:
            barbearia_id = None
            if is_supabase_ready():
                supabase = get_supabase_client()
                found = (
                    supabase.table("barbearias")
                    .select("id")
                    .eq("slug", slug)
                    .limit(1)
                    .execute()
                )
                rows = found.data or []
                barbearia_id = rows[0].get("id") if rows else None

        if not barbearia_id:
            return {"error": "Barbearia não encontrada", "rows": []}

        if is_db_ready():
            rows = query_all(
                """
                SELECT
                  a.id,
                  a.data,
                  a.hora_inicio,
                  a.hora_fim,
                  a.status,
                  c.nome AS cliente_nome,
                  c.telefone AS cliente_telefone,
                  p.nome AS profissional_nome,
                  s.nome AS servico_nome
                FROM agendamentos a
                INNER JOIN clientes c ON c.id = a.cliente_id AND c.barbearia_id = a.barbearia_id
                LEFT JOIN profissionais p ON p.id = a.profissional_id AND p.barbearia_id = a.barbearia_id
                LEFT JOIN servicos s ON s.id = a.servico_id AND s.barbearia_id = a.barbearia_id
                WHERE a.barbearia_id = %s
                  AND a.data = %s
                  AND c.telefone = %s
                ORDER BY a.hora_inicio ASC
                """,
                (str(barbearia_id), date, phone),
            )
            return {"error": None, "rows": rows, "barbearia_id": str(barbearia_id)}

        if is_supabase_ready():
            supabase = get_supabase_client()
            clientes = (
                supabase.table("clientes")
                .select("id,nome,telefone")
                .eq("barbearia_id", str(barbearia_id))
                .eq("telefone", phone)
                .execute()
            ).data or []
            if not clientes:
                return {"error": None, "rows": [], "barbearia_id": str(barbearia_id)}

            cliente_map = {str(item.get("id")): item for item in clientes}
            agendamentos = (
                supabase.table("agendamentos")
                .select("id,data,hora_inicio,hora_fim,status,cliente_id,profissional_id,servico_id")
                .eq("barbearia_id", str(barbearia_id))
                .eq("data", date)
                .in_("cliente_id", list(cliente_map.keys()))
                .order("hora_inicio")
                .execute()
            ).data or []

            prof_ids = list({str(item.get("profissional_id")) for item in agendamentos if item.get("profissional_id")})
            serv_ids = list({str(item.get("servico_id")) for item in agendamentos if item.get("servico_id")})

            prof_map = {}
            if prof_ids:
                profs = (
                    supabase.table("profissionais")
                    .select("id,nome")
                    .in_("id", prof_ids)
                    .execute()
                ).data or []
                prof_map = {str(item.get("id")): item.get("nome") for item in profs}

            serv_map = {}
            if serv_ids:
                servs = (
                    supabase.table("servicos")
                    .select("id,nome")
                    .in_("id", serv_ids)
                    .execute()
                ).data or []
                serv_map = {str(item.get("id")): item.get("nome") for item in servs}

            rows = []
            for item in agendamentos:
                cliente = cliente_map.get(str(item.get("cliente_id"))) or {}
                rows.append(
                    {
                        "id": item.get("id"),
                        "data": item.get("data"),
                        "hora_inicio": item.get("hora_inicio"),
                        "hora_fim": item.get("hora_fim"),
                        "status": item.get("status"),
                        "cliente_nome": cliente.get("nome"),
                        "cliente_telefone": cliente.get("telefone"),
                        "profissional_nome": prof_map.get(str(item.get("profissional_id"))),
                        "servico_nome": serv_map.get(str(item.get("servico_id"))),
                    }
                )

            return {"error": None, "rows": rows, "barbearia_id": str(barbearia_id)}

        return {"error": "Banco não configurado", "rows": []}

    @staticmethod
    def perform_checkin(*, tenant_slug: str, agendamento_id: str):
        slug = MasterRepository._normalize_slug(tenant_slug)
        if not slug:
            return {"error": "tenant_slug inválido"}

        barbearia_id = None
        if is_db_ready():
            item = query_one("SELECT id FROM barbearias WHERE slug = %s", (slug,))
            if item:
                barbearia_id = str(item.get("id"))
        elif is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("barbearias")
                .select("id")
                .eq("slug", slug)
                .limit(1)
                .execute()
            )
            data = response.data or []
            if data:
                barbearia_id = str(data[0].get("id"))

        if not barbearia_id:
            return {"error": "Barbearia não encontrada"}

        existing = AgendamentosRepository.get_agendamento_by_id(barbearia_id, agendamento_id)
        if not existing:
            return {"error": "Agendamento não encontrado"}

        current_status = str(existing.get("status") or "").upper()
        if current_status not in MasterRepository._CHECKIN_ALLOWED_CURRENT_STATUS:
            return {"error": f"Status atual não permite check-in: {current_status}"}

        if current_status == "IN_PROGRESS":
            return {"error": None, "agendamento": existing, "already_checked_in": True}

        updated = AgendamentosRepository.transition_status(
            barbearia_id,
            agendamento_id,
            "IN_PROGRESS",
            "Check-in via área Master",
            None,
            None,
        )
        if not updated:
            return {"error": "Falha ao atualizar check-in"}

        AgendamentosRepository.add_status_audit(
            barbearia_id,
            agendamento_id,
            current_status,
            "IN_PROGRESS",
            "master",
            "MASTER",
            "Check-in via área Master",
            None,
            None,
        )

        return {"error": None, "agendamento": updated, "already_checked_in": False}

    @staticmethod
    def _normalize_optional_text(value: str | None):
        if value is None:
            return None
        text = str(value).strip()
        return text or None

    @staticmethod
    def update_tenant(*, tenant_id: str, nome: str, slug: str, telefone: str | None, cidade: str | None):
        tenant_uuid = str(tenant_id or "").strip()
        if not tenant_uuid:
            return {"error": "tenant_id inválido"}

        normalized_slug = MasterRepository._normalize_slug(slug)
        if not normalized_slug:
            return {"error": "slug inválido. Use apenas letras minúsculas, números e hífen."}

        tenant_nome = str(nome or "").strip()
        if not tenant_nome:
            return {"error": "nome é obrigatório"}

        tenant_telefone = MasterRepository._normalize_optional_text(telefone)
        tenant_cidade = MasterRepository._normalize_optional_text(cidade)

        if is_db_ready():
            try:
                existing = query_one("SELECT id FROM barbearias WHERE id = %s", (tenant_uuid,))
                if not existing:
                    return {"error": "Barbearia não encontrada"}

                slug_in_use = query_one(
                    "SELECT id FROM barbearias WHERE slug = %s AND id <> %s",
                    (normalized_slug, tenant_uuid),
                )
                if slug_in_use:
                    return {"error": "Slug já cadastrado"}

                updated = query_one(
                    """
                    UPDATE barbearias
                    SET nome = %s,
                        slug = %s,
                        telefone = %s,
                        cidade = %s
                    WHERE id = %s
                    RETURNING id, nome, slug, telefone, cidade, assinatura_status, updated_at
                    """,
                    (tenant_nome, normalized_slug, tenant_telefone, tenant_cidade, tenant_uuid),
                )
                return {"error": None, "tenant": updated}
            except Exception as exc:
                message = str(exc).lower()
                if "uq_barbearias_slug" in message or ("slug" in message and "unique" in message):
                    return {"error": "Slug já cadastrado"}
                return {"error": f"Falha ao atualizar barbearia: {exc}"}

        if is_supabase_ready():
            supabase = get_supabase_client()
            existing = (
                supabase.table("barbearias")
                .select("id")
                .eq("id", tenant_uuid)
                .limit(1)
                .execute()
            )
            if not (existing.data or []):
                return {"error": "Barbearia não encontrada"}

            slug_in_use = (
                supabase.table("barbearias")
                .select("id")
                .eq("slug", normalized_slug)
                .neq("id", tenant_uuid)
                .limit(1)
                .execute()
            )
            if slug_in_use.data:
                return {"error": "Slug já cadastrado"}

            try:
                response = (
                    supabase.table("barbearias")
                    .update(
                        {
                            "nome": tenant_nome,
                            "slug": normalized_slug,
                            "telefone": tenant_telefone,
                            "cidade": tenant_cidade,
                        }
                    )
                    .eq("id", tenant_uuid)
                    .execute()
                )
                rows = response.data or []
                tenant = rows[0] if rows else None
                return {"error": None, "tenant": tenant}
            except Exception as exc:
                message = str(exc).lower()
                if "slug" in message and ("unique" in message or "duplicate" in message):
                    return {"error": "Slug já cadastrado"}
                return {"error": f"Falha ao atualizar barbearia: {exc}"}

        return {"error": "Banco não configurado"}

    @staticmethod
    def set_tenant_blocked(*, tenant_id: str, blocked: bool):
        tenant_uuid = str(tenant_id or "").strip()
        if not tenant_uuid:
            return {"error": "tenant_id inválido"}

        next_status = "SUSPENDED" if blocked else "ACTIVE"

        if is_db_ready():
            try:
                current = query_one(
                    "SELECT id, assinatura_status FROM barbearias WHERE id = %s",
                    (tenant_uuid,),
                )
                if not current:
                    return {"error": "Barbearia não encontrada"}

                updated = query_one(
                    """
                    UPDATE barbearias
                    SET assinatura_status = %s
                    WHERE id = %s
                    RETURNING id, nome, slug, assinatura_status, updated_at
                    """,
                    (next_status, tenant_uuid),
                )
                return {"error": None, "tenant": updated}
            except Exception as exc:
                message = str(exc).lower()
                if "assinatura_status" in message and ("column" in message or "does not exist" in message):
                    return {"error": "Campo assinatura_status não encontrado. Execute a migration 021_module21_master_saas_status.sql."}
                return {"error": f"Falha ao atualizar status da barbearia: {exc}"}

        if is_supabase_ready():
            supabase = get_supabase_client()
            existing = (
                supabase.table("barbearias")
                .select("id")
                .eq("id", tenant_uuid)
                .limit(1)
                .execute()
            )
            if not (existing.data or []):
                return {"error": "Barbearia não encontrada"}

            try:
                response = (
                    supabase.table("barbearias")
                    .update({"assinatura_status": next_status})
                    .eq("id", tenant_uuid)
                    .execute()
                )
                rows = response.data or []
                tenant = rows[0] if rows else None
                return {"error": None, "tenant": tenant}
            except Exception as exc:
                message = str(exc).lower()
                if "assinatura_status" in message and ("column" in message or "schema cache" in message):
                    return {"error": "Campo assinatura_status não encontrado. Execute a migration 021_module21_master_saas_status.sql."}
                return {"error": f"Falha ao atualizar status da barbearia: {exc}"}

        return {"error": "Banco não configurado"}

    @staticmethod
    def get_tenant_admin_for_impersonation(*, tenant_id: str):
        tenant_uuid = str(tenant_id or "").strip()
        if not tenant_uuid:
            return {"error": "tenant_id inválido"}

        if is_db_ready():
            tenant = query_one(
                """
                SELECT id, nome, slug
                FROM barbearias
                WHERE id = %s
                """,
                (tenant_uuid,),
            )
            if not tenant:
                return {"error": "Barbearia não encontrada"}

            admin = query_one(
                """
                SELECT id, barbearia_id, nome, telefone, email, role, ativo
                FROM usuarios
                WHERE barbearia_id = %s
                  AND role = 'ADMIN'
                  AND ativo = true
                ORDER BY created_at ASC, id ASC
                LIMIT 1
                """,
                (tenant_uuid,),
            )
            if not admin:
                return {"error": "Nenhum ADMIN ativo encontrado para a barbearia"}

            return {"error": None, "tenant": tenant, "admin": admin}

        if is_supabase_ready():
            supabase = get_supabase_client()
            tenant_response = (
                supabase.table("barbearias")
                .select("id,nome,slug")
                .eq("id", tenant_uuid)
                .limit(1)
                .execute()
            )
            tenant_rows = tenant_response.data or []
            tenant = tenant_rows[0] if tenant_rows else None
            if not tenant:
                return {"error": "Barbearia não encontrada"}

            admin_response = (
                supabase.table("usuarios")
                .select("id,barbearia_id,nome,telefone,email,role,ativo,created_at")
                .eq("barbearia_id", tenant_uuid)
                .eq("role", "ADMIN")
                .eq("ativo", True)
                .order("created_at")
                .limit(1)
                .execute()
            )
            admin_rows = admin_response.data or []
            admin = admin_rows[0] if admin_rows else None
            if not admin:
                return {"error": "Nenhum ADMIN ativo encontrado para a barbearia"}

            return {"error": None, "tenant": tenant, "admin": admin}

        return {"error": "Banco não configurado"}

    @staticmethod
    def delete_tenant(*, tenant_id: str):
        tenant_uuid = str(tenant_id or "").strip()
        if not tenant_uuid:
            return {"error": "tenant_id inválido"}

        if is_db_ready():
            try:
                existing = query_one("SELECT id, nome, slug FROM barbearias WHERE id = %s", (tenant_uuid,))
                if not existing:
                    return {"error": "Barbearia não encontrada"}

                deleted = query_one(
                    """
                    DELETE FROM barbearias
                    WHERE id = %s
                    RETURNING id, nome, slug
                    """,
                    (tenant_uuid,),
                )
                if not deleted:
                    return {"error": "Barbearia não encontrada"}
                return {"error": None, "tenant": deleted}
            except Exception as exc:
                message = str(exc).lower()
                if "foreign key" in message or "violates" in message or "constraint" in message:
                    return {"error": "Não foi possível excluir: existem dados vinculados a esta barbearia."}
                return {"error": f"Falha ao excluir barbearia: {exc}"}

        if is_supabase_ready():
            supabase = get_supabase_client()
            existing = (
                supabase.table("barbearias")
                .select("id,nome,slug")
                .eq("id", tenant_uuid)
                .limit(1)
                .execute()
            )
            rows = existing.data or []
            if not rows:
                return {"error": "Barbearia não encontrada"}

            tenant = rows[0]
            try:
                response = (
                    supabase.table("barbearias")
                    .delete()
                    .eq("id", tenant_uuid)
                    .execute()
                )
                deleted_rows = response.data or []
                deleted = deleted_rows[0] if deleted_rows else tenant
                return {"error": None, "tenant": deleted}
            except Exception as exc:
                message = str(exc).lower()
                if "foreign key" in message or "violates" in message or "constraint" in message:
                    return {"error": "Não foi possível excluir: existem dados vinculados a esta barbearia."}
                return {"error": f"Falha ao excluir barbearia: {exc}"}

        return {"error": "Banco não configurado"}
