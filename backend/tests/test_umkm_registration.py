import os
import re
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from pydantic import ValidationError
from starlette.requests import Request

from backend import server


class UmkmRegistrationFlowTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_database = server.db
        engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        server.db = server.Database(engine)
        await server.db.create_schema()

    async def asyncTearDown(self):
        await server.db.dispose()
        server.db = self.original_database

    @staticmethod
    def request_from(client_host):
        return Request({
            "type": "http",
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/admin/umkm-registrations/test/approve",
            "raw_path": b"/api/admin/umkm-registrations/test/approve",
            "query_string": b"",
            "headers": [],
            "client": (client_host, 12345),
            "server": ("127.0.0.1", 8001),
        })

    async def create_registration(self):
        await server.submit_umkm_registration(
            server.UmkmRegistrationIn(
                owner_name="Pemilik Uji",
                store_name="Toko Uji",
                email="pemilik@example.com",
                phone="081234567890",
                business_address="Jalan Uji No. 1",
                password="password-aman-123",
            )
        )
        return await server.db.umkm_registration_requests.get_one(
            {"email": "pemilik@example.com"}
        )

    async def test_dev_approval_returns_link_only_to_local_admin(self):
        registration = await self.create_registration()
        settings = {
            "UMKM_REGISTRATION_DEV_LINK": "true",
            "FRONTEND_URL": "http://localhost:5173",
            "SMTP_HOST": "",
            "SMTP_FROM": "",
            "SMTP_USERNAME": "",
        }
        with patch.dict(os.environ, settings):
            result = await server.approve_umkm_registration(
                registration["id"],
                self.request_from("127.0.0.1"),
                {"id": "admin-registration-test", "role": "admin"},
            )

        self.assertFalse(result["email_sent"])
        self.assertIn("/complete-registration?token=", result["development_link"])
        updated = await server.db.umkm_registration_requests.get_one(
            {"id": registration["id"]}
        )
        self.assertEqual(updated["status"], "AWAITING_DETAILS")

    async def test_dev_approval_does_not_expose_link_to_remote_admin(self):
        registration = await self.create_registration()
        settings = {
            "UMKM_REGISTRATION_DEV_LINK": "true",
            "SMTP_HOST": "",
            "SMTP_FROM": "",
            "SMTP_USERNAME": "",
        }
        with patch.dict(os.environ, settings):
            with self.assertRaisesRegex(server.HTTPException, "harus dikonfigurasi"):
                await server.approve_umkm_registration(
                    registration["id"],
                    self.request_from("192.0.2.10"),
                    {"id": "admin-registration-test", "role": "admin"},
                )

        updated = await server.db.umkm_registration_requests.get_one(
            {"id": registration["id"]}
        )
        self.assertEqual(updated["status"], "PENDING_ADMIN")

    async def test_admin_approval_email_verification_activates_umkm(self):
        smtp_settings = {
            "SMTP_HOST": "smtp.example.test",
            "SMTP_PORT": "587",
            "SMTP_USERNAME": "mailer@example.test",
            "SMTP_PASSWORD": "test-password",
            "SMTP_FROM": "mailer@example.test",
            "SMTP_USE_TLS": "true",
            "SMTP_USE_SSL": "false",
            "FRONTEND_URL": "http://localhost:5173",
        }
        with patch.dict(os.environ, smtp_settings), patch.object(server, "send_email") as send_email:
            response = await server.submit_umkm_registration(
                server.UmkmRegistrationIn(
                    owner_name="Pemilik Uji",
                    store_name="Toko Uji",
                    email="pemilik@example.com",
                    phone="081234567890",
                    business_address="Jalan Uji No. 1",
                    password="password-aman-123",
                )
            )
            self.assertTrue(response["ok"])
            registration = await server.db.umkm_registration_requests.get_one(
                {"email": "pemilik@example.com"}
            )
            self.assertEqual(registration["status"], "PENDING_ADMIN")
            self.assertIsNone(await server.db.users.get_one({"email": "pemilik@example.com"}))

            admin = {"id": "admin-registration-test", "role": "admin"}
            await server.approve_umkm_registration(
                registration["id"], self.request_from("127.0.0.1"), admin
            )
            continuation_link = send_email.call_args.args[2].splitlines()
            link = next(line for line in continuation_link if "/complete-registration?" in line)
            token = re.search(r"[?&]token=([^\s]+)", link).group(1)

            await server.submit_umkm_registration_details(
                server.UmkmRegistrationDetailsIn(
                    token=token,
                    bank_name="Bank NTT",
                    bank_account_number="1234567890",
                    bank_account_name="Pemilik Uji",
                )
            )
            otp_body = send_email.call_args.args[2]
            code = re.search(r"\b(\d{6})\b", otp_body).group(1)
            result = await server.verify_umkm_registration_email(
                server.UmkmRegistrationVerifyIn(token=token, code=code)
            )

        self.assertIn("aktif", result["message"])
        account = await server.db.users.get_one({"email": "pemilik@example.com"})
        self.assertEqual(account["name"], "Pemilik Uji")
        self.assertEqual(account["role"], "umkm")
        self.assertTrue(server.verify_password("password-aman-123", account["password_hash"]))

        umkm = await server.db.umkms.get_one({"id": account["umkm_id"]})
        self.assertEqual(umkm["address"], "Jalan Uji No. 1")
        payout = await server.db.umkm_payout_accounts.get_one({"umkm_id": account["umkm_id"]})
        self.assertEqual(payout["verification_status"], "PENDING_VERIFICATION")
        self.assertEqual(payout["bank_name"], "Bank NTT")

        login = await server.login(server.LoginIn(
            email="pemilik@example.com",
            password="password-aman-123",
        ))
        self.assertEqual(login["user"]["role"], "umkm")

    async def test_registration_cannot_be_submitted_twice_before_review(self):
        registration = server.UmkmRegistrationIn(
            owner_name="Pemilik Uji",
            store_name="Toko Uji",
            email="pemilik@example.com",
            phone="081234567890",
            business_address="Jalan Uji No. 1",
            password="password-aman-123",
        )
        await server.submit_umkm_registration(registration)

        with self.assertRaisesRegex(server.HTTPException, "sudah pernah dikirim"):
            await server.submit_umkm_registration(registration)

    async def test_admin_rejection_requires_and_emails_reason(self):
        await server.submit_umkm_registration(
            server.UmkmRegistrationIn(
                owner_name="Pemilik Uji",
                store_name="Toko Uji",
                email="pemilik@example.com",
                phone="081234567890",
                business_address="Jalan Uji No. 1",
                password="password-aman-123",
            )
        )
        registration = await server.db.umkm_registration_requests.get_one(
            {"email": "pemilik@example.com"}
        )
        with self.assertRaises(ValidationError):
            server.UmkmRegistrationDecisionIn(reason="  ")

        smtp_settings = {
            "SMTP_HOST": "smtp.example.test",
            "SMTP_PORT": "587",
            "SMTP_USERNAME": "mailer@example.test",
            "SMTP_FROM": "mailer@example.test",
        }
        with patch.dict(os.environ, smtp_settings), patch.object(server, "send_email") as send_email:
            await server.reject_umkm_registration(
                registration["id"],
                server.UmkmRegistrationDecisionIn(reason="Alamat usaha tidak lengkap"),
                {"id": "admin-registration-test", "role": "admin"},
            )

        updated = await server.db.umkm_registration_requests.get_one(
            {"id": registration["id"]}
        )
        self.assertEqual(updated["status"], "REJECTED")
        self.assertEqual(updated["rejection_reason"], "Alamat usaha tidak lengkap")
        self.assertIn("Alamat usaha tidak lengkap", send_email.call_args.args[2])

    async def test_invalid_email_code_does_not_activate_account(self):
        smtp_settings = {
            "SMTP_HOST": "smtp.example.test",
            "SMTP_PORT": "587",
            "SMTP_USERNAME": "mailer@example.test",
            "SMTP_FROM": "mailer@example.test",
            "FRONTEND_URL": "http://localhost:5173",
        }
        with patch.dict(os.environ, smtp_settings), patch.object(server, "send_email") as send_email:
            await server.submit_umkm_registration(
                server.UmkmRegistrationIn(
                    owner_name="Pemilik Uji",
                    store_name="Toko Uji",
                    email="pemilik@example.com",
                    phone="081234567890",
                    business_address="Jalan Uji No. 1",
                    password="password-aman-123",
                )
            )
            registration = await server.db.umkm_registration_requests.get_one(
                {"email": "pemilik@example.com"}
            )
            admin = {"id": "admin-registration-test", "role": "admin"}
            await server.approve_umkm_registration(
                registration["id"], self.request_from("127.0.0.1"), admin
            )
            continuation_email = send_email.call_args.args[2]
            token = re.search(
                r"/complete-registration\?token=([^\s]+)", continuation_email
            ).group(1)
            await server.submit_umkm_registration_details(
                server.UmkmRegistrationDetailsIn(
                    token=token,
                    bank_name="BRI",
                    bank_account_number="1234567890",
                    bank_account_name="Pemilik Uji",
                )
            )
            sent_code = re.search(
                r"\b(\d{6})\b", send_email.call_args.args[2]
            ).group(1)

        with self.assertRaisesRegex(server.HTTPException, "tidak valid"):
            await server.verify_umkm_registration_email(
                server.UmkmRegistrationVerifyIn(
                    token=token,
                    code=f"{(int(sent_code) + 1) % 1_000_000:06d}",
                )
            )
        self.assertIsNone(await server.db.users.get_one({"email": "pemilik@example.com"}))


if __name__ == "__main__":
    unittest.main()
