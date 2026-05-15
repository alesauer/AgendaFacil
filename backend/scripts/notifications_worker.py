#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
import time
from uuid import uuid4
from pathlib import Path

project_root = Path(__file__).resolve().parents[2]
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from backend.app import create_app
from backend.notifications.queue_processor import process_due_dispatches
from backend.services.marketing_leads_service import MarketingLeadsService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Worker de processamento da fila de notificações")
    parser.add_argument("--once", action="store_true", help="Processa somente um ciclo")
    parser.add_argument("--limit", type=int, default=50, help="Quantidade máxima por ciclo")
    parser.add_argument("--poll-seconds", type=int, default=10, help="Intervalo entre ciclos")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    app = create_app()
    worker_id = f"notifications-worker-{uuid4()}"

    with app.app_context():
        if args.once:
            notification_stats = process_due_dispatches(limit=args.limit, worker_id=worker_id)
            lead_stats = MarketingLeadsService.process_pending_warmup_dispatches(limit=args.limit)
            print({"notifications": notification_stats, "marketing_leads": lead_stats})
            return 0

        while True:
            notification_stats = process_due_dispatches(limit=args.limit, worker_id=worker_id)
            lead_stats = MarketingLeadsService.process_pending_warmup_dispatches(limit=args.limit)
            print({"notifications": notification_stats, "marketing_leads": lead_stats})
            time.sleep(max(1, args.poll_seconds))


if __name__ == "__main__":
    raise SystemExit(main())
