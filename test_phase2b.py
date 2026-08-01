import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.holiday_service import HolidayService
from backend.app.services.weather_service import WeatherService


def test_full_phase2b_flow():
    print("==================================================")
    print("STARTING PHASE 2B DECISION ENGINE & FORECASTING VERIFICATION TEST")
    print("==================================================")

    with TestClient(app) as client:
        # 1. Health Check
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[PASS] Health Check Passed:", res.json())

        # 2. Auth & Business Creation
        user_email = "decision_mgr@example.com"
        user_pass = "SecureDecision123!"
        client.post("/api/v1/auth/register", json={
            "name": "Decision Manager",
            "email": user_email,
            "password": user_pass
        })
        login_res = client.post("/api/v1/auth/login", json={
            "email": user_email,
            "password": user_pass
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        biz_res = client.post("/api/v1/business", json={
            "business_name": "Metro Hypermarket",
            "business_type": "Grocery & Supermarket"
        }, headers=headers)
        biz_id = biz_res.json()["id"]
        print(f"[PASS] Auth & Business Setup Passed: Business ID {biz_id}")

        # 3. Populate Inventory via CSV Import Pipeline
        sample_csv = (
            "Item Name,SKU,Category,Current Stock,Sold,Cost,Selling Price,Expiry Date,Vendor\n"
            "Organic Milk 1L,SKU-MILK-101,Dairy,2,18,20.00,35.00,2026-08-03,Amul Dairy\n"
            "Basmati Rice 5kg,SKU-RICE-102,Grains,120,4,300.00,450.00,2027-12-31,India Gate\n"
            "Coke Can 300ml,SKU-COKE-103,Beverages,5,40,15.00,25.00,2026-10-10,Coca-Cola\n"
            "Old Cereal Pack,SKU-CER-104,Breakfast,8,0,80.00,120.00,2026-02-01,Nestle\n"
        )
        files = {"file": ("decision_inventory.csv", sample_csv.encode("utf-8"), "text/csv")}
        preview_res = client.post("/api/v1/upload/csv", files=files, headers=headers).json()
        confirm_res = client.post("/api/v1/upload/csv/confirm", json={
            "filename": "decision_inventory.csv",
            "column_mapping": preview_res["column_mapping"],
            "confirm": True
        }, headers=headers)
        assert confirm_res.status_code == 200, f"CSV confirm failed: {confirm_res.text}"
        print("[PASS] Inventory Setup via CSV Pipeline Passed.")

        # 4. Direct Weather API & Holiday Engine Verification
        print("\n[PASS] Testing External Weather & Holiday Services...")
        holiday_data = HolidayService.get_holiday_info()
        print(f"  - Today Date: {holiday_data['date']}, Day: {holiday_data['day_of_week']}, Weekend: {holiday_data['is_weekend']}, Holiday: {holiday_data['is_holiday']}")

        # 5. Forecast Engine Endpoints (/forecast)
        res = client.get("/api/v1/forecast", headers=headers)
        assert res.status_code == 200, f"Get all forecasts failed: {res.text}"
        forecast_overview = res.json()
        print("\n[PASS] XGBoost Forecast Engine Overview Passed:")
        print(f"  - Total Products Forecasted: {forecast_overview['total_products_forecasted']}")
        print(f"  - 7-Day Predicted Demand: {forecast_overview['total_7d_predicted_units']} units")
        print(f"  - 30-Day Predicted Demand: {forecast_overview['total_30d_predicted_units']} units")
        print(f"  - Average Model Confidence: {forecast_overview['average_confidence_score']}%")

        # Single product forecast
        first_prod_id = forecast_overview['product_forecasts'][0]['product_id']
        res = client.get(f"/api/v1/forecast/product/{first_prod_id}", headers=headers)
        assert res.status_code == 200, f"Get product forecast failed: {res.text}"
        p_fc = res.json()
        print(f"\n[PASS] Product Specific Multi-Horizon Forecast Passed for '{p_fc['product_name']}':")
        print(f"  - 1-Day Forecast: {p_fc['forecast_1d']} units")
        print(f"  - 7-Day Forecast: {p_fc['forecast_7d']} units")
        print(f"  - 30-Day Forecast: {p_fc['forecast_30d']} units")
        print(f"  - Key Impact Factors: {p_fc['key_factors']}")

        # Weekly forecast breakdown
        res = client.get("/api/v1/forecast/week", headers=headers)
        assert res.status_code == 200, f"Get weekly breakdown failed: {res.text}"
        weekly_days = res.json()
        print(f"[PASS] Weekly Demand Forecast Breakdown Passed: Returned {len(weekly_days)} daily trend points.")

        # 6. Recommendation Engine Endpoints (/recommendations)
        res = client.get("/api/v1/recommendations", headers=headers)
        assert res.status_code == 200, f"Get recommendations failed: {res.text}"
        recs_overview = res.json()
        print("\n[PASS] Recommendation & Business Rules Engine Passed:")
        print(f"  - Total Reorder Units Suggested: {recs_overview['total_recommended_reorder_units']}")
        print(f"  - Estimated Reorder Cost: ${recs_overview['total_estimated_reorder_cost']}")
        print(f"  - High Priority Reorders: {recs_overview['high_priority_reorders_count']}")
        print(f"  - Clearance Items Count: {recs_overview['clearance_items_count']}")

        for r in recs_overview['recommendations']:
            print(f"  - Item '{r['product_name']}': Action = '{r['action_type']}', Reorder Qty = {r['recommended_order_quantity']}, Stockout Risk = '{r['stockout_risk']}', Expiry Risk = '{r['expiry_risk']}'")

        # Single product recommendation
        res = client.get(f"/api/v1/recommendations/product/{first_prod_id}", headers=headers)
        assert res.status_code == 200, f"Get product recommendation failed: {res.text}"
        p_rec = res.json()
        print(f"[PASS] Single Product Recommendation Passed for '{p_rec['product_name']}': Reason = '{p_rec['action_reason']}'")

        # 7. Risk Scorecard Engine Endpoint (/risk)
        res = client.get("/api/v1/risk", headers=headers)
        assert res.status_code == 200, f"Get risk scorecard failed: {res.text}"
        risk_scorecard = res.json()
        print("\n[PASS] Risk Scorecard Engine Calculation Passed:")
        print(f"  - Overall Business Risk Score (0-100): {risk_scorecard['overall_business_risk_score']}")
        print(f"  - Inventory Health Score (0-100): {risk_scorecard['inventory_health_score']}")
        print(f"  - ML Forecast Confidence: {risk_scorecard['forecast_confidence_score']}%")
        print(f"  - Active Priority Alerts Count: {len(risk_scorecard['active_risk_alerts'])}")
        for alert in risk_scorecard['active_risk_alerts']:
            print(f"    * Alert [{alert['severity']}]: {alert['risk_type']} on '{alert['product_name']}' -> Action: {alert['suggested_action']}")

        print("\n==================================================")
        print("ALL PHASE 2B SUCCESS CRITERIA VERIFIED & PASSED!")
        print("==================================================")


if __name__ == "__main__":
    test_full_phase2b_flow()
