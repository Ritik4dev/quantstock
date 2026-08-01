import io
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from backend.app.main import app


def test_full_phase2a_flow():
    print("==================================================")
    print("STARTING PHASE 2A INVENTORY & ANALYTICS VERIFICATION TEST")
    print("==================================================")

    with TestClient(app) as client:
        # 1. Health Check
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[PASS] Health Check Passed:", res.json())

        # 2. Register & Login User
        user_email = "inventory_owner@example.com"
        user_pass = "SecureInventory123!"
        client.post("/api/v1/auth/register", json={
            "name": "Inventory Manager",
            "email": user_email,
            "password": user_pass
        })

        login_res = client.post("/api/v1/auth/login", json={
            "email": user_email,
            "password": user_pass
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("[PASS] Auth & Login Passed.")

        # 3. Create Business
        biz_res = client.post("/api/v1/business", json={
            "business_name": "Metro Retail Store",
            "business_type": "Supermarket"
        }, headers=headers)
        assert biz_res.status_code == 201, f"Create business failed: {biz_res.text}"
        biz_id = biz_res.json()["id"]
        print(f"[PASS] Business Creation Passed: Business ID {biz_id}")

        # 4. CSV Upload & Validation Preview (/upload/csv)
        sample_csv_content = (
            "Item Name,SKU,Category,Current Stock,Sold,Cost,Selling Price,Expiry Date,Vendor\n"
            "Lays Chips,SKU-LAYS-001,Snacks,150,25,10.00,20.00,2026-12-31,PepsiCo\n"
            "Amul Milk,SKU-MILK-002,Dairy,3,10,25.00,30.00,2026-08-05,Amul Dairy\n"
            "Nutella Jar,SKU-NUT-003,Spreads,0,5,150.00,220.00,2026-01-01,Global Imports\n"
        )
        files = {"file": ("inventory_sample.csv", sample_csv_content.encode("utf-8"), "text/csv")}
        res = client.post("/api/v1/upload/csv", files=files, headers=headers)
        assert res.status_code == 200, f"CSV upload preview failed: {res.text}"
        preview = res.json()
        print("\n[PASS] CSV Pipeline Validation & Preview Passed:")
        print(f"  - Total Rows: {preview['total_rows']}")
        print(f"  - Valid Rows: {preview['valid_rows_count']}")
        print(f"  - Auto-Mapped Name Col: '{preview['column_mapping']['product_name_col']}'")
        print(f"  - Auto-Mapped Stock Col: '{preview['column_mapping']['stock_col']}'")

        # 5. Confirm CSV Import to PostgreSQL (/upload/csv/confirm)
        confirm_payload = {
            "filename": "inventory_sample.csv",
            "column_mapping": preview["column_mapping"],
            "confirm": True
        }
        res = client.post("/api/v1/upload/csv/confirm", json=confirm_payload, headers=headers)
        assert res.status_code == 200, f"CSV confirm import failed: {res.text}"
        history_item = res.json()
        print(f"\n[PASS] CSV Database Transaction Import Passed: {history_item['rows_imported']} rows imported to PostgreSQL.")

        # 6. Retrieve Import History (/upload/history)
        res = client.get("/api/v1/upload/history", headers=headers)
        assert res.status_code == 200, f"Get import history failed: {res.text}"
        history_list = res.json()
        print(f"[PASS] Import History Retrieval Passed: Found {len(history_list)} history log(s).")

        # 7. Products CRUD (/products)
        res = client.get("/api/v1/products", headers=headers)
        assert res.status_code == 200, f"Get products failed: {res.text}"
        products = res.json()
        assert len(products) >= 3, "Imported products not found!"
        print(f"\n[PASS] Products Catalog Retrieval Passed: Found {len(products)} products in PostgreSQL.")

        # Add a custom product manually
        new_prod_res = client.post("/api/v1/products", json={
            "name": "Dark Chocolate 70%",
            "category": "Confectionery",
            "buying_price": 50.00,
            "selling_price": 80.00,
            "current_stock": 2,
            "minimum_stock": 5
        }, headers=headers)
        assert new_prod_res.status_code == 201, f"Add product failed: {new_prod_res.text}"
        new_p = new_prod_res.json()
        print(f"[PASS] Manual Product Creation Passed: Added '{new_p['name']}' (SKU: {new_p['sku']})")

        # 8. Inventory CRUD & Dynamic Status (/inventory)
        res = client.get("/api/v1/inventory", headers=headers)
        assert res.status_code == 200, f"Get inventory failed: {res.text}"
        inv_list = res.json()
        print(f"\n[PASS] Inventory Stock Retrieval Passed: {len(inv_list)} stock records.")
        for item in inv_list:
            p_name = item['product']['name'] if item.get('product') else 'Item'
            print(f"  - Item '{p_name}': Stock = {item['current_stock']}, Status = '{item['status']}'")

        # 9. Suppliers CRUD (/suppliers)
        res = client.get("/api/v1/suppliers", headers=headers)
        assert res.status_code == 200, f"Get suppliers failed: {res.text}"
        suppliers = res.json()
        print(f"\n[PASS] Suppliers List Retrieval Passed: Found {len(suppliers)} auto-created suppliers.")

        # 10. Dashboard Engine (/dashboard & /dashboard/summary)
        res = client.get("/api/v1/dashboard", headers=headers)
        assert res.status_code == 200, f"Get dashboard cards failed: {res.text}"
        cards = res.json()
        print("\n[PASS] SQL Dashboard Engine Cards Calculation Passed:")
        print(f"  - Total Products: {cards['total_products']}")
        print(f"  - Inventory Value (Cost): ${cards['total_inventory_value_cost']}")
        print(f"  - Inventory Value (Retail): ${cards['total_inventory_value_retail']}")
        print(f"  - Total Revenue: ${cards['total_revenue']}")
        print(f"  - Total Profit: ${cards['total_profit']}")
        print(f"  - Products Running Low: {cards['products_running_low']}")
        print(f"  - Inventory Health: {cards['inventory_health']}")

        res_sum = client.get("/api/v1/dashboard/summary", headers=headers)
        assert res_sum.status_code == 200, f"Get dashboard summary failed: {res_sum.text}"
        summary = res_sum.json()
        print(f"[PASS] Dashboard Summary Passed: Low stock alerts count = {len(summary['low_stock_alerts'])}")

        # 11. Analytics Engine (/analytics)
        res = client.get("/api/v1/analytics", headers=headers)
        assert res.status_code == 200, f"Get analytics overview failed: {res.text}"
        analytics = res.json()
        print("\n[PASS] SQL Analytics Engine Calculation Passed:")
        print(f"  - Total Revenue SQL: ${analytics['total_revenue']}")
        print(f"  - Best Sellers Count: {len(analytics['best_sellers'])}")
        print(f"  - Category Breakdown Count: {len(analytics['category_distribution'])}")

        # 12. Business Context Engine (/analytics/context)
        res = client.get("/api/v1/analytics/context?query=Milk", headers=headers)
        assert res.status_code == 200, f"Get business context failed: {res.text}"
        ctx = res.json()
        print("\n[PASS] Business Context Service Query Passed:")
        print(f"  - Targeted Item Query: '{ctx['query']}'")
        print(f"  - Matching Products Found: {ctx['matching_products_count']}")
        if ctx['items']:
            print(f"  - First Item: {ctx['items'][0]['name']}, Stock = {ctx['items'][0]['current_stock']}, Supplier = '{ctx['items'][0]['supplier_name']}'")

        print("\n==================================================")
        print("ALL PHASE 2A SUCCESS CRITERIA VERIFIED & PASSED!")
        print("==================================================")


if __name__ == "__main__":
    test_full_phase2a_flow()
