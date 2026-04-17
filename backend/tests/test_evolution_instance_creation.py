from __future__ import annotations

import json
import time
from dataclasses import dataclass

import requests

EVOLUTION_BASE_URL = "https://gac-evolution.almg.gov.br"
EVOLUTION_API_KEY = "7f9c2a4d1e8b6f0a3c5d9e1f4a7b2c8d6e0f1a3b5c7d9e2f4a6b8c1d3e5f7a90"
EVOLUTION_API_KEY_HEADER = "apikey"
VERIFY_SSL = True
TIMEOUT_SECONDS = 30


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
