import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from backend.app.main import app


def test_full_phase1_flow():
    print("==================================================")
    print("STARTING COMPLETE PHASE 1 VERIFICATION TEST")
    print("==================================================")

    with TestClient(app) as client:
        # 1. Health Check
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[PASS] Health Check Passed:", res.json())

        # 2. User Registration
        user_email = "owner_test@example.com"
        user_pass = "SecurePass123!"
        reg_payload = {
            "name": "Alex Mercer",
            "email": user_email,
            "password": user_pass
        }
        res = client.post("/api/v1/auth/register", json=reg_payload)
        if res.status_code == 400 and "already exists" in res.text:
            print("User already registered, proceeding to login...")
        else:
            assert res.status_code == 201, f"Registration failed: {res.text}"
            user_data = res.json()
            print(f"[PASS] User Registration Passed: User ID {user_data['id']}, Email: {user_data['email']}")

        # 3. User Login & Token Generation
        login_payload = {
            "email": user_email,
            "password": user_pass
        }
        res = client.post("/api/v1/auth/login", json=login_payload)
        assert res.status_code == 200, f"Login failed: {res.text}"
        token_data = res.json()
        access_token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        print("[PASS] Login Passed: JWT Token acquired successfully.")

        # 4. Get Current User Info (/auth/me)
        res = client.get("/api/v1/auth/me", headers=headers)
        assert res.status_code == 200, f"Get /me failed: {res.text}"
        print(f"[PASS] Protected Auth Me Route Passed: Authenticated as {res.json()['name']}")

        # 5. Create Business
        biz_payload = {
            "business_name": "Campus Corner Mart",
            "business_type": "Grocery Store"
        }
        res = client.post("/api/v1/business", json=biz_payload, headers=headers)
        assert res.status_code == 201, f"Create Business failed: {res.text}"
        biz_data = res.json()
        biz_id = biz_data["id"]
        print(f"[PASS] Business Creation Passed: Business ID {biz_id}, Name: '{biz_data['business_name']}'")

        # 6. AI Discovery Step 1 (Initial Natural Language Input)
        step1_input = {
            "user_input": "I own a grocery store near a college campus. Around 150 customers visit every day. Cold drinks, Maggi and biscuits sell the most."
        }
        res = client.post("/api/v1/ai/interview", json=step1_input, headers=headers)
        assert res.status_code == 200, f"AI Interview Step 1 failed: {res.text}"
        step1_res = res.json()
        extracted_1 = step1_res["extracted_profile"]
        missing_1 = step1_res["missing_fields"]
        questions_1 = step1_res["followup_questions"]

        print("\n[PASS] AI Discovery Step 1 Extraction Passed:")
        print(f"  - Extracted Category: {extracted_1['business_type']}")
        print(f"  - Extracted Location: {extracted_1['location_type']}")
        print(f"  - Extracted Daily Customers: {extracted_1['daily_customers']}")
        print(f"  - Extracted Top Products: {extracted_1['top_products']}")
        print(f"  - Missing Fields Detected ({len(missing_1)}): {missing_1}")
        print(f"  - AI Follow-up Questions ({len(questions_1)}): {questions_1}")

        # 7. AI Discovery Step 2 (Answering Missing Follow-up Questions)
        step2_input = {
            "user_input": "I have 3 employees and 5 main suppliers. Summer is our peak season, and it is a small scale store.",
            "existing_profile": extracted_1
        }
        res = client.post("/api/v1/ai/interview", json=step2_input, headers=headers)
        assert res.status_code == 200, f"AI Interview Step 2 failed: {res.text}"
        step2_res = res.json()
        extracted_2 = step2_res["extracted_profile"]
        missing_2 = step2_res["missing_fields"]

        print("\n[PASS] AI Discovery Step 2 Extraction Passed:")
        print(f"  - Updated Employees: {extracted_2['employees']}")
        print(f"  - Updated Supplier Count: {extracted_2['supplier_count']}")
        print(f"  - Updated Seasonality: {extracted_2['seasonality']}")
        print(f"  - Updated Scale: {extracted_2['business_scale']}")
        print(f"  - Is Discovery Complete: {step2_res['is_complete']}")
        print(f"  - Final Confirmation Summary:\n{step2_res['confirmation_summary']}")

        # 8. Confirm Discovery & Persist to Database
        confirm_payload = {
            "business_id": biz_id,
            "confirmed_profile": extracted_2,
            "confirmed": True
        }
        res = client.post("/api/v1/ai/confirm", json=confirm_payload, headers=headers)
        assert res.status_code == 200, f"Confirm Discovery failed: {res.text}"
        profile_data = res.json()
        print(f"\n[PASS] Profile Confirmation & Database Persistence Passed: Profile ID {profile_data['id']} saved for Business ID {biz_id}")

        # 9. Retrieve Business with Profile Details
        res = client.get(f"/api/v1/business/{biz_id}", headers=headers)
        assert res.status_code == 200, f"Get Business by ID failed: {res.text}"
        full_biz = res.json()
        assert full_biz["profile"] is not None, "Profile was not eager-loaded!"
        print(f"[PASS] Retrieved Saved Business with Profile: Location '{full_biz['profile']['location_type']}', Customers '{full_biz['profile']['daily_customers']}'")

        # 10. Update Profile Attributes
        update_payload = {
            "notes": "Added late night opening shift for college exam months.",
            "opening_time": "08:00 AM",
            "closing_time": "11:00 PM"
        }
        res = client.put(f"/api/v1/business/{biz_id}/profile", json=update_payload, headers=headers)
        assert res.status_code == 200, f"Update Profile failed: {res.text}"
        updated_profile = res.json()
        print(f"[PASS] Profile Update Passed: Notes = '{updated_profile['notes']}', Hours = {updated_profile['opening_time']} to {updated_profile['closing_time']}")

        # 11. Retrieve All User Businesses
        res = client.get("/api/v1/business", headers=headers)
        assert res.status_code == 200, f"Get Businesses list failed: {res.text}"
        biz_list = res.json()
        print(f"[PASS] User Businesses Retrieval Passed: Found {len(biz_list)} business(es).")

        print("\n==================================================")
        print("ALL PHASE 1 SUCCESS CRITERIA VERIFIED & PASSED!")
        print("==================================================")


if __name__ == "__main__":
    test_full_phase1_flow()
