from backend.repositories.agendamentos_repository import AgendamentosRepository


def _to_minutes(hhmm: str):
    if hasattr(hhmm, "hour") and hasattr(hhmm, "minute"):
        return int(getattr(hhmm, "hour")) * 60 + int(getattr(hhmm, "minute"))

    raw = str(hhmm or "").strip()
    if not raw:
        return 0

    parts = raw.split(":")
    if len(parts) < 2:
        raise ValueError(f"Horário inválido: {hhmm}")

    hh = int(parts[0])
    mm = int(parts[1])
    return hh * 60 + mm


def _to_hhmm(minutes: int):
    hh = minutes // 60
    mm = minutes % 60
    return f"{hh:02d}:{mm:02d}"


def has_conflict(slot_start: str, slot_end: str, existing_start: str, existing_end: str):
    slot_start_min = _to_minutes(slot_start)
    slot_end_min = _to_minutes(slot_end)
    existing_start_min = _to_minutes(existing_start)
    existing_end_min = _to_minutes(existing_end)
    return slot_start_min < existing_end_min and slot_end_min > existing_start_min


def calculate_available_slots(
    barbearia_id: str,
    profissional_id: str,
    data: str,
    duracao_min: int,
    opening: str = "09:00",
    closing: str = "18:00",
):
    agendamentos = AgendamentosRepository.list_by_date(barbearia_id, profissional_id, data)
    bloqueios = AgendamentosRepository.list_bloqueios_by_date(barbearia_id, profissional_id, data)

    existing_ranges = [
        (a["hora_inicio"], a["hora_fim"]) for a in agendamentos
    ] + [
        (b["hora_inicio"], b["hora_fim"]) for b in bloqueios
    ]

    available = []
    start = _to_minutes(opening)
    end = _to_minutes(closing)
    step = 15

    slot_start = start
    while slot_start + duracao_min <= end:
        slot_end = slot_start + duracao_min
        slot_start_hhmm = _to_hhmm(slot_start)
        slot_end_hhmm = _to_hhmm(slot_end)

        conflict = any(
            has_conflict(slot_start_hhmm, slot_end_hhmm, existing_start, existing_end)
            for existing_start, existing_end in existing_ranges
        )

        if not conflict:
            available.append({"hora_inicio": slot_start_hhmm, "hora_fim": slot_end_hhmm})

        slot_start += step

    return available
