from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

EVOLUTION_BASE_URL = os.getenv("EVOLUTION_API_BASE_URL", "").strip()
EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "").strip()
EVOLUTION_API_KEY_HEADER = os.getenv("EVOLUTION_API_KEY_HEADER", "apikey").strip() or "apikey"
VERIFY_SSL = os.getenv("EVOLUTION_VERIFY_SSL", "true").strip().lower() != "false"
TIMEOUT_SECONDS = int(os.getenv("EVOLUTION_HTTP_TIMEOUT_SECONDS", "30"))


@dataclass
class EvolutionCreateResult:
    ok: bool
    status_code: int
    message: str
    body: dict | str


def create_instance(base_url: str, api_key: str, instance_name: str) -> EvolutionCreateResult:
    url = f"{base_url.rstrip('/')}/instance/create"
    headers = {
        "Content-Type": "application/json",
        EVOLUTION_API_KEY_HEADER: api_key,
    }
    payload = {
        "instanceName": instance_name,
        "qrcode": True,
        "integration": "WHATSAPP-BAILEYS",
    }

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=TIMEOUT_SECONDS,
            verify=VERIFY_SSL,
        )
    except requests.RequestException as exc:
        return EvolutionCreateResult(
            ok=False,
            status_code=0,
            message=str(exc),
            body={"error": str(exc)},
        )

    try:
        parsed = response.json() if response.text else {}
    except ValueError:
        parsed = response.text

    if response.status_code in (200, 201):
        return EvolutionCreateResult(
            ok=True,
            status_code=response.status_code,
            message="Instância criada com sucesso",
            body=parsed,
        )

    message = "Falha ao criar instância"
    if isinstance(parsed, dict):
        message = str(parsed.get("message") or parsed.get("error") or message)

    return EvolutionCreateResult(
        ok=False,
        status_code=response.status_code,
        message=message,
        body=parsed,
    )


def run_test() -> int:
    if not EVOLUTION_BASE_URL or not EVOLUTION_API_KEY:
        print("Variáveis obrigatórias ausentes: EVOLUTION_API_BASE_URL e/ou EVOLUTION_API_KEY")
        return 1

    instance_name = f"agf-test-{int(time.time())}"
    result = create_instance(
        base_url=EVOLUTION_BASE_URL,
        api_key=EVOLUTION_API_KEY,
        instance_name=instance_name,
    )

    print("=== Evolution Instance Create Test ===")
    print(f"base_url: {EVOLUTION_BASE_URL}")
    print(f"instance_name: {instance_name}")
    print(f"status_code: {result.status_code}")
    print(f"ok: {result.ok}")
    print(f"message: {result.message}")
    print("body:")
    print(json.dumps(result.body, ensure_ascii=False, indent=2) if isinstance(result.body, dict) else str(result.body))

    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(run_test())
