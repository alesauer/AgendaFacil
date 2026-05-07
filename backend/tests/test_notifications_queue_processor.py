import unittest
from unittest.mock import patch

from backend.notifications.queue_processor import process_due_dispatches


class NotificationQueueProcessorTests(unittest.TestCase):
    @patch("backend.notifications.queue_processor.NotificationsRepository.update_dispatch")
    @patch("backend.notifications.queue_processor.NotificationsRepository.get_active_provider_config")
    @patch("backend.notifications.queue_processor.NotificationsRepository.claim_dispatch")
    @patch("backend.notifications.queue_processor.NotificationsRepository.fetch_due_dispatches")
    @patch("backend.notifications.queue_processor.ProviderResolver")
    def test_process_due_dispatches_blocks_send_when_whatsapp_disabled(
        self,
        resolver_cls,
        fetch_due_dispatches_mock,
        claim_dispatch_mock,
        get_active_provider_config_mock,
        update_dispatch_mock,
    ):
        row = {
            "id": "disp_1",
            "barbearia_id": "barb_1",
            "updated_at": "2026-05-07T12:00:00+00:00",
            "attempts": 0,
            "max_attempts": 3,
            "channel": "WHATSAPP",
            "payload": {"client_name": "Cliente"},
            "recipient": "5531999999999",
            "template_key": "APPOINTMENT_CREATED",
            "idempotency_key": "idem-1",
            "correlation_id": "corr-1",
        }

        fetch_due_dispatches_mock.return_value = [row]
        claim_dispatch_mock.return_value = {"id": "disp_1"}
        get_active_provider_config_mock.return_value = {"config": {"alerts_enabled": False}}

        resolver_instance = resolver_cls.return_value

        stats = process_due_dispatches(limit=1, worker_id="worker-test")

        self.assertEqual(stats["processed"], 1)
        self.assertEqual(stats["failed"], 1)
        self.assertEqual(stats["sent"], 0)
        resolver_instance.resolve.assert_not_called()

        self.assertTrue(update_dispatch_mock.called)
        call_args = update_dispatch_mock.call_args_list[0].args
        self.assertEqual(call_args[0], "disp_1")
        self.assertEqual(call_args[1].get("error_code"), "CHANNEL_DISABLED")


if __name__ == "__main__":
    unittest.main()
