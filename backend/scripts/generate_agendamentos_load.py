#!/usr/bin/env python3
from __future__ import annotations

import argparse
import random
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import Client, ClientOptions, create_client


DEFAULT_HORARIOS = {
    1: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "19:00"},
    2: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "19:00"},
    3: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "19:00"},
    4: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "19:00"},
    5: {"aberto": True, "hora_inicio": "09:00", "hora_fim": "20:00"},
    6: {"aberto": True, "hora_inicio": "08:00", "hora_fim": "18:00"},
    0: {"aberto": False, "hora_inicio": "00:00", "hora_fim": "00:00"},
}

PAST_STATUS_POOL = [
    ("COMPLETED_FIN", 45),
    ("COMPLETED_OP", 30),
    ("NO_SHOW", 10),
    ("CANCELLED", 15),
]


@dataclass(frozen=True)
class ServiceItem:
    id: str
    duracao_min: int


def to_minutes(hhmm: str) -> int:
    raw = str(hhmm or "").strip()
    parts = raw.split(":")
    if len(parts) < 2:
        raise ValueError(f"Horário inválido: {hhmm}")
    return int(parts[0]) * 60 + int(parts[1])


def to_hhmm(minutes: int) -> str:
    hh = minutes // 60
    mm = minutes % 60
    return f"{hh:02d}:{mm:02d}"


def overlaps(start_a: int, end_a: int, start_b: int, end_b: int) -> bool:
    return start_a < end_b and end_a > start_b


def weekday_supabase(d: date) -> int:
    weekday = d.weekday() + 1
    return 0 if weekday == 7 else weekday


def weighted_choice(pairs: list[tuple[str, int]], rng: random.Random) -> str:
    values = [item[0] for item in pairs]
    weights = [item[1] for item in pairs]
    return rng.choices(values, weights=weights, k=1)[0]


def build_supabase_client() -> Client:
    backend_dir = Path(__file__).resolve().parents[1]
    load_dotenv(backend_dir / ".env")

    import os

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_KEY", "").strip()

    if not url or not key:
        raise RuntimeError("SUPABASE_URL/SUPABASE_KEY não configurados no backend/.env")

    options = ClientOptions(postgrest_client_timeout=20)
    return create_client(url, key, options)


def fetch_all_rows(
    client: Client,
    table: str,
    select_cols: str,
    eq_filters: dict[str, Any] | None = None,
    extra_filters: list[tuple[str, str, Any]] | None = None,
    page_size: int = 1000,
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    start = 0

    while True:
        query = client.table(table).select(select_cols).range(start, start + page_size - 1)

        if eq_filters:
            for key, value in eq_filters.items():
                query = query.eq(key, value)

        if extra_filters:
            for op, field, value in extra_filters:
                if op == "gte":
                    query = query.gte(field, value)
                elif op == "lte":
                    query = query.lte(field, value)
                elif op == "neq":
                    query = query.neq(field, value)
                elif op == "gt":
                    query = query.gt(field, value)
                elif op == "lt":
                    query = query.lt(field, value)
                else:
                    raise ValueError(f"Operador de filtro não suportado: {op}")

        response = query.execute()
        data = response.data or []
        if not data:
            break

        results.extend(data)
        if len(data) < page_size:
            break

        start += page_size

    return results


def resolve_tenant(client: Client, barbearia_id: str | None, slug: str | None) -> dict[str, Any]:
    if barbearia_id:
        response = (
            client.table("barbearias")
            .select("id,slug,nome")
            .eq("id", barbearia_id)
            .limit(1)
            .execute()
        )
        data = response.data or []
        if not data:
            raise RuntimeError(f"Barbearia não encontrada para id={barbearia_id}")
        return data[0]

    if slug:
        response = (
            client.table("barbearias")
            .select("id,slug,nome")
            .eq("slug", slug)
            .limit(1)
            .execute()
        )
        data = response.data or []
        if not data:
            raise RuntimeError(f"Barbearia não encontrada para slug={slug}")
        return data[0]

    rows = client.table("barbearias").select("id,slug,nome").range(0, 1).execute().data or []
    if not rows:
        raise RuntimeError("Nenhuma barbearia encontrada")

    if len(rows) > 1:
        raise RuntimeError("Há mais de uma barbearia; informe --barbearia-id ou --slug")

    return rows[0]


def ensure_horarios_map(rows: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    mapped = {
        int(item["dia_semana"]): {
            "aberto": bool(item.get("aberto")),
            "hora_inicio": str(item.get("hora_inicio") or "00:00")[:5],
            "hora_fim": str(item.get("hora_fim") or "00:00")[:5],
        }
        for item in rows
    }

    for day, fallback in DEFAULT_HORARIOS.items():
        mapped.setdefault(day, fallback)

    return mapped


def build_initial_occupancy(
    existing_agendamentos: list[dict[str, Any]],
    bloqueios: list[dict[str, Any]],
) -> dict[tuple[str, str], list[tuple[int, int]]]:
    occupancy: dict[tuple[str, str], list[tuple[int, int]]] = defaultdict(list)

    for item in existing_agendamentos:
        profissional_id = str(item["profissional_id"])
        data = str(item["data"])
        status = str(item.get("status") or "").upper()
        if status == "CANCELLED":
            continue

        start = to_minutes(str(item["hora_inicio"])[:5])
        end = to_minutes(str(item["hora_fim"])[:5])
        occupancy[(profissional_id, data)].append((start, end))

    for item in bloqueios:
        profissional_id = str(item["profissional_id"])
        data = str(item["data"])
        start = to_minutes(str(item["hora_inicio"])[:5])
        end = to_minutes(str(item["hora_fim"])[:5])
        occupancy[(profissional_id, data)].append((start, end))

    for key in occupancy:
        occupancy[key].sort(key=lambda pair: pair[0])

    return occupancy


def slot_fits(
    occupied: list[tuple[int, int]],
    start: int,
    end: int,
) -> bool:
    for existing_start, existing_end in occupied:
        if overlaps(start, end, existing_start, existing_end):
            return False
    return True


def pick_status_for_day(day: date, today: date, rng: random.Random) -> str:
    if day > today:
        return "PENDING_PAYMENT"
    if day == today:
        return weighted_choice(PAST_STATUS_POOL, rng)
    return weighted_choice(PAST_STATUS_POOL, rng)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gera carga de agendamentos aleatórios sem conflito para uma janela de 30 dias atrás e 30 dias à frente.",
    )
    parser.add_argument("--barbearia-id", help="ID da barbearia alvo", default=None)
    parser.add_argument("--slug", help="Slug da barbearia alvo", default=None)
    parser.add_argument("--target", type=int, default=900, help="Quantidade máxima de agendamentos a inserir")
    parser.add_argument("--window-days", type=int, default=30, help="Janela em dias para trás e para frente")
    parser.add_argument("--step-min", type=int, default=15, help="Passo de grade em minutos")
    parser.add_argument("--seed", type=int, default=20260319, help="Seed para aleatoriedade reproduzível")
    parser.add_argument("--batch-size", type=int, default=200, help="Tamanho do lote para inserção")
    parser.add_argument("--dry-run", action="store_true", help="Apenas simula sem inserir")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    rng = random.Random(args.seed)

    if args.target <= 0:
        print("target deve ser > 0", file=sys.stderr)
        return 1

    if args.window_days < 0:
        print("window-days deve ser >= 0", file=sys.stderr)
        return 1

    if args.step_min <= 0:
        print("step-min deve ser > 0", file=sys.stderr)
        return 1

    try:
        client = build_supabase_client()
        tenant = resolve_tenant(client, args.barbearia_id, args.slug)
        tenant_id = str(tenant["id"])

        today = date.today()
        start_date = today - timedelta(days=args.window_days)
        end_date = today + timedelta(days=args.window_days)

        clients = fetch_all_rows(
            client,
            "clientes",
            "id",
            eq_filters={"barbearia_id": tenant_id},
        )
        professionals_raw = fetch_all_rows(
            client,
            "profissionais",
            "id,ativo",
            eq_filters={"barbearia_id": tenant_id},
        )
        professionals = [str(item["id"]) for item in professionals_raw if bool(item.get("ativo", True))]

        services_raw = fetch_all_rows(
            client,
            "servicos",
            "id,duracao_min",
            eq_filters={"barbearia_id": tenant_id},
            extra_filters=[("gt", "duracao_min", 0)],
        )
        services = [
            ServiceItem(id=str(item["id"]), duracao_min=int(item["duracao_min"]))
            for item in services_raw
            if int(item.get("duracao_min") or 0) > 0
        ]

        horarios_rows = fetch_all_rows(
            client,
            "barbearia_horarios_funcionamento",
            "dia_semana,aberto,hora_inicio,hora_fim",
            eq_filters={"barbearia_id": tenant_id},
        )
        horarios_map = ensure_horarios_map(horarios_rows)

        existing_agendamentos = fetch_all_rows(
            client,
            "agendamentos",
            "profissional_id,data,hora_inicio,hora_fim,status",
            eq_filters={"barbearia_id": tenant_id},
            extra_filters=[("gte", "data", start_date.isoformat()), ("lte", "data", end_date.isoformat())],
        )

        bloqueios = fetch_all_rows(
            client,
            "bloqueios",
            "profissional_id,data,hora_inicio,hora_fim",
            eq_filters={"barbearia_id": tenant_id},
            extra_filters=[("gte", "data", start_date.isoformat()), ("lte", "data", end_date.isoformat())],
        )

        if not clients:
            raise RuntimeError("Nenhum cliente encontrado para a barbearia")
        if not professionals:
            raise RuntimeError("Nenhum profissional ativo encontrado para a barbearia")
        if not services:
            raise RuntimeError("Nenhum serviço com duração válida encontrado para a barbearia")

        occupancy = build_initial_occupancy(existing_agendamentos, bloqueios)

        all_dates: list[date] = []
        d = start_date
        while d <= end_date:
            all_dates.append(d)
            d += timedelta(days=1)

        slot_capacity = 0
        for day in all_dates:
            weekday = weekday_supabase(day)
            config = horarios_map[weekday]
            if not bool(config.get("aberto")):
                continue

            start_min = to_minutes(config["hora_inicio"])
            end_min = to_minutes(config["hora_fim"])
            if end_min <= start_min:
                continue

            base_slots = max(0, (end_min - start_min) // args.step_min)
            slot_capacity += base_slots * len(professionals)

        if slot_capacity <= 0:
            raise RuntimeError("Sem capacidade de horários na janela informada")

        target_total = min(args.target, slot_capacity)

        generated: list[dict[str, Any]] = []
        attempts = 0
        max_attempts = max(3000, target_total * 20)

        while len(generated) < target_total and attempts < max_attempts:
            attempts += 1
            day = rng.choice(all_dates)
            weekday = weekday_supabase(day)
            config = horarios_map[weekday]
            if not bool(config.get("aberto")):
                continue

            prof_id = rng.choice(professionals)
            service = rng.choice(services)
            duration = service.duracao_min

            start_min = to_minutes(config["hora_inicio"])
            end_min = to_minutes(config["hora_fim"])
            if end_min <= start_min:
                continue

            latest_start = end_min - duration
            if latest_start < start_min:
                continue

            key = (prof_id, day.isoformat())
            occupied = occupancy.get(key, [])

            possible_starts = list(range(start_min, latest_start + 1, args.step_min))
            rng.shuffle(possible_starts)

            selected_start = None
            selected_end = None
            for candidate_start in possible_starts:
                candidate_end = candidate_start + duration
                if slot_fits(occupied, candidate_start, candidate_end):
                    selected_start = candidate_start
                    selected_end = candidate_end
                    break

            if selected_start is None or selected_end is None:
                continue

            client_id = str(rng.choice(clients)["id"])
            status = pick_status_for_day(day, today, rng)

            generated.append(
                {
                    "barbearia_id": tenant_id,
                    "cliente_id": client_id,
                    "profissional_id": prof_id,
                    "servico_id": service.id,
                    "data": day.isoformat(),
                    "hora_inicio": to_hhmm(selected_start),
                    "hora_fim": to_hhmm(selected_end),
                    "status": status,
                }
            )

            occupied.append((selected_start, selected_end))
            occupied.sort(key=lambda pair: pair[0])
            occupancy[key] = occupied

        if not generated:
            print("Nenhum agendamento gerado. Ajuste target/janela/parâmetros.")
            return 0

        print("Resumo da geração")
        print(f"- Barbearia: {tenant.get('nome') or tenant_id} ({tenant_id})")
        print(f"- Janela: {start_date.isoformat()} até {end_date.isoformat()}")
        print(f"- Solicitado: {args.target}")
        print(f"- Gerado: {len(generated)}")
        print(f"- Tentativas: {attempts}")
        print(f"- Dry-run: {'sim' if args.dry_run else 'não'}")

        if args.dry_run:
            return 0

        inserted = 0
        skipped_conflict = 0

        for item in generated:
            try:
                response = client.table("agendamentos").insert(item, default_to_null=False).execute()
                data = response.data or []
                if data:
                    inserted += 1
                else:
                    skipped_conflict += 1
            except Exception as insert_error:
                message = str(insert_error).lower()
                if "duplicate key" in message or "uq_agendamentos_profissional_data_hora" in message:
                    skipped_conflict += 1
                    continue
                raise

        print("Resultado da inserção")
        print(f"- Inseridos: {inserted}")
        print(f"- Não inseridos: {skipped_conflict}")

        return 0

    except Exception as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
