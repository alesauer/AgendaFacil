from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests
from cryptography.fernet import Fernet
from flask import current_app

from backend.db import execute, is_db_ready, query_all, query_one
from backend.supabase_client import get_supabase_client, is_supabase_ready


@dataclass(frozen=True)
class SettingSpec:
    key: str
    category: str
    env_key: str
    data_type: str
    is_secret: bool
    requires_restart: bool
    description: str
    validator: str | None = None


class MasterRuntimeConfigService:
    _cache_expire_at: float = 0.0
    _cache_values_by_env: dict[str, Any] = {}

    SETTINGS_CATALOG: tuple[SettingSpec, ...] = (
        SettingSpec(
            key="network.proxy.http_proxy",
            category="proxy",
            env_key="HTTP_PROXY",
            data_type="string",
            is_secret=False,
            requires_restart=True,
            description="Proxy HTTP global do backend",
            validator="url",
        ),
        SettingSpec(
            key="network.proxy.https_proxy",
            category="proxy",
            env_key="HTTPS_PROXY",
            data_type="string",
            is_secret=False,
            requires_restart=True,
            description="Proxy HTTPS global do backend",
            validator="url",
        ),
        SettingSpec(
            key="network.proxy.no_proxy",
            category="proxy",
            env_key="NO_PROXY",
            data_type="string",
            is_secret=False,
            requires_restart=True,
            description="Hosts sem proxy (separados por vírgula)",
        ),
        SettingSpec(
            key="network.supabase.network_mode",
            category="proxy",
            env_key="SUPABASE_NETWORK_MODE",
            data_type="string",
            is_secret=False,
            requires_restart=True,
            description="Modo de rede do Supabase: auto, proxy ou direct",
            validator="supabase_mode",
        ),
        SettingSpec(
            key="network.supabase.bypass_proxy",
            category="proxy",
            env_key="BYPASS_PROXY_FOR_SUPABASE",
            data_type="boolean",
            is_secret=False,
            requires_restart=True,
            description="Bypass de proxy para hostname do Supabase",
        ),
        SettingSpec(
            key="network.supabase.disable_system_proxy",
            category="proxy",
            env_key="DISABLE_SYSTEM_PROXY_FOR_SUPABASE",
            data_type="boolean",
            is_secret=False,
            requires_restart=True,
            description="Limpa HTTP_PROXY/HTTPS_PROXY em runtime",
        ),
        SettingSpec(
            key="email.resend.base_url",
            category="email",
            env_key="RESEND_API_BASE_URL",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="Base URL da API Resend",
            validator="url",
        ),
        SettingSpec(
            key="email.resend.api_key",
            category="email",
            env_key="RESEND_API_KEY",
            data_type="string",
            is_secret=True,
            requires_restart=False,
            description="Chave de API do Resend",
        ),
        SettingSpec(
            key="email.from.address",
            category="email",
            env_key="EMAIL_FROM_ADDRESS",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="E-mail remetente padrão",
            validator="email",
        ),
        SettingSpec(
            key="email.from.name",
            category="email",
            env_key="EMAIL_FROM_NAME",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="Nome do remetente padrão",
        ),
        SettingSpec(
            key="whatsapp.evolution.base_url",
            category="whatsapp",
            env_key="EVOLUTION_API_BASE_URL",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="Base URL da Evolution API",
            validator="url",
        ),
        SettingSpec(
            key="whatsapp.evolution.api_key",
            category="whatsapp",
            env_key="EVOLUTION_API_KEY",
            data_type="string",
            is_secret=True,
            requires_restart=False,
            description="Token de API da Evolution",
        ),
        SettingSpec(
            key="whatsapp.evolution.api_key_header",
            category="whatsapp",
            env_key="EVOLUTION_API_KEY_HEADER",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="Header da chave da Evolution (ex: apikey)",
        ),
        SettingSpec(
            key="whatsapp.evolution.instance",
            category="whatsapp",
            env_key="EVOLUTION_INSTANCE",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="Instância da Evolution",
        ),
        SettingSpec(
            key="whatsapp.evolution.send_path",
            category="whatsapp",
            env_key="EVOLUTION_SEND_TEXT_PATH",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="Path para envio de texto (usa {instance})",
        ),
        SettingSpec(
            key="whatsapp.evolution.http_timeout_seconds",
            category="whatsapp",
            env_key="EVOLUTION_HTTP_TIMEOUT_SECONDS",
            data_type="number",
            is_secret=False,
            requires_restart=False,
            description="Timeout HTTP da Evolution em segundos",
        ),
        SettingSpec(
            key="payments.mp.access_token",
            category="payments",
            env_key="MP_ACCESS_TOKEN",
            data_type="string",
            is_secret=True,
            requires_restart=False,
            description="Access Token de produção do Mercado Pago (APP_USR-...)",
        ),
        SettingSpec(
            key="payments.mp.access_token_test",
            category="payments",
            env_key="MP_ACCESS_TOKEN_TEST",
            data_type="string",
            is_secret=True,
            requires_restart=False,
            description="Access Token de teste do Mercado Pago (TEST-...)",
        ),
        SettingSpec(
            key="payments.mp.webhook_secret",
            category="payments",
            env_key="MP_WEBHOOK_SECRET",
            data_type="string",
            is_secret=True,
            requires_restart=False,
            description="Chave secreta para validar assinatura HMAC do webhook do MP",
        ),
        SettingSpec(
            key="payments.mp.plan_id_monthly",
            category="payments",
            env_key="MP_PLAN_ID_MONTHLY",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="ID do plano mensal (preapproval_plan) no Mercado Pago",
        ),
        SettingSpec(
            key="payments.mp.plan_id_yearly",
            category="payments",
            env_key="MP_PLAN_ID_YEARLY",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="ID do plano anual (preapproval_plan) no Mercado Pago",
        ),
        SettingSpec(
            key="payments.mp.webhook_barbearia_slug",
            category="payments",
            env_key="MP_WEBHOOK_BARBEARIA_SLUG",
            data_type="string",
            is_secret=False,
            requires_restart=False,
            description="Slug fallback para resolução de tenant no webhook do MP",
        ),
    )

    @classmethod
    def _catalog_map(cls) -> dict[str, SettingSpec]:
        return {item.key: item for item in cls.SETTINGS_CATALOG}

    @classmethod
    def _env_map(cls) -> dict[str, SettingSpec]:
        return {item.env_key: item for item in cls.SETTINGS_CATALOG}

    @classmethod
    def _fernet(cls) -> Fernet:
        configured = str(current_app.config.get("MASTER_CONFIG_ENCRYPTION_KEY") or "").strip()
        if configured:
            key = configured.encode("utf-8")
        else:
            secret = str(current_app.config.get("SECRET_KEY") or "change-this-secret")
            digest = hashlib.sha256(secret.encode("utf-8")).digest()
            key = base64.urlsafe_b64encode(digest)
        return Fernet(key)

    @classmethod
    def _encrypt_if_needed(cls, value: str | None, is_secret: bool) -> str | None:
        if value is None:
            return None
        if not is_secret:
            return value
        return cls._fernet().encrypt(value.encode("utf-8")).decode("utf-8")

    @classmethod
    def _decrypt_if_needed(cls, value: str | None, is_secret: bool) -> str | None:
        if value is None:
            return None
        if not is_secret:
            return value
        try:
            return cls._fernet().decrypt(value.encode("utf-8")).decode("utf-8")
        except Exception:
            return None

    @staticmethod
    def _mask(value: str | None, is_secret: bool) -> str | None:
        if value is None:
            return None
        text = str(value)
        if not is_secret:
            return text
        if len(text) <= 4:
            return "••••"
        return f"••••••{text[-4:]}"

    @staticmethod
    def _now_iso() -> str:
        return datetime.now(tz=timezone.utc).isoformat()

    @classmethod
    def invalidate_cache(cls):
        cls._cache_values_by_env = {}
        cls._cache_expire_at = 0.0

    @classmethod
    def _cache_ttl_seconds(cls) -> int:
        ttl = int(current_app.config.get("MASTER_RUNTIME_CONFIG_CACHE_SECONDS", 30) or 30)
        return max(5, ttl)

    @classmethod
    def _coerce_value(cls, spec: SettingSpec, value: Any) -> str | None:
        if value is None:
            return None

        if spec.data_type == "boolean":
            if isinstance(value, bool):
                return "true" if value else "false"
            text = str(value).strip().lower()
            if text in {"true", "1", "yes", "sim"}:
                return "true"
            if text in {"false", "0", "no", "nao", "não"}:
                return "false"
            raise ValueError(f"{spec.key}: valor booleano inválido")

        if spec.data_type == "number":
            text = str(value).strip()
            try:
                float(text)
            except Exception:
                raise ValueError(f"{spec.key}: valor numérico inválido")
            return text

        if spec.data_type == "json":
            if isinstance(value, (dict, list)):
                return json.dumps(value, ensure_ascii=False)
            text = str(value).strip()
            try:
                json.loads(text)
            except Exception:
                raise ValueError(f"{spec.key}: JSON inválido")
            return text

        text = str(value).strip()
        return text or None

    @classmethod
    def _validate(cls, spec: SettingSpec, value: str | None):
        if value is None:
            return

        validator = (spec.validator or "").strip().lower()
        if not validator:
            return

        if validator == "url":
            if not re.match(r"^https?://", value, re.IGNORECASE):
                raise ValueError(f"{spec.key}: URL inválida")
            return

        if validator == "email":
            if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
                raise ValueError(f"{spec.key}: e-mail inválido")
            return

        if validator == "supabase_mode":
            if value not in {"auto", "proxy", "direct"}:
                raise ValueError(f"{spec.key}: use auto, proxy ou direct")
            return

        if validator == "stripe_key":
            if value and not value.startswith("sk_"):
                raise ValueError(f"{spec.key}: chave Stripe deve iniciar com sk_")
            return

        if validator == "stripe_webhook":
            if value and not value.startswith("whsec_"):
                raise ValueError(f"{spec.key}: webhook Stripe deve iniciar com whsec_")
            return

    @classmethod
    def _ensure_catalog_seeded(cls):
        for spec in cls.SETTINGS_CATALOG:
            cls._upsert_setting_metadata(spec)

    @classmethod
    def _upsert_setting_metadata(cls, spec: SettingSpec):
        if is_db_ready():
            existing = query_one(
                "SELECT setting_key FROM master_runtime_settings WHERE setting_key = %s",
                (spec.key,),
            )
            if existing:
                execute(
                    """
                    UPDATE master_runtime_settings
                    SET category = %s,
                        env_key = %s,
                        data_type = %s,
                        is_secret = %s,
                        requires_restart = %s,
                        description = %s,
                        updated_at = NOW()
                    WHERE setting_key = %s
                    """,
                    (
                        spec.category,
                        spec.env_key,
                        spec.data_type,
                        spec.is_secret,
                        spec.requires_restart,
                        spec.description,
                        spec.key,
                    ),
                )
                return

            execute(
                """
                INSERT INTO master_runtime_settings
                    (setting_key, category, env_key, data_type, is_secret, requires_restart, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    spec.key,
                    spec.category,
                    spec.env_key,
                    spec.data_type,
                    spec.is_secret,
                    spec.requires_restart,
                    spec.description,
                ),
            )
            return

        if is_supabase_ready():
            supabase = get_supabase_client()
            row = {
                "setting_key": spec.key,
                "category": spec.category,
                "env_key": spec.env_key,
                "data_type": spec.data_type,
                "is_secret": spec.is_secret,
                "requires_restart": spec.requires_restart,
                "description": spec.description,
                "updated_at": cls._now_iso(),
            }
            supabase.table("master_runtime_settings").upsert(row, on_conflict="setting_key").execute()

    @classmethod
    def _fetch_settings_rows(cls) -> list[dict[str, Any]]:
        if is_db_ready():
            return query_all(
                """
                SELECT setting_key, category, env_key, data_type, is_secret, requires_restart, description,
                       value_current, value_pending, published_version, updated_by, updated_at
                FROM master_runtime_settings
                ORDER BY category, setting_key
                """
            )

        if is_supabase_ready():
            response = (
                get_supabase_client()
                .table("master_runtime_settings")
                .select(
                    "setting_key,category,env_key,data_type,is_secret,requires_restart,description,"
                    "value_current,value_pending,published_version,updated_by,updated_at"
                )
                .order("category")
                .order("setting_key")
                .execute()
            )
            return response.data or []

        return []

    @classmethod
    def _update_setting_values(
        cls,
        setting_key: str,
        *,
        value_current: str | None | object = ...,
        value_pending: str | None | object = ...,
        published_version: int | None | object = ...,
        updated_by: str | None = None,
    ):
        patch: dict[str, Any] = {
            "updated_by": updated_by,
            "updated_at": cls._now_iso(),
        }
        if value_current is not ...:
            patch["value_current"] = value_current
        if value_pending is not ...:
            patch["value_pending"] = value_pending
        if published_version is not ...:
            patch["published_version"] = published_version

        if is_db_ready():
            columns = []
            params: list[Any] = []
            for key, value in patch.items():
                columns.append(f"{key} = %s")
                params.append(value)
            params.append(setting_key)
            execute(
                f"UPDATE master_runtime_settings SET {', '.join(columns)} WHERE setting_key = %s",
                tuple(params),
            )
            return

        if is_supabase_ready():
            get_supabase_client().table("master_runtime_settings").update(patch).eq("setting_key", setting_key).execute()

    @classmethod
    def _insert_release(cls, version: int, action: str, snapshot: dict[str, Any], notes: str | None, created_by: str):
        payload = {
            "version": version,
            "action": action,
            "snapshot": snapshot,
            "notes": notes,
            "created_by": created_by,
            "created_at": cls._now_iso(),
        }
        if is_db_ready():
            execute(
                """
                INSERT INTO master_runtime_config_releases
                  (version, action, snapshot, notes, created_by, created_at)
                VALUES (%s, %s, %s::jsonb, %s, %s, %s)
                """,
                (version, action, json.dumps(snapshot, ensure_ascii=False), notes, created_by, payload["created_at"]),
            )
            return

        if is_supabase_ready():
            get_supabase_client().table("master_runtime_config_releases").insert(payload).execute()

    @classmethod
    def _insert_audit(
        cls,
        setting_key: str,
        action: str,
        old_masked: str | None,
        new_masked: str | None,
        changed_by: str,
        version: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        payload = {
            "setting_key": setting_key,
            "action": action,
            "old_masked": old_masked,
            "new_masked": new_masked,
            "changed_by": changed_by,
            "version": version,
            "details": details or {},
            "changed_at": cls._now_iso(),
        }
        if is_db_ready():
            execute(
                """
                INSERT INTO master_runtime_settings_audit
                  (setting_key, action, old_masked, new_masked, changed_by, version, details, changed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s)
                """,
                (
                    payload["setting_key"],
                    payload["action"],
                    payload["old_masked"],
                    payload["new_masked"],
                    payload["changed_by"],
                    payload["version"],
                    json.dumps(payload["details"], ensure_ascii=False),
                    payload["changed_at"],
                ),
            )
            return

        if is_supabase_ready():
            get_supabase_client().table("master_runtime_settings_audit").insert(payload).execute()

    @classmethod
    def _next_release_version(cls) -> int:
        if is_db_ready():
            row = query_one("SELECT COALESCE(MAX(version), 0) AS version FROM master_runtime_config_releases")
            return int((row or {}).get("version") or 0) + 1

        if is_supabase_ready():
            response = (
                get_supabase_client()
                .table("master_runtime_config_releases")
                .select("version")
                .order("version", desc=True)
                .limit(1)
                .execute()
            )
            rows = response.data or []
            current = int(rows[0].get("version") or 0) if rows else 0
            return current + 1

        return 1

    @classmethod
    def _last_release_version(cls) -> int:
        if is_db_ready():
            row = query_one("SELECT COALESCE(MAX(version), 0) AS version FROM master_runtime_config_releases")
            return int((row or {}).get("version") or 0)

        if is_supabase_ready():
            response = (
                get_supabase_client()
                .table("master_runtime_config_releases")
                .select("version")
                .order("version", desc=True)
                .limit(1)
                .execute()
            )
            rows = response.data or []
            return int(rows[0].get("version") or 0) if rows else 0

        return 0

    @classmethod
    def _build_snapshot_from_rows(cls, rows: list[dict[str, Any]]) -> dict[str, Any]:
        snapshot: dict[str, Any] = {}
        for row in rows:
            key = str(row.get("setting_key") or "")
            if not key:
                continue
            snapshot[key] = {
                "value_current": row.get("value_current"),
                "category": row.get("category"),
                "env_key": row.get("env_key"),
                "is_secret": bool(row.get("is_secret")),
                "requires_restart": bool(row.get("requires_restart")),
                "data_type": row.get("data_type"),
            }
        return snapshot

    @classmethod
    def get_catalog(cls) -> list[dict[str, Any]]:
        return [
            {
                "key": item.key,
                "category": item.category,
                "env_key": item.env_key,
                "data_type": item.data_type,
                "is_secret": item.is_secret,
                "requires_restart": item.requires_restart,
                "description": item.description,
            }
            for item in cls.SETTINGS_CATALOG
        ]

    @classmethod
    def list_settings(cls) -> dict[str, Any]:
        cls._ensure_catalog_seeded()
        rows = cls._fetch_settings_rows()
        by_key = {str(item.get("setting_key") or ""): item for item in rows}

        items: list[dict[str, Any]] = []
        for spec in cls.SETTINGS_CATALOG:
            row = by_key.get(spec.key, {})

            current_stored = cls._decrypt_if_needed(row.get("value_current"), spec.is_secret)
            pending_stored = cls._decrypt_if_needed(row.get("value_pending"), spec.is_secret)

            env_value = os.getenv(spec.env_key)
            if env_value is None:
                env_value = current_app.config.get(spec.env_key)
            env_value = None if env_value is None else str(env_value)

            effective = pending_stored if pending_stored is not None else current_stored
            source = "pending" if pending_stored is not None else "stored"
            if effective is None:
                effective = env_value
                source = "env"

            items.append(
                {
                    "key": spec.key,
                    "category": spec.category,
                    "env_key": spec.env_key,
                    "data_type": spec.data_type,
                    "is_secret": spec.is_secret,
                    "requires_restart": spec.requires_restart,
                    "description": spec.description,
                    "value": effective,
                    "value_masked": cls._mask(effective, spec.is_secret),
                    "current_value_masked": cls._mask(current_stored, spec.is_secret),
                    "pending_value_masked": cls._mask(pending_stored, spec.is_secret),
                    "has_pending": pending_stored is not None,
                    "source": source,
                    "updated_by": row.get("updated_by"),
                    "updated_at": row.get("updated_at"),
                }
            )

        return {
            "version": cls._last_release_version(),
            "items": items,
        }

    @classmethod
    def save_pending(cls, setting_key: str, raw_value: Any, changed_by: str) -> dict[str, Any]:
        cls._ensure_catalog_seeded()
        spec = cls._catalog_map().get(setting_key)
        if not spec:
            raise ValueError("Configuração inválida")

        coerced = cls._coerce_value(spec, raw_value)
        cls._validate(spec, coerced)

        rows = cls._fetch_settings_rows()
        row = next((item for item in rows if str(item.get("setting_key") or "") == setting_key), None)
        if row is None:
            raise ValueError("Configuração não inicializada")

        current_plain = cls._decrypt_if_needed(row.get("value_current"), spec.is_secret)
        pending_plain = cls._decrypt_if_needed(row.get("value_pending"), spec.is_secret)

        encoded_pending = cls._encrypt_if_needed(coerced, spec.is_secret)
        cls._update_setting_values(setting_key, value_pending=encoded_pending, updated_by=changed_by)

        cls._insert_audit(
            setting_key=setting_key,
            action="DRAFT_UPDATE",
            old_masked=cls._mask(pending_plain if pending_plain is not None else current_plain, spec.is_secret),
            new_masked=cls._mask(coerced, spec.is_secret),
            changed_by=changed_by,
            details={"category": spec.category},
        )

        return {
            "key": setting_key,
            "category": spec.category,
            "value_masked": cls._mask(coerced, spec.is_secret),
            "has_pending": True,
        }

    @classmethod
    def publish_pending(cls, changed_by: str, notes: str | None = None) -> dict[str, Any]:
        cls._ensure_catalog_seeded()
        rows = cls._fetch_settings_rows()
        by_key = {str(item.get("setting_key") or ""): item for item in rows}

        changed_keys: list[str] = []
        restart_required_keys: list[str] = []

        version = cls._next_release_version()

        for spec in cls.SETTINGS_CATALOG:
            row = by_key.get(spec.key)
            if not row:
                continue
            pending_raw = row.get("value_pending")
            if pending_raw is None:
                continue

            changed_keys.append(spec.key)
            if spec.requires_restart:
                restart_required_keys.append(spec.key)

            cls._update_setting_values(
                spec.key,
                value_current=pending_raw,
                value_pending=None,
                published_version=version,
                updated_by=changed_by,
            )

            old_plain = cls._decrypt_if_needed(row.get("value_current"), spec.is_secret)
            new_plain = cls._decrypt_if_needed(pending_raw, spec.is_secret)
            cls._insert_audit(
                setting_key=spec.key,
                action="PUBLISH",
                old_masked=cls._mask(old_plain, spec.is_secret),
                new_masked=cls._mask(new_plain, spec.is_secret),
                changed_by=changed_by,
                version=version,
                details={"category": spec.category},
            )

        if not changed_keys:
            return {
                "version": cls._last_release_version(),
                "published": 0,
                "changed_keys": [],
                "requires_restart": [],
                "message": "Nenhuma alteração pendente para publicar.",
            }

        updated_rows = cls._fetch_settings_rows()
        snapshot = cls._build_snapshot_from_rows(updated_rows)
        cls._insert_release(version=version, action="publish", snapshot=snapshot, notes=notes, created_by=changed_by)

        cls.invalidate_cache()

        return {
            "version": version,
            "published": len(changed_keys),
            "changed_keys": changed_keys,
            "requires_restart": restart_required_keys,
            "message": "Alterações publicadas com sucesso.",
        }

    @classmethod
    def list_releases(cls, limit: int = 20) -> list[dict[str, Any]]:
        safe_limit = max(1, min(int(limit or 20), 100))
        if is_db_ready():
            return query_all(
                """
                SELECT version, action, notes, created_by, created_at
                FROM master_runtime_config_releases
                ORDER BY version DESC
                LIMIT %s
                """,
                (safe_limit,),
            )

        if is_supabase_ready():
            response = (
                get_supabase_client()
                .table("master_runtime_config_releases")
                .select("version,action,notes,created_by,created_at")
                .order("version", desc=True)
                .limit(safe_limit)
                .execute()
            )
            return response.data or []

        return []

    @classmethod
    def rollback_to_version(cls, version: int, changed_by: str, notes: str | None = None) -> dict[str, Any]:
        target_version = int(version)
        if target_version <= 0:
            raise ValueError("Versão inválida para rollback")

        if is_db_ready():
            row = query_one(
                "SELECT snapshot FROM master_runtime_config_releases WHERE version = %s",
                (target_version,),
            )
            snapshot = (row or {}).get("snapshot")
        elif is_supabase_ready():
            response = (
                get_supabase_client()
                .table("master_runtime_config_releases")
                .select("snapshot")
                .eq("version", target_version)
                .limit(1)
                .execute()
            )
            data = response.data or []
            snapshot = data[0].get("snapshot") if data else None
        else:
            snapshot = None

        if not snapshot:
            raise ValueError("Versão não encontrada")

        snapshot_map = snapshot if isinstance(snapshot, dict) else {}
        new_version = cls._next_release_version()

        for spec in cls.SETTINGS_CATALOG:
            item = snapshot_map.get(spec.key) or {}
            if "value_current" not in item:
                continue
            encoded_current = item.get("value_current")

            rows = cls._fetch_settings_rows()
            row = next((entry for entry in rows if str(entry.get("setting_key") or "") == spec.key), None)
            old_plain = None
            if row is not None:
                old_plain = cls._decrypt_if_needed(row.get("value_current"), spec.is_secret)

            new_plain = cls._decrypt_if_needed(encoded_current, spec.is_secret)
            cls._update_setting_values(
                spec.key,
                value_current=encoded_current,
                value_pending=None,
                published_version=new_version,
                updated_by=changed_by,
            )
            cls._insert_audit(
                setting_key=spec.key,
                action="ROLLBACK",
                old_masked=cls._mask(old_plain, spec.is_secret),
                new_masked=cls._mask(new_plain, spec.is_secret),
                changed_by=changed_by,
                version=new_version,
                details={"rollback_from_version": target_version},
            )

        refreshed = cls._fetch_settings_rows()
        new_snapshot = cls._build_snapshot_from_rows(refreshed)
        cls._insert_release(
            version=new_version,
            action="rollback",
            snapshot=new_snapshot,
            notes=notes or f"Rollback para versão {target_version}",
            created_by=changed_by,
        )

        cls.invalidate_cache()

        return {
            "version": new_version,
            "rollback_from": target_version,
            "message": "Rollback aplicado com sucesso.",
        }

    @classmethod
    def _resolved_values_by_env(cls) -> dict[str, Any]:
        now = time.time()
        if cls._cache_values_by_env and now < cls._cache_expire_at:
            return cls._cache_values_by_env

        cls._ensure_catalog_seeded()
        rows = cls._fetch_settings_rows()
        by_key = {str(item.get("setting_key") or ""): item for item in rows}

        values: dict[str, Any] = {}
        for spec in cls.SETTINGS_CATALOG:
            row = by_key.get(spec.key, {})
            current_plain = cls._decrypt_if_needed(row.get("value_current"), spec.is_secret)
            if current_plain is not None:
                values[spec.env_key] = current_plain

        cls._cache_values_by_env = values
        cls._cache_expire_at = now + cls._cache_ttl_seconds()
        return values

    @classmethod
    def get_runtime_value(cls, env_key: str, fallback: Any = None) -> Any:
        spec = cls._env_map().get(env_key)
        if not spec:
            return fallback

        values = cls._resolved_values_by_env()
        raw = values.get(env_key)
        if raw is None:
            from_env = os.getenv(env_key)
            if from_env is not None:
                raw = from_env
            else:
                raw = current_app.config.get(env_key)

        if raw is None:
            return fallback

        text = str(raw)
        if spec.data_type == "boolean":
            return text.strip().lower() in {"1", "true", "yes", "sim"}
        if spec.data_type == "number":
            try:
                return float(text)
            except Exception:
                return fallback
        if spec.data_type == "json":
            try:
                return json.loads(text)
            except Exception:
                return fallback
        return text

    @classmethod
    def test_category(cls, category: str, use_pending: bool = True) -> dict[str, Any]:
        normalized = str(category or "").strip().lower()
        if normalized not in {"proxy", "email", "whatsapp", "payments"}:
            raise ValueError("Categoria inválida para teste")

        cls._ensure_catalog_seeded()
        rows = cls._fetch_settings_rows()
        by_key = {str(item.get("setting_key") or ""): item for item in rows}
        values_by_env: dict[str, Any] = {}
        for spec in cls.SETTINGS_CATALOG:
            if spec.category != normalized:
                continue
            row = by_key.get(spec.key, {})
            pending_plain = cls._decrypt_if_needed(row.get("value_pending"), spec.is_secret)
            current_plain = cls._decrypt_if_needed(row.get("value_current"), spec.is_secret)
            selected = pending_plain if use_pending and pending_plain is not None else current_plain
            if selected is None:
                from_env = os.getenv(spec.env_key)
                selected = str(from_env) if from_env is not None else None
            if isinstance(selected, str):
                values_by_env[spec.env_key] = selected

        if normalized == "proxy":
            return cls._test_proxy(values_by_env)
        if normalized == "email":
            return cls._test_email(values_by_env)
        if normalized == "whatsapp":
            return cls._test_whatsapp(values_by_env)
        return cls._test_payments(values_by_env)

    @classmethod
    def _test_proxy(cls, values: dict[str, Any]) -> dict[str, Any]:
        supabase_url = str(current_app.config.get("SUPABASE_URL") or "").strip()
        if not supabase_url:
            return {"ok": False, "message": "SUPABASE_URL não configurada para teste de proxy"}

        http_proxy = str(values.get("HTTP_PROXY") or os.getenv("HTTP_PROXY") or "").strip()
        https_proxy = str(values.get("HTTPS_PROXY") or os.getenv("HTTPS_PROXY") or "").strip()

        proxies = {
            "http": http_proxy,
            "https": https_proxy,
        }
        try:
            response = requests.get(
                f"{supabase_url.rstrip('/')}/rest/v1/",
                timeout=8,
                proxies=proxies,
            )
            if response.status_code in {401, 403}:
                return {
                    "ok": True,
                    "message": "Conectividade validada: o proxy alcançou o Supabase com sucesso; o retorno indica apenas autenticação ausente no endpoint de teste.",
                    "details": {"status_code": response.status_code},
                }
            ok = response.status_code < 500
            return {
                "ok": ok,
                "message": f"Conectividade via proxy validada (HTTP {response.status_code}).",
                "details": {"status_code": response.status_code},
            }
        except requests.RequestException as exc:
            return {"ok": False, "message": f"Falha de proxy: {exc}"}

    @classmethod
    def _test_email(cls, values: dict[str, Any]) -> dict[str, Any]:
        base_url = str(values.get("RESEND_API_BASE_URL") or cls.get_runtime_value("RESEND_API_BASE_URL", "https://api.resend.com")).strip()
        api_key = str(values.get("RESEND_API_KEY") or cls.get_runtime_value("RESEND_API_KEY", "")).strip()
        from_address = str(values.get("EMAIL_FROM_ADDRESS") or cls.get_runtime_value("EMAIL_FROM_ADDRESS", "")).strip()

        if not from_address:
            return {"ok": False, "message": "EMAIL_FROM_ADDRESS não configurado"}

        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        try:
            response = requests.get(f"{base_url.rstrip('/')}/domains", headers=headers, timeout=8)
            ok = response.status_code < 500
            return {
                "ok": ok,
                "message": f"Resend acessível (HTTP {response.status_code})",
                "details": {"status_code": response.status_code},
            }
        except requests.RequestException as exc:
            return {"ok": False, "message": f"Falha de conectividade com Resend: {exc}"}

    @classmethod
    def _test_whatsapp(cls, values: dict[str, Any]) -> dict[str, Any]:
        base_url = str(values.get("EVOLUTION_API_BASE_URL") or cls.get_runtime_value("EVOLUTION_API_BASE_URL", "")).strip().rstrip("/")
        instance = str(values.get("EVOLUTION_INSTANCE") or cls.get_runtime_value("EVOLUTION_INSTANCE", "")).strip()

        if not base_url or not instance:
            return {"ok": False, "message": "EVOLUTION_API_BASE_URL/EVOLUTION_INSTANCE não configurados"}

        try:
            response = requests.get(base_url, timeout=8)
            ok = response.status_code < 500
            return {
                "ok": ok,
                "message": f"Evolution acessível (HTTP {response.status_code})",
                "details": {"status_code": response.status_code},
            }
        except requests.RequestException as exc:
            return {"ok": False, "message": f"Falha de conectividade com Evolution: {exc}"}

    @classmethod
    def _test_payments(cls, values: dict[str, Any]) -> dict[str, Any]:
        secret_key = str(values.get("STRIPE_SECRET_KEY") or cls.get_runtime_value("STRIPE_SECRET_KEY", "")).strip()
        webhook_secret = str(values.get("STRIPE_WEBHOOK_SECRET") or cls.get_runtime_value("STRIPE_WEBHOOK_SECRET", "")).strip()

        if not secret_key:
            return {"ok": False, "message": "STRIPE_SECRET_KEY não configurada"}
        if webhook_secret and not webhook_secret.startswith("whsec_"):
            return {"ok": False, "message": "STRIPE_WEBHOOK_SECRET inválida"}

        try:
            response = requests.get("https://api.stripe.com/v1/balance", auth=(secret_key, ""), timeout=8)
            ok = response.status_code < 500
            return {
                "ok": ok,
                "message": f"Stripe acessível (HTTP {response.status_code})",
                "details": {"status_code": response.status_code},
            }
        except requests.RequestException as exc:
            return {"ok": False, "message": f"Falha de conectividade com Stripe: {exc}"}
