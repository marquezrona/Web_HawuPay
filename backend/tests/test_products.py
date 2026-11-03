import unittest

from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool
from fastapi import HTTPException

from backend import server


class ProductBarcodeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_database = server.db
        engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        server.db = server.Database(engine)
        await server.db.create_schema()
        self.user = {"id": "barcode-cashier", "role": "umkm", "umkm_id": "barcode-umkm"}

    async def asyncTearDown(self):
        await server.db.dispose()
        server.db = self.original_database

    async def test_product_barcode_is_normalized_and_unique_per_store(self):
        product = await server.create_product(
            server.ProductIn(name="Produk Barcode", price=100, barcode=" 012abc "),
            self.user,
        )
        self.assertEqual(product["barcode"], "012ABC")

        with self.assertRaises(HTTPException) as duplicate:
            await server.create_product(
                server.ProductIn(name="Produk Duplikat", price=200, barcode="012ABC"),
                self.user,
            )
        self.assertEqual(duplicate.exception.status_code, 409)

        with self.assertRaises(IntegrityError):
            await server.db.products.insert({
                "id": "duplicate-barcode-product",
                "umkm_id": self.user["umkm_id"],
                "name": "Produk Duplikat",
                "price": 200,
                "stock": 1,
                "barcode": "012ABC",
                "created_at": server.now_iso(),
            })
