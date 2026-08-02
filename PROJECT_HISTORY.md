# AI Retail Management Platform - Project History & Architecture Guide (Dynamic Inventory & Supplier System Complete)

> **Document Purpose**: This file serves as the definitive reference log for AI agents, software engineers, and database architects working on this repository. It details all architectural decisions, database models, system flows, and API specifications built across **Phase 1**, **Phase 2A**, **Phase 2B**, **Phase 3** (Groq SDK Migration), **Phase 4** (Universal Document Engine & Additive Sync), **Phase 5** (POS Barcode Billing & Per-Product Financial Analytics), **Phase 6** (XGBoost Dashboard Smart Intelligence), and **Phase 7** (Dynamic AI Inventory & Supplier System).

---

## 1. Executive Summary & Goals

### Phase 1 Deliverables (Completed):
1. **User Authentication System**: Secure registration, login, bcrypt password hashing, and JWT Bearer token generation.
2. **Business Management API**: CRUD endpoints for store owners to manage retail business entities and operational parameters.
3. **AI Discovery Engine**: An interactive, stateful natural language interview engine powered by structured extraction, missing fields detector, follow-up prompt generator, and final confirmation summary step.
4. **PostgreSQL Relational Persistence**: Complete SQLAlchemy 2.0 ORM models and Alembic database migration environment.

### Phase 2A Deliverables (Completed):
1. **CSV Import Pipeline**: Multi-stage pipeline (Encoding & Delimiter Detection, Flexible Fuzzy Column Mapping, Row Validation Engine, Preview Report, Single-Transaction Database Commit with Rollback, Import History audit logs).
2. **Product Catalog & Inventory System**: Product CRUD (`/products`), Inventory stock management (`/inventory`), Supplier management (`/suppliers`), with dynamic stock status calculations (`Healthy`, `Low Stock`, `Out Of Stock`, `Overstock`, `Expired`, `Expiring Soon`).
3. **Dashboard Engine**: Real-time SQL aggregation metrics (`Total Products`, `Inventory Value (Cost & Retail)`, `Today/Weekly/Monthly Sales`, `Revenue`, `Profit`, `Inventory Health Breakdown`). Zero mock values.
4. **Analytics Engine**: Pure SQL analytical queries for sales trends over 7/30/90 days, Best/Worst Sellers, Sales Velocity (Fast/Slow moving), and Category Distribution.
5. **Business Context Engine**: Tightly-scoped retriever (`BusinessContextService`) querying targeted item context for AI modules.

### Phase 2B Deliverables (Completed):
1. **Weather Module (`weather_service.py`)**: Integrates real weather API (Open-Meteo REST API: temperature, rain probability, humidity, weather condition) with in-memory TTL caching.
2. **Holiday Engine (`holiday_service.py`)**: Integrates public holidays, festivals, weekends, and high-traffic calendar events using the `holidays` Python library.
3. **Feature Builder Engine (`feature_builder.py`)**: Constructs normalized ML feature matrices combining Calendar, Weather, Business Type, Sales Lags (1d/7d/30d), and Rolling Averages/Medians.
4. **XGBoost Demand Forecast Engine (`forecast_service.py`)**: Predicts multi-horizon demand for Next 1, 3, 7, 14, and 30 Days along with dynamic confidence scores and key factor impact notes. Implements abstract `BasePredictionModel` architecture for model modularity.
5. **Recommendation Engine (`recommendation_service.py` & `business_rules.py`)**: Deterministic rules calculating exact `Recommended Order Quantity`, Safety Stock, Supplier Lead Times, Stockout Risk, Overstock Risk, Expiry Risk, and Dead Stock clearance actions.
6. **Risk Scorecard Engine (`risk_engine.py`)**: Comprehensive risk engine calculating Overall Business Risk Score (0-100), Inventory Health Index, ML Forecast Confidence, and high-priority action alerts.

### Phase 3 Deliverables (Groq SDK Migration Complete):
1. **LLM Provider Migration**: Fully migrated to official **Groq Python SDK** (`groq>=1.0.0`) using `GROQ_API_KEY` and configurable `GROQ_MODEL="llama-3.3-70b-versatile"`.
2. **GroqService (`groq_service.py`)**: Dedicated, reusable LLM client (`groq.AsyncGroq`) handling completions, structured JSON mode, exponential backoff retries, timeout error handling, and rule-based fallback processing.
3. **Centralized Prompt Engineering (`prompts/`)**: `system_prompt.txt`, `business_chat.txt`, `inventory_explainer.txt`, `report_summary.txt`, `recommendation_explainer.txt`, `command_parser.txt`.
4. **Database Chat Session Persistence (`models.py`)**: `ChatSession` and `ChatMessage` ORM models in PostgreSQL logging conversation threads and token-optimized summaries per business.
5. **AI Copilot Pipeline (`copilot_service.py`, `api/chat.py`)**: Natural language Q&A (`POST /chat`), session history (`POST /chat/history`), dynamic suggestions (`GET /chat/suggestions`). Operates as a senior Retail Operations Manager enforcing zero calculation & zero hallucination rules.
6. **Natural Language Inventory Command Parser & SQL Executor (`command_parser_service.py`, `POST /ai/parse-command`)**: Parses text commands ("I sold 12 Coke bottles", "Add 40 Milk packets") into structured JSON (`action`, `product`, `quantity`), validates product in PostgreSQL, and executes stock updates/sales transactions in SQL.
7. **Smart Executive Daily Brief (`GET /ai/daily-brief`)**: Generates morning briefing combining Analytics, Forecasts, Recommendations, and Risk Scorecard.
8. **Report & Metric Explainers (`GET /ai/report-summary`, `POST /ai/explain`)**: Provides plain-language explanations of financial performance, stockouts, and clearance recommendations.
9. **AI Engine Health Check (`GET /ai/health`)**: Endpoint checking Groq API provider status (`provider="Groq"`, `groq_api_configured=True/False`, `model="llama-3.3-70b-versatile"`).

### Phase 4 Deliverables (Universal Document Engine & Additive Sync Complete):
1. **Universal Multi-Format Document Parsing Engine (`DocumentParserService`)**: Supports CSV, Excel (`.xlsx`, `.xls`), PDF (`.pdf`), Images (`.png`, `.jpg`, `.webp`), and Text (`.txt`). Uses Groq AI (`qwen-2.5-32b` / `llama-3.3-70b-versatile`) for unstructured entity extraction.
2. **Interactive AI Missing Data Clarification Chat**: Evaluates extracted data for missing attributes (prices, categories, quantities) and interactively prompts user via AI chat panel without hallucinating or guessing. Includes optional expiry date prompt workflow.
3. **Per-Product Additive Inventory Sync Engine**: Performs per-product additive stock math: `new_stock = existing_stock + newly_arrived_qty` (e.g. existing 5 Milk + 5 new Milk = 10 total Milk). Automatically creates new product and inventory records for unlisted items.
4. **Last Upload Status Audit Banner (`GET /api/v1/upload/last-status`, `LastUploadStatusBanner.tsx`)**: Renders audit status banner displaying formatted last upload timestamp, file name, format badge, and total items synced.

### Phase 5 Deliverables (POS Barcode Scanner Billing & Financial Analytics Complete):
1. **Real-Time Barcode POS Billing Scanner (`POSBarcodeScannerWidget.tsx`, `POST /sales/scan`)**: Simulates/interfaces with hardware USB barcode scanners or manual SKU inputs. Inserts `Sale` records in PostgreSQL and **auto-decrements `Inventory.current_stock`** (`stock = max(0, stock - qty)`). Enriches with weather condition and holiday metadata.
2. **Multi-Format Sales Document Uploader (`SalesDocumentUploadModal.tsx`, `POST /sales/upload`)**: Uploads sales receipts, daily register PDFs, Excel/CSV sales logs, or image receipts via Groq AI extraction and deducts stock in PostgreSQL.
3. **Overall Store Revenue & Profit Chart**: High-level store performance chart displaying overall revenue ($), profit ($), and sales counts over 7/30/90 days.
4. **Individual Product Revenue & Profit Chart (`IndividualProductRevenueChart.tsx`, `GET /sales/product/{id}/trend`)**: Interactive dropdown product selector allowing users to inspect the specific daily/weekly revenue trend ($), profit ($), units sold, and profit margin (%) for any target product over time.
5. **Per-Product Buying vs. Selling Financial Breakdown (`PerProductFinancialTable.tsx`, `GET /sales/financials`)**: SQL aggregation table comparing buying cost vs. selling price per product: Revenue ($), Buying Cost ($), Net Profit ($), Margin (%), Units Sold, Remaining Stock, and Status. Clickable rows auto-update the individual product trend chart.

### Phase 6 Deliverables (XGBoost Dashboard Smart Intelligence Complete):
1. **XGBoost Product Spoilage & Expiry Waste Classifier (`SmartIntelligenceService.predict_spoilage_risks`)**: Runs `xgboost.XGBClassifier` on real inventory expiry dates, stock, buying cost, and sales velocity. Calculates per-item spoilage risk probability (%), potential waste loss ($), and recommends targeted clearance discounts.
2. **XGBoost Hourly Store Footfall & Busy-Hours Predictor (`SmartIntelligenceService.predict_hourly_footfall`)**: Runs `xgboost.XGBRegressor` on historical POS sales timestamps, weather conditions (`WeatherService`), and day of week. Predicts peak customer traffic hours and recommended checkout register staffing.
3. **Executive Dashboard Native Integration (`XGBoostSmartInsightsBanner.tsx`, `GET /dashboard/smart-insights`)**: Integrated directly into the Executive Dashboard (`/dashboard`) with zero hardcoded fake data.

### Phase 7 Deliverables (Dynamic AI Inventory & Supplier System Complete):
1. **Total Inventory Capacity Utilization Widget (`InventoryCapacityWidget.tsx`, `GET /dashboard/capacity`)**: Calculates real-time occupied stock vs total maximum capacity limits across all store/warehouse zones (`utilization_pct = (occupied / capacity) * 100%`).
2. **Stock Lasting (Runway Estimate) Widget (`StockRunwayWidget.tsx`, `GET /dashboard/runway`)**: Predicts estimated days remaining before inventory runs out based on 30-day sales velocity burn rate and identifies items with the shortest runway.
3. **Universal Product Search Bar (`Header.tsx`)**: Located in top navigation bar, replacing legacy Q Spotlight. Provides instant real-time search across products, SKUs, and categories with interactive popover results.
4. **Item-Level Stock Intelligence (`ItemStockIntelligenceBanner.tsx`, `GET /dashboard/suggestions`)**: Displays dynamic reorder and stocking suggestions **positioned directly above every individual product** in the inventory UI.
5. **Supplier Hierarchy & AI Packaging Analysis (`SupplierService.get_ai_supplier_mapping`, `GET /suppliers/ai-mapping`)**: Analyzes transaction history, product demand, and lead times to dynamically map products to optimal suppliers and packaging formats (`Individual Units`, `Box of 12`, `Bulk Case of 48`).

---

## 2. Complete Component Architecture

```
c:\Quadstock\
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py               # Dependency injection: Async DB session & JWT User verification
│   │   │   ├── auth.py               # Auth endpoints: /register, /login, /me
│   │   │   ├── business.py           # Business CRUD endpoints: POST, GET, PUT, DELETE
│   │   │   ├── ai_discovery.py       # AI Discovery interview (/interview) & confirm (/confirm)
│   │   │   ├── supplier.py           # Endpoints: GET/POST/PUT/DELETE /suppliers, GET /suppliers/ai-mapping
│   │   │   ├── product.py            # Endpoints: GET/POST/PUT/DELETE /products
│   │   │   ├── inventory.py          # Endpoints: GET/POST/PUT/DELETE /inventory
│   │   │   ├── csv_import.py         # Endpoints: POST /upload/document, POST /upload/clarify, POST /upload/confirm, GET /upload/last-status
│   │   │   ├── sales.py              # Endpoints: POST /sales/scan, POST /sales/upload, GET /sales/financials, GET /sales/product/{id}/trend
│   │   │   ├── dashboard.py          # Endpoints: GET /dashboard, GET /dashboard/summary, GET /dashboard/smart-insights, GET /dashboard/capacity, GET /dashboard/runway, GET /dashboard/suggestions
│   │   │   ├── analytics.py          # Endpoints: GET /analytics, GET /analytics/revenue, GET /analytics/products, GET /analytics/context
│   │   │   ├── forecast.py           # Endpoints: GET /forecast, GET /forecast/product/{id}, GET /forecast/week
│   │   │   ├── risk.py               # Endpoints: GET /risk/scorecard, GET /risk/alerts
│   │   │   └── chat.py               # Endpoints: POST /chat, GET /chat/history, GET /chat/suggestions, POST /ai/parse-command, GET /ai/daily-brief
│   │   ├── database/                 # SQLAlchemy 2.0 ORM models & async engine
│   │   ├── schemas/                  # Pydantic schemas (Dashboard Capacity & Runway, Supplier Packaging & AI Mapping, Sales, Copilot, Forecast, Risk)
│   │   └── services/
│   │       ├── dashboard_service.py       # Inventory Capacity, Stock Runway, Item Suggestions, and Dashboard Cards
│   │       ├── supplier_service.py        # Supplier CRUD & AI Supplier-Product Packaging Mapping
│   │       ├── smart_intelligence_service.py # XGBoost Spoilage Classifier & Footfall Predictor
│   │       ├── sales_service.py           # POS barcode checkout, auto-stock decrement & per-product financials
│   │       ├── document_parser_service.py # Universal multi-format parser & Groq AI extraction
│   │       └── groq_service.py            # Official Groq Python SDK client
└── frontend/
    ├── app/(dashboard)/
    │   ├── dashboard/page.tsx        # Executive Command Center w/ Inventory Capacity Widget, Stock Runway Widget & XGBoost Smart Insights
    │   ├── inventory/page.tsx        # Unified Inventory Management w/ Item-Level Stock Intelligence Banners & Universal Document Uploader
    │   ├── analytics/page.tsx        # Financial Analytics Command Center w/ POS Scanner, Individual Chart & Financial Table
    │   └── ai-discovery/page.tsx     # AI Business Overview w/ Embedded Universal Document Upload Modal
    ├── components/
    │   ├── layout/
    │   │   └── Header.tsx                    # Top Navigation Bar w/ Universal Product Search Bar & Popover
    │   ├── dashboard/
    │   │   ├── InventoryCapacityWidget.tsx   # Total Inventory Capacity Utilization Gauge
    │   │   └── StockRunwayWidget.tsx         # Stock Lasting (Runway Estimate) Widget
    │   ├── inventory/
    │   │   ├── ItemStockIntelligenceBanner.tsx # ML Stocking Suggestions Directly Above Products
    │   │   ├── LastUploadStatusBanner.tsx     # Audit status banner
    │   │   └── UniversalDocumentUploadModal.tsx
    │   ├── ai/
    │   │   └── XGBoostSmartInsightsBanner.tsx # XGBoost Spoilage Classifier & Footfall Predictor Cards
    │   ├── pos/
    │   │   ├── POSBarcodeScannerWidget.tsx    # POS Barcode Scanner Simulator
    │   │   └── SalesDocumentUploadModal.tsx   # Sales Receipts & Document Uploader Modal
    │   └── analytics/
    │       ├── IndividualProductRevenueChart.tsx
    │       └── PerProductFinancialTable.tsx
    └── services/
        ├── dashboardService.ts                # Axios API client for dashboard cards, capacity, runway, suggestions, and smart insights
        ├── supplierService.ts                 # Axios API client for suppliers & AI supplier mapping
        └── salesService.ts                    # Axios API client for POS scan, sales upload, and product trends
```
