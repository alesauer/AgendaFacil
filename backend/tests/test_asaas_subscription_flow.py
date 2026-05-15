import unittest
from unittest.mock import patch

from backend.routes.asaas import _extract_cycle
from backend.services.asaas_service import _find_or_create_customer


class AsaasWebhookCycleTests(unittest.TestCase):
    def test_extract_cycle_returns_none_when_missing(self):
        payload = {"event": "PAYMENT_RECEIVED", "payment": {"id": "pay_1"}}
        self.assertIsNone(_extract_cycle(payload))

    def test_extract_cycle_normalizes_yearly(self):
        payload = {"subscription": {"cycle": "yearly"}}
        self.assertEqual(_extract_cycle(payload), "YEARLY")


class AsaasCustomerResolutionTests(unittest.TestCase):
    @patch("backend.services.asaas_service._http")
    def test_find_or_create_uses_existing_customer(self, http_mock):
        http_mock.side_effect = [
            {"data": [{"id": "cus_existing"}]},
        ]

        customer_id = _find_or_create_customer(
            email="cliente@teste.com",
            name="Cliente Teste",
            phone=None,
            external_reference="demo",
            document="12345678901",
        )

        self.assertEqual(customer_id, "cus_existing")
        self.assertEqual(http_mock.call_count, 1)
        first_call = http_mock.call_args_list[0]
        self.assertEqual(first_call.args[0], "GET")
        self.assertEqual(first_call.args[1], "/customers")

    @patch("backend.services.asaas_service._http")
    def test_find_or_create_creates_customer_when_not_found(self, http_mock):
        http_mock.side_effect = [
            {"data": []},
            {"data": []},
            {"data": []},
            {"id": "cus_created"},
        ]

        customer_id = _find_or_create_customer(
            email="novo@teste.com",
            name="Novo Cliente",
            phone="31999999999",
            external_reference="tenant-x",
            document="10987654321",
        )

        self.assertEqual(customer_id, "cus_created")
        self.assertEqual(http_mock.call_count, 4)
        last_call = http_mock.call_args_list[-1]
        self.assertEqual(last_call.args[0], "POST")
        self.assertEqual(last_call.args[1], "/customers")

    @patch("backend.services.asaas_service._http")
    def test_find_or_create_fallbacks_after_duplicate_error(self, http_mock):
        http_mock.side_effect = [
            {"data": []},
            {"data": []},
            {"data": []},
            ValueError("Asaas: Já existe um cliente com esse CPF/CNPJ"),
            {"data": [{"id": "cus_recovered"}]},
        ]

        customer_id = _find_or_create_customer(
            email="duplicado@teste.com",
            name="Cliente Duplicado",
            phone=None,
            external_reference="tenant-y",
            document="01234567890",
        )

        self.assertEqual(customer_id, "cus_recovered")


if __name__ == "__main__":
    unittest.main()
