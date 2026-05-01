from datetime import datetime, timedelta, timezone

from backend.db import is_db_ready, query_one
from backend.repositories.base_repository import BaseRepository
from backend.supabase_client import get_supabase_client, is_supabase_ready


class BarbeariaRepository(BaseRepository):
    _SUBSCRIPTION_PRICES = {
        "MONTHLY": 3990,
        "YEARLY": 35990,
    }

    _SUBSCRIPTION_PLAN_CODE = {
        "MONTHLY": "PROFISSIONAL_MONTHLY",
        "YEARLY": "PROFISSIONAL_YEARLY",
    }

    _SUBSCRIPTION_PLAN_CODE_BY_PRICE = {
        ("MONTHLY", 2990): "ESSENCIAL_MONTHLY",
        ("YEARLY", 26990): "ESSENCIAL_YEARLY",
        ("MONTHLY", 3990): "PROFISSIONAL_MONTHLY",
        ("YEARLY", 35990): "PROFISSIONAL_YEARLY",
        ("MONTHLY", 4990): "AVANCADO_MONTHLY",
        ("YEARLY", 44990): "AVANCADO_YEARLY",
    }

    @staticmethod
    def _infer_subscription_plan_code(cycle: str, price_cents: int, current_plan: str | None = None) -> str:
        normalized_cycle = BarbeariaRepository._normalize_cycle(cycle)

        by_price = BarbeariaRepository._SUBSCRIPTION_PLAN_CODE_BY_PRICE.get((normalized_cycle, int(price_cents or 0)))
        if by_price:
            return by_price

        normalized_current = str(current_plan or "").strip().upper()
        if normalized_current.endswith(f"_{normalized_cycle}") and normalized_current.split("_")[0] in {
            "ESSENCIAL",
            "PROFISSIONAL",
            "AVANCADO",
        }:
            return normalized_current

        return BarbeariaRepository._SUBSCRIPTION_PLAN_CODE[normalized_cycle]

    @staticmethod
    def _is_missing_reports_flag_column_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "allow_employee_view_reports" in message
            and ("column" in message or "does not exist" in message or "schema cache" in message)
        )

    @staticmethod
    def _is_missing_users_flag_column_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "allow_employee_view_users" in message
            and ("column" in message or "does not exist" in message or "schema cache" in message)
        )

    @staticmethod
    def _is_missing_subscription_column_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "ciclo_cobranca" in message
            or "valor_plano_centavos" in message
            or "trial_" in message
            or "proxima_cobranca_em" in message
            or "assinatura_inicio_em" in message
            or "atualizado_assinatura_em" in message
        ) and ("column" in message or "does not exist" in message or "schema cache" in message)

    @staticmethod
    def _is_missing_payment_column_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return (
            "payment_" in message
            and ("column" in message or "does not exist" in message or "schema cache" in message)
        )

    @staticmethod
    def _normalize_cycle(value: str | None) -> str:
        raw = str(value or "").strip().upper()
        if raw == "YEARLY":
            return "YEARLY"
        return "MONTHLY"

    @staticmethod
    def _as_datetime(value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    @staticmethod
    def _to_iso(value):
        parsed = BarbeariaRepository._as_datetime(value)
        return parsed.isoformat() if parsed else None

    @staticmethod
    def _compute_effective_status(status: str, trial_end_value):
        normalized = str(status or "ACTIVE").upper()
        if normalized != "TRIAL":
            return normalized
        now = datetime.now(timezone.utc)
        trial_end = BarbeariaRepository._as_datetime(trial_end_value)
        if trial_end and now > trial_end:
            return "PAST_DUE"
        return "TRIAL"

    @staticmethod
    def _days_left_for_trial(trial_end_value):
        trial_end = BarbeariaRepository._as_datetime(trial_end_value)
        if not trial_end:
            return 0
        now = datetime.now(timezone.utc)
        delta = trial_end - now
        if delta.total_seconds() <= 0:
            return 0
        return int(delta.total_seconds() // 86400) + 1

    @staticmethod
    def _coalesce_subscription_fields(item: dict | None):
        if not item:
            return None

        base = dict(item)
        cycle = BarbeariaRepository._normalize_cycle(base.get("ciclo_cobranca"))
        price = int(base.get("valor_plano_centavos") or BarbeariaRepository._SUBSCRIPTION_PRICES[cycle])
        stored_status = str(base.get("assinatura_status") or "ACTIVE").upper()
        effective_status = BarbeariaRepository._compute_effective_status(stored_status, base.get("trial_fim_em"))

        trial_end = base.get("trial_fim_em")
        days_left = BarbeariaRepository._days_left_for_trial(trial_end) if effective_status == "TRIAL" else 0

        base["plano"] = BarbeariaRepository._infer_subscription_plan_code(cycle, price, base.get("plano"))
        base["ciclo_cobranca"] = cycle
        base["valor_plano_centavos"] = price
        base["trial_usado"] = bool(base.get("trial_usado", False))
        base["assinatura_status"] = stored_status
        base["assinatura_status_efetivo"] = effective_status
        base["dias_restantes_trial"] = days_left

        base["trial_inicio_em"] = BarbeariaRepository._to_iso(base.get("trial_inicio_em"))
        base["trial_fim_em"] = BarbeariaRepository._to_iso(base.get("trial_fim_em"))
        base["assinatura_inicio_em"] = BarbeariaRepository._to_iso(base.get("assinatura_inicio_em"))
        base["proxima_cobranca_em"] = BarbeariaRepository._to_iso(base.get("proxima_cobranca_em"))
        base["atualizado_assinatura_em"] = BarbeariaRepository._to_iso(base.get("atualizado_assinatura_em"))
        base["payment_customer_id"] = base.get("payment_customer_id")
        base["payment_subscription_id"] = base.get("payment_subscription_id")
        base["payment_plan_id"] = base.get("payment_plan_id")
        base["payment_last_event_id"] = base.get("payment_last_event_id")
        base["payment_last_event_type"] = base.get("payment_last_event_type")
        base["payment_last_event_at"] = BarbeariaRepository._to_iso(base.get("payment_last_event_at"))
        base["payment_webhook_updated_at"] = BarbeariaRepository._to_iso(base.get("payment_webhook_updated_at"))

        return base

    @staticmethod
    def get_barbearia_id_by_slug(slug: str):
        normalized = str(slug or "").strip().lower()
        if not normalized:
            return None

        if is_db_ready():
            item = query_one(
                """
                SELECT id, slug
                FROM barbearias
                WHERE slug = %s
                """,
                (normalized,),
            )
            if item:
                return str(item.get("id"))

        if is_supabase_ready():
            supabase = get_supabase_client()
            response = (
                supabase.table("barbearias")
                .select("id,slug")
                .eq("slug", normalized)
                .limit(1)
                .execute()
            )
            data = response.data or []
            if data:
                return str(data[0].get("id"))

        return None

    @staticmethod
    def _coalesce_identity_fields(item: dict | None):
        if not item:
            return None
        base = dict(item)
        base.setdefault("logo_url", None)
        base.setdefault("login_logo_url", None)
        base.setdefault("login_background_url", None)
        base.setdefault("churn_risk_days_threshold", 45)
        base.setdefault("allow_employee_confirm_appointment", False)
        base.setdefault("allow_employee_create_appointment", True)
        base.setdefault("allow_employee_view_finance", False)
        base.setdefault("allow_employee_view_reports", False)
        base.setdefault("allow_employee_view_users", False)
        base.setdefault("icone_marca", None)
        base.setdefault("cor_primaria", None)
        base.setdefault("cor_secundaria", None)
        return base

    @staticmethod
    def get_identity(barbearia_id: str):
        BarbeariaRepository.require_tenant(barbearia_id)
        if is_db_ready():
            try:
                item = query_one(
                    """
                    SELECT id, nome, slug, telefone, cidade,
                           logo_url, login_logo_url, login_background_url,
                                        churn_risk_days_threshold,
                              allow_employee_confirm_appointment,
                                        allow_employee_create_appointment,
                                        allow_employee_view_finance,
                                        allow_employee_view_reports,
                                     allow_employee_view_users,
                           icone_marca, cor_primaria, cor_secundaria
                    FROM barbearias
                    WHERE id = %s
                    """,
                    (barbearia_id,),
                )
                return BarbeariaRepository._coalesce_identity_fields(item)
            except Exception as exc:
                if BarbeariaRepository._is_missing_users_flag_column_error(exc):
                    item = query_one(
                        """
                        SELECT id, nome, slug, telefone, cidade,
                               logo_url, login_logo_url, login_background_url,
                               churn_risk_days_threshold,
                               allow_employee_confirm_appointment,
                               allow_employee_create_appointment,
                               allow_employee_view_finance,
                               allow_employee_view_reports,
                               icone_marca, cor_primaria, cor_secundaria
                        FROM barbearias
                        WHERE id = %s
                        """,
                        (barbearia_id,),
                    )
                    return BarbeariaRepository._coalesce_identity_fields(item)

                if BarbeariaRepository._is_missing_reports_flag_column_error(exc):
                    item = query_one(
                        """
                        SELECT id, nome, slug, telefone, cidade,
                               logo_url, login_logo_url, login_background_url,
                               churn_risk_days_threshold,
                               allow_employee_confirm_appointment,
                               allow_employee_create_appointment,
                               allow_employee_view_finance,
                               icone_marca, cor_primaria, cor_secundaria
                        FROM barbearias
                        WHERE id = %s
                        """,
                        (barbearia_id,),
                    )
                    return BarbeariaRepository._coalesce_identity_fields(item)

                item = query_one(
                    """
                    SELECT id, nome, slug, telefone, cidade,
                           NULL::text AS logo_url,
                           NULL::text AS login_logo_url,
                           NULL::text AS login_background_url,
                           45::int AS churn_risk_days_threshold,
                           FALSE AS allow_employee_confirm_appointment,
                           TRUE AS allow_employee_create_appointment,
                           FALSE AS allow_employee_view_finance,
                           FALSE AS allow_employee_view_reports,
                           FALSE AS allow_employee_view_users,
                           NULL::text AS icone_marca,
                           NULL::text AS cor_primaria,
                           NULL::text AS cor_secundaria
                    FROM barbearias
                    WHERE id = %s
                    """,
                    (barbearia_id,),
                )
                return BarbeariaRepository._coalesce_identity_fields(item)

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("barbearias")
                    .select("id,nome,slug,telefone,cidade,logo_url,login_logo_url,login_background_url,churn_risk_days_threshold,allow_employee_confirm_appointment,allow_employee_create_appointment,allow_employee_view_finance,allow_employee_view_reports,allow_employee_view_users,icone_marca,cor_primaria,cor_secundaria")
                    .eq("id", barbearia_id)
                    .limit(1)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)
            except Exception as exc:
                if BarbeariaRepository._is_missing_users_flag_column_error(exc):
                    response = (
                        supabase.table("barbearias")
                        .select("id,nome,slug,telefone,cidade,logo_url,login_logo_url,login_background_url,churn_risk_days_threshold,allow_employee_confirm_appointment,allow_employee_create_appointment,allow_employee_view_finance,allow_employee_view_reports,icone_marca,cor_primaria,cor_secundaria")
                        .eq("id", barbearia_id)
                        .limit(1)
                        .execute()
                    )
                    data = response.data or []
                    return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)

                if BarbeariaRepository._is_missing_reports_flag_column_error(exc):
                    response = (
                        supabase.table("barbearias")
                        .select("id,nome,slug,telefone,cidade,logo_url,login_logo_url,login_background_url,churn_risk_days_threshold,allow_employee_confirm_appointment,allow_employee_create_appointment,allow_employee_view_finance,icone_marca,cor_primaria,cor_secundaria")
                        .eq("id", barbearia_id)
                        .limit(1)
                        .execute()
                    )
                    data = response.data or []
                    return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)

                response = (
                    supabase.table("barbearias")
                    .select("id,nome,slug,telefone,cidade")
                    .eq("id", barbearia_id)
                    .limit(1)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)

        return None

    @staticmethod
    def update_identity(
        barbearia_id: str,
        nome: str,
        telefone: str | None,
        cidade: str | None,
        logo_url: str | None,
        login_logo_url: str | None,
        login_background_url: str | None,
        churn_risk_days_threshold: int,
        allow_employee_confirm_appointment: bool,
        allow_employee_create_appointment: bool,
        allow_employee_view_finance: bool,
        allow_employee_view_reports: bool,
        allow_employee_view_users: bool,
        icone_marca: str | None,
        cor_primaria: str | None,
        cor_secundaria: str | None,
    ):
        BarbeariaRepository.require_tenant(barbearia_id)
        if is_db_ready():
            try:
                item = query_one(
                    """
                    UPDATE barbearias
                    SET nome = %s,
                        telefone = %s,
                        cidade = %s,
                        logo_url = %s,
                        login_logo_url = %s,
                        login_background_url = %s,
                        churn_risk_days_threshold = %s,
                        allow_employee_confirm_appointment = %s,
                        allow_employee_create_appointment = %s,
                        allow_employee_view_finance = %s,
                        allow_employee_view_reports = %s,
                        allow_employee_view_users = %s,
                        icone_marca = %s,
                        cor_primaria = %s,
                        cor_secundaria = %s
                    WHERE id = %s
                    RETURNING id, nome, slug, telefone, cidade,
                              logo_url, login_logo_url, login_background_url,
                              churn_risk_days_threshold,
                              allow_employee_confirm_appointment,
                              allow_employee_create_appointment,
                              allow_employee_view_finance,
                              allow_employee_view_reports,
                              allow_employee_view_users,
                              icone_marca, cor_primaria, cor_secundaria
                    """,
                    (
                        nome,
                        telefone,
                        cidade,
                        logo_url,
                        login_logo_url,
                        login_background_url,
                        churn_risk_days_threshold,
                        allow_employee_confirm_appointment,
                        allow_employee_create_appointment,
                        allow_employee_view_finance,
                        allow_employee_view_reports,
                        allow_employee_view_users,
                        icone_marca,
                        cor_primaria,
                        cor_secundaria,
                        barbearia_id,
                    ),
                )
                return BarbeariaRepository._coalesce_identity_fields(item)
            except Exception as exc:
                if BarbeariaRepository._is_missing_users_flag_column_error(exc):
                    item = query_one(
                        """
                        UPDATE barbearias
                        SET nome = %s,
                            telefone = %s,
                            cidade = %s,
                            logo_url = %s,
                            login_logo_url = %s,
                            login_background_url = %s,
                            churn_risk_days_threshold = %s,
                            allow_employee_confirm_appointment = %s,
                            allow_employee_create_appointment = %s,
                            allow_employee_view_finance = %s,
                            allow_employee_view_reports = %s,
                            icone_marca = %s,
                            cor_primaria = %s,
                            cor_secundaria = %s
                        WHERE id = %s
                        RETURNING id, nome, slug, telefone, cidade,
                                  logo_url, login_logo_url, login_background_url,
                                  churn_risk_days_threshold,
                                  allow_employee_confirm_appointment,
                                  allow_employee_create_appointment,
                                  allow_employee_view_finance,
                                  allow_employee_view_reports,
                                  icone_marca, cor_primaria, cor_secundaria
                        """,
                        (
                            nome,
                            telefone,
                            cidade,
                            logo_url,
                            login_logo_url,
                            login_background_url,
                            churn_risk_days_threshold,
                            allow_employee_confirm_appointment,
                            allow_employee_create_appointment,
                            allow_employee_view_finance,
                            allow_employee_view_reports,
                            icone_marca,
                            cor_primaria,
                            cor_secundaria,
                            barbearia_id,
                        ),
                    )
                    return BarbeariaRepository._coalesce_identity_fields(item)

                if BarbeariaRepository._is_missing_reports_flag_column_error(exc):
                    item = query_one(
                        """
                        UPDATE barbearias
                        SET nome = %s,
                            telefone = %s,
                            cidade = %s,
                            logo_url = %s,
                            login_logo_url = %s,
                            login_background_url = %s,
                            churn_risk_days_threshold = %s,
                            allow_employee_confirm_appointment = %s,
                            allow_employee_create_appointment = %s,
                            allow_employee_view_finance = %s,
                            icone_marca = %s,
                            cor_primaria = %s,
                            cor_secundaria = %s
                        WHERE id = %s
                        RETURNING id, nome, slug, telefone, cidade,
                                  logo_url, login_logo_url, login_background_url,
                                  churn_risk_days_threshold,
                                  allow_employee_confirm_appointment,
                                  allow_employee_create_appointment,
                                  allow_employee_view_finance,
                                  icone_marca, cor_primaria, cor_secundaria
                        """,
                        (
                            nome,
                            telefone,
                            cidade,
                            logo_url,
                            login_logo_url,
                            login_background_url,
                            churn_risk_days_threshold,
                            allow_employee_confirm_appointment,
                            allow_employee_create_appointment,
                            allow_employee_view_finance,
                            icone_marca,
                            cor_primaria,
                            cor_secundaria,
                            barbearia_id,
                        ),
                    )
                    return BarbeariaRepository._coalesce_identity_fields(item)

                item = query_one(
                    """
                    UPDATE barbearias
                    SET nome = %s,
                        telefone = %s,
                        cidade = %s
                    WHERE id = %s
                    RETURNING id, nome, slug, telefone, cidade,
                              NULL::text AS logo_url,
                              NULL::text AS login_logo_url,
                              NULL::text AS login_background_url,
                              45::int AS churn_risk_days_threshold,
                              FALSE AS allow_employee_confirm_appointment,
                              TRUE AS allow_employee_create_appointment,
                              FALSE AS allow_employee_view_finance,
                              FALSE AS allow_employee_view_reports,
                              NULL::text AS icone_marca,
                              NULL::text AS cor_primaria,
                              NULL::text AS cor_secundaria
                    """,
                    (nome, telefone, cidade, barbearia_id),
                )
                return BarbeariaRepository._coalesce_identity_fields(item)

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("barbearias")
                    .update(
                        {
                            "nome": nome,
                            "telefone": telefone,
                            "cidade": cidade,
                            "logo_url": logo_url,
                            "login_logo_url": login_logo_url,
                            "login_background_url": login_background_url,
                            "churn_risk_days_threshold": int(churn_risk_days_threshold),
                            "allow_employee_confirm_appointment": bool(allow_employee_confirm_appointment),
                            "allow_employee_create_appointment": bool(allow_employee_create_appointment),
                            "allow_employee_view_finance": bool(allow_employee_view_finance),
                            "allow_employee_view_reports": bool(allow_employee_view_reports),
                            "allow_employee_view_users": bool(allow_employee_view_users),
                            "icone_marca": icone_marca,
                            "cor_primaria": cor_primaria,
                            "cor_secundaria": cor_secundaria,
                        }
                    )
                    .eq("id", barbearia_id)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)
            except Exception as exc:
                if BarbeariaRepository._is_missing_users_flag_column_error(exc):
                    response = (
                        supabase.table("barbearias")
                        .update(
                            {
                                "nome": nome,
                                "telefone": telefone,
                                "cidade": cidade,
                                "logo_url": logo_url,
                                "login_logo_url": login_logo_url,
                                "login_background_url": login_background_url,
                                "churn_risk_days_threshold": int(churn_risk_days_threshold),
                                "allow_employee_confirm_appointment": bool(allow_employee_confirm_appointment),
                                "allow_employee_create_appointment": bool(allow_employee_create_appointment),
                                "allow_employee_view_finance": bool(allow_employee_view_finance),
                                "allow_employee_view_reports": bool(allow_employee_view_reports),
                                "icone_marca": icone_marca,
                                "cor_primaria": cor_primaria,
                                "cor_secundaria": cor_secundaria,
                            }
                        )
                        .eq("id", barbearia_id)
                        .execute()
                    )
                    data = response.data or []
                    return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)

                if BarbeariaRepository._is_missing_reports_flag_column_error(exc):
                    response = (
                        supabase.table("barbearias")
                        .update(
                            {
                                "nome": nome,
                                "telefone": telefone,
                                "cidade": cidade,
                                "logo_url": logo_url,
                                "login_logo_url": login_logo_url,
                                "login_background_url": login_background_url,
                                "churn_risk_days_threshold": int(churn_risk_days_threshold),
                                "allow_employee_confirm_appointment": bool(allow_employee_confirm_appointment),
                                "allow_employee_create_appointment": bool(allow_employee_create_appointment),
                                "allow_employee_view_finance": bool(allow_employee_view_finance),
                                "icone_marca": icone_marca,
                                "cor_primaria": cor_primaria,
                                "cor_secundaria": cor_secundaria,
                            }
                        )
                        .eq("id", barbearia_id)
                        .execute()
                    )
                    data = response.data or []
                    return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)

                response = (
                    supabase.table("barbearias")
                    .update({"nome": nome, "telefone": telefone, "cidade": cidade})
                    .eq("id", barbearia_id)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_identity_fields(data[0] if data else None)

        return None

    @staticmethod
    def get_subscription(barbearia_id: str):
        BarbeariaRepository.require_tenant(barbearia_id)

        if is_db_ready():
            try:
                item = query_one(
                    """
                    SELECT id, nome, plano, assinatura_status,
                           ciclo_cobranca, valor_plano_centavos,
                           trial_usado, trial_inicio_em, trial_fim_em,
                           assinatura_inicio_em, proxima_cobranca_em,
                           atualizado_assinatura_em,
                           payment_customer_id, payment_subscription_id, payment_plan_id,
                           payment_last_event_id, payment_last_event_type, payment_last_event_at, payment_webhook_updated_at
                    FROM barbearias
                    WHERE id = %s
                    """,
                    (barbearia_id,),
                )
                return BarbeariaRepository._coalesce_subscription_fields(item)
            except Exception as exc:
                if not (
                    BarbeariaRepository._is_missing_subscription_column_error(exc)
                    or BarbeariaRepository._is_missing_payment_column_error(exc)
                ):
                    raise

                item = query_one(
                    """
                    SELECT id, nome,
                           COALESCE(plano, 'PROFISSIONAL_MONTHLY') AS plano,
                           COALESCE(assinatura_status, 'ACTIVE') AS assinatura_status,
                           'MONTHLY'::text AS ciclo_cobranca,
                           3990::int AS valor_plano_centavos,
                           FALSE AS trial_usado,
                           NULL::timestamptz AS trial_inicio_em,
                           NULL::timestamptz AS trial_fim_em,
                           NULL::timestamptz AS assinatura_inicio_em,
                           NULL::timestamptz AS proxima_cobranca_em,
                              NOW()::timestamptz AS atualizado_assinatura_em,
                              NULL::text AS payment_customer_id,
                              NULL::text AS payment_subscription_id,
                              NULL::text AS payment_plan_id,
                              NULL::text AS payment_last_event_id,
                              NULL::text AS payment_last_event_type,
                              NULL::timestamptz AS payment_last_event_at,
                              NULL::timestamptz AS payment_webhook_updated_at
                    FROM barbearias
                    WHERE id = %s
                    """,
                    (barbearia_id,),
                )
                return BarbeariaRepository._coalesce_subscription_fields(item)

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("barbearias")
                    .select("id,nome,plano,assinatura_status,ciclo_cobranca,valor_plano_centavos,trial_usado,trial_inicio_em,trial_fim_em,assinatura_inicio_em,proxima_cobranca_em,atualizado_assinatura_em,payment_customer_id,payment_subscription_id,payment_plan_id,payment_last_event_id,payment_last_event_type,payment_last_event_at,payment_webhook_updated_at")
                    .eq("id", barbearia_id)
                    .limit(1)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_subscription_fields(data[0] if data else None)
            except Exception as exc:
                if not (
                    BarbeariaRepository._is_missing_subscription_column_error(exc)
                    or BarbeariaRepository._is_missing_payment_column_error(exc)
                ):
                    raise

                response = (
                    supabase.table("barbearias")
                    .select("id,nome,plano,assinatura_status")
                    .eq("id", barbearia_id)
                    .limit(1)
                    .execute()
                )
                data = response.data or []
                return BarbeariaRepository._coalesce_subscription_fields(data[0] if data else None)

        return None

    @staticmethod
    def apply_subscription_webhook(
        barbearia_id: str,
        *,
        event_id: str,
        event_type: str,
        assinatura_status: str,
        ciclo_cobranca: str | None = None,
        valor_plano_centavos: int | None = None,
        proxima_cobranca_em=None,
        assinatura_inicio_em=None,
        payment_customer_id: str | None = None,
        payment_subscription_id: str | None = None,
        payment_plan_id: str | None = None,
        payment_provider: str = "asaas",
    ):
        BarbeariaRepository.require_tenant(barbearia_id)

        current = BarbeariaRepository.get_subscription(barbearia_id)
        if not current:
            return None

        if str(current.get("payment_last_event_id") or "") == str(event_id or "") and event_id:
            return current

        now = datetime.now(timezone.utc)
        cycle = BarbeariaRepository._normalize_cycle(ciclo_cobranca or current.get("ciclo_cobranca"))
        price = int(valor_plano_centavos or current.get("valor_plano_centavos") or BarbeariaRepository._SUBSCRIPTION_PRICES[cycle])
        plan_code = BarbeariaRepository._infer_subscription_plan_code(cycle, price, current.get("plano"))

        payload = {
            "plano": plan_code,
            "assinatura_status": str(assinatura_status or "ACTIVE").upper(),
            "ciclo_cobranca": cycle,
            "valor_plano_centavos": int(price),
            "trial_usado": True,
            "trial_inicio_em": current.get("trial_inicio_em"),
            "trial_fim_em": current.get("trial_fim_em"),
            "assinatura_inicio_em": BarbeariaRepository._to_iso(assinatura_inicio_em) or current.get("assinatura_inicio_em") or BarbeariaRepository._to_iso(now),
            "proxima_cobranca_em": BarbeariaRepository._to_iso(proxima_cobranca_em) or current.get("proxima_cobranca_em"),
            "atualizado_assinatura_em": BarbeariaRepository._to_iso(now),
            "payment_customer_id": payment_customer_id or current.get("payment_customer_id"),
            "payment_subscription_id": payment_subscription_id or current.get("payment_subscription_id"),
            "payment_plan_id": payment_plan_id or current.get("payment_plan_id"),
            "payment_last_event_id": event_id,
            "payment_last_event_type": event_type,
            "payment_last_event_at": BarbeariaRepository._to_iso(now),
            "payment_webhook_updated_at": BarbeariaRepository._to_iso(now),
            "payment_provider": payment_provider,
        }

        if is_db_ready():
            try:
                item = query_one(
                    """
                    UPDATE barbearias
                    SET plano = %s,
                        assinatura_status = %s,
                        ciclo_cobranca = %s,
                        valor_plano_centavos = %s,
                        trial_usado = %s,
                        trial_inicio_em = %s,
                        trial_fim_em = %s,
                        assinatura_inicio_em = %s,
                        proxima_cobranca_em = %s,
                        atualizado_assinatura_em = %s,
                        payment_customer_id = %s,
                        payment_subscription_id = %s,
                        payment_plan_id = %s,
                        payment_last_event_id = %s,
                        payment_last_event_type = %s,
                        payment_last_event_at = %s,
                        payment_webhook_updated_at = %s,
                        payment_provider = %s
                    WHERE id = %s
                    RETURNING id, nome, plano, assinatura_status,
                              ciclo_cobranca, valor_plano_centavos,
                              trial_usado, trial_inicio_em, trial_fim_em,
                              assinatura_inicio_em, proxima_cobranca_em,
                              atualizado_assinatura_em,
                              payment_customer_id, payment_subscription_id, payment_plan_id,
                              payment_last_event_id, payment_last_event_type,
                              payment_last_event_at, payment_webhook_updated_at, payment_provider
                    """,
                    (
                        payload["plano"],
                        payload["assinatura_status"],
                        payload["ciclo_cobranca"],
                        payload["valor_plano_centavos"],
                        payload["trial_usado"],
                        payload["trial_inicio_em"],
                        payload["trial_fim_em"],
                        payload["assinatura_inicio_em"],
                        payload["proxima_cobranca_em"],
                        payload["atualizado_assinatura_em"],
                        payload["payment_customer_id"],
                        payload["payment_subscription_id"],
                        payload["payment_plan_id"],
                        payload["payment_last_event_id"],
                        payload["payment_last_event_type"],
                        payload["payment_last_event_at"],
                        payload["payment_webhook_updated_at"],
                        payload["payment_provider"],
                        barbearia_id,
                    ),
                )
                return BarbeariaRepository._coalesce_subscription_fields(item)
            except Exception as exc:
                if not (
                    BarbeariaRepository._is_missing_payment_column_error(exc)
                    or BarbeariaRepository._is_missing_subscription_column_error(exc)
                ):
                    raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("barbearias")
                    .update(payload)
                    .eq("id", barbearia_id)
                    .execute()
                )
                data = response.data or []
                if data:
                    return BarbeariaRepository._coalesce_subscription_fields(data[0])
            except Exception as exc:
                if not (
                    BarbeariaRepository._is_missing_payment_column_error(exc)
                    or BarbeariaRepository._is_missing_subscription_column_error(exc)
                ):
                    raise

        return BarbeariaRepository.update_subscription(
            barbearia_id,
            ciclo_cobranca=cycle,
            iniciar_trial=False,
        )

    @staticmethod
    def _build_subscription_payload(current: dict, *, cycle: str, iniciar_trial: bool):
        price = int(current.get("valor_plano_centavos") or BarbeariaRepository._SUBSCRIPTION_PRICES[cycle])
        plan_code = BarbeariaRepository._infer_subscription_plan_code(cycle, price, current.get("plano"))

        now = datetime.now(timezone.utc)
        current_trial_used = bool(current.get("trial_usado", False))
        current_status = str(current.get("assinatura_status") or "ACTIVE").upper()
        trial_end = BarbeariaRepository._as_datetime(current.get("trial_fim_em"))

        should_start_trial = bool(iniciar_trial and not current_trial_used)
        trial_used = current_trial_used or should_start_trial

        next_status = current_status
        trial_start_value = BarbeariaRepository._as_datetime(current.get("trial_inicio_em"))
        trial_end_value = trial_end
        assinatura_inicio_value = BarbeariaRepository._as_datetime(current.get("assinatura_inicio_em"))
        proxima_cobranca_value = BarbeariaRepository._as_datetime(current.get("proxima_cobranca_em"))

        if should_start_trial:
            next_status = "TRIAL"
            trial_start_value = now
            trial_end_value = now + timedelta(days=7)
            proxima_cobranca_value = trial_end_value
            assinatura_inicio_value = None
        elif current_status == "TRIAL" and trial_end and now <= trial_end:
            next_status = "TRIAL"
            proxima_cobranca_value = trial_end
        else:
            next_status = "ACTIVE"
            if not assinatura_inicio_value:
                assinatura_inicio_value = now
            proxima_cobranca_value = now + (timedelta(days=365) if cycle == "YEARLY" else timedelta(days=30))

        return {
            "plano": plan_code,
            "assinatura_status": next_status,
            "ciclo_cobranca": cycle,
            "valor_plano_centavos": int(price),
            "trial_usado": bool(trial_used),
            "trial_inicio_em": BarbeariaRepository._to_iso(trial_start_value),
            "trial_fim_em": BarbeariaRepository._to_iso(trial_end_value),
            "assinatura_inicio_em": BarbeariaRepository._to_iso(assinatura_inicio_value),
            "proxima_cobranca_em": BarbeariaRepository._to_iso(proxima_cobranca_value),
            "atualizado_assinatura_em": BarbeariaRepository._to_iso(now),
        }

    @staticmethod
    def start_trial_on_first_admin_login(barbearia_id: str):
        BarbeariaRepository.require_tenant(barbearia_id)

        current = BarbeariaRepository.get_subscription(barbearia_id)
        if not current:
            return None

        current_status = str(current.get("assinatura_status") or "ACTIVE").upper()
        if bool(current.get("trial_usado", False)):
            return current
        if BarbeariaRepository._as_datetime(current.get("trial_inicio_em")):
            return current
        if current_status not in {"ACTIVE", "TRIAL"}:
            return current
        if BarbeariaRepository._as_datetime(current.get("assinatura_inicio_em")):
            return current
        if str(current.get("payment_subscription_id") or "").strip():
            return current

        payload = BarbeariaRepository._build_subscription_payload(
            current,
            cycle=BarbeariaRepository._normalize_cycle(current.get("ciclo_cobranca")),
            iniciar_trial=True,
        )

        if is_db_ready():
            try:
                item = query_one(
                    """
                    UPDATE barbearias
                    SET plano = %s,
                        assinatura_status = %s,
                        ciclo_cobranca = %s,
                        valor_plano_centavos = %s,
                        trial_usado = %s,
                        trial_inicio_em = %s,
                        trial_fim_em = %s,
                        assinatura_inicio_em = %s,
                        proxima_cobranca_em = %s,
                        atualizado_assinatura_em = %s
                    WHERE id = %s
                      AND COALESCE(trial_usado, FALSE) = FALSE
                      AND trial_inicio_em IS NULL
                      AND assinatura_inicio_em IS NULL
                      AND payment_subscription_id IS NULL
                    RETURNING id, nome, plano, assinatura_status,
                              ciclo_cobranca, valor_plano_centavos,
                              trial_usado, trial_inicio_em, trial_fim_em,
                              assinatura_inicio_em, proxima_cobranca_em,
                              atualizado_assinatura_em,
                              payment_customer_id, payment_subscription_id, payment_plan_id,
                              payment_last_event_id, payment_last_event_type, payment_last_event_at, payment_webhook_updated_at, payment_provider
                    """,
                    (
                        payload["plano"],
                        payload["assinatura_status"],
                        payload["ciclo_cobranca"],
                        payload["valor_plano_centavos"],
                        payload["trial_usado"],
                        payload["trial_inicio_em"],
                        payload["trial_fim_em"],
                        payload["assinatura_inicio_em"],
                        payload["proxima_cobranca_em"],
                        payload["atualizado_assinatura_em"],
                        barbearia_id,
                    ),
                )
                return BarbeariaRepository._coalesce_subscription_fields(item) if item else BarbeariaRepository.get_subscription(barbearia_id)
            except Exception as exc:
                if not BarbeariaRepository._is_missing_subscription_column_error(exc):
                    raise

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("barbearias")
                    .update(payload)
                    .eq("id", barbearia_id)
                    .eq("trial_usado", False)
                    .is_("trial_inicio_em", None)
                    .is_("assinatura_inicio_em", None)
                    .is_("payment_subscription_id", None)
                    .execute()
                )
                data = response.data or []
                if data:
                    return BarbeariaRepository._coalesce_subscription_fields(data[0])
                return BarbeariaRepository.get_subscription(barbearia_id)
            except Exception as exc:
                if not BarbeariaRepository._is_missing_subscription_column_error(exc):
                    raise

        return current

    @staticmethod
    def update_subscription(barbearia_id: str, ciclo_cobranca: str, iniciar_trial: bool):
        BarbeariaRepository.require_tenant(barbearia_id)

        cycle = BarbeariaRepository._normalize_cycle(ciclo_cobranca)
        price = BarbeariaRepository._SUBSCRIPTION_PRICES[cycle]
        plan_code = BarbeariaRepository._SUBSCRIPTION_PLAN_CODE[cycle]

        current = BarbeariaRepository.get_subscription(barbearia_id)
        if not current:
            return None

        payload = BarbeariaRepository._build_subscription_payload(current, cycle=cycle, iniciar_trial=iniciar_trial)

        if is_db_ready():
            try:
                item = query_one(
                    """
                    UPDATE barbearias
                    SET plano = %s,
                        assinatura_status = %s,
                        ciclo_cobranca = %s,
                        valor_plano_centavos = %s,
                        trial_usado = %s,
                        trial_inicio_em = %s,
                        trial_fim_em = %s,
                        assinatura_inicio_em = %s,
                        proxima_cobranca_em = %s,
                        atualizado_assinatura_em = %s
                    WHERE id = %s
                    RETURNING id, nome, plano, assinatura_status,
                              ciclo_cobranca, valor_plano_centavos,
                              trial_usado, trial_inicio_em, trial_fim_em,
                              assinatura_inicio_em, proxima_cobranca_em,
                              atualizado_assinatura_em
                    """,
                    (
                        payload["plano"],
                        payload["assinatura_status"],
                        payload["ciclo_cobranca"],
                        payload["valor_plano_centavos"],
                        payload["trial_usado"],
                        payload["trial_inicio_em"],
                        payload["trial_fim_em"],
                        payload["assinatura_inicio_em"],
                        payload["proxima_cobranca_em"],
                        payload["atualizado_assinatura_em"],
                        barbearia_id,
                    ),
                )
                return BarbeariaRepository._coalesce_subscription_fields(item)
            except Exception as exc:
                if not BarbeariaRepository._is_missing_subscription_column_error(exc):
                    raise

                item = query_one(
                    """
                    UPDATE barbearias
                    SET plano = %s,
                        assinatura_status = %s
                    WHERE id = %s
                    RETURNING id, nome,
                              COALESCE(plano, %s) AS plano,
                              COALESCE(assinatura_status, 'ACTIVE') AS assinatura_status,
                              %s::text AS ciclo_cobranca,
                              %s::int AS valor_plano_centavos,
                              %s::boolean AS trial_usado,
                              %s::timestamptz AS trial_inicio_em,
                              %s::timestamptz AS trial_fim_em,
                              %s::timestamptz AS assinatura_inicio_em,
                              %s::timestamptz AS proxima_cobranca_em,
                              NOW()::timestamptz AS atualizado_assinatura_em
                    """,
                    (
                        payload["plano"],
                        payload["assinatura_status"],
                        barbearia_id,
                        payload["plano"],
                        payload["ciclo_cobranca"],
                        payload["valor_plano_centavos"],
                        payload["trial_usado"],
                        payload["trial_inicio_em"],
                        payload["trial_fim_em"],
                        payload["assinatura_inicio_em"],
                        payload["proxima_cobranca_em"],
                    ),
                )
                return BarbeariaRepository._coalesce_subscription_fields(item)

        if is_supabase_ready():
            supabase = get_supabase_client()
            try:
                response = (
                    supabase.table("barbearias")
                    .update(payload)
                    .eq("id", barbearia_id)
                    .execute()
                )
                data = response.data or []
                if data:
                    return BarbeariaRepository._coalesce_subscription_fields(data[0])
                return BarbeariaRepository.get_subscription(barbearia_id)
            except Exception as exc:
                if not BarbeariaRepository._is_missing_subscription_column_error(exc):
                    raise

                legacy_payload = {
                    "plano": payload["plano"],
                    "assinatura_status": payload["assinatura_status"],
                }
                response = (
                    supabase.table("barbearias")
                    .update(legacy_payload)
                    .eq("id", barbearia_id)
                    .execute()
                )
                data = response.data or []
                if data:
                    return BarbeariaRepository._coalesce_subscription_fields(data[0])
                return BarbeariaRepository.get_subscription(barbearia_id)

        return None
