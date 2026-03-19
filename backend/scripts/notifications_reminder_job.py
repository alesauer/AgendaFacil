#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parents[2]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.app import create_app
from backend.notifications.agenda_events import enqueue_reminders_d1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Enfileira lembretes D-1 para agendamentos")
    parser.add_argument("--barbearia-id", default="", help="ID da barbearia (opcional)")
    parser.add_argument("--slug", default="", help="Slug da barbearia (opcional)")
    return parser.parse_args()


def _resolve_tenant_id(slug: str, explicit_id: str) -> str:
    if explicit_id:
        return explicit_id

    from backend.supabase_client import get_supabase_client

    supabase = get_supabase_client()
    if slug:
        response = (
            supabase.table("barbearias")
            .select("id")
            .eq("slug", slug)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        if not rows:
            raise RuntimeError(f"Barbearia não encontrada para slug={slug}")
        return str(rows[0]["id"])

    response = supabase.table("barbearias").select("id").range(0, 1).execute()
    rows = response.data or []
    if not rows:
        raise RuntimeError("Nenhuma barbearia encontrada")
    if len(rows) > 1:
        raise RuntimeError("Há mais de uma barbearia; informe --barbearia-id ou --slug")
    return str(rows[0]["id"])


def main() -> int:
    args = parse_args()
    app = create_app()

    with app.app_context():
        tenant_id = _resolve_tenant_id(args.slug.strip(), args.barbearia_id.strip())
        stats = enqueue_reminders_d1(tenant_id)
        print({"barbearia_id": tenant_id, **stats})

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
