# AI Retail Management Platform - Project History & Architecture Guide (Groq LLM Migration Complete)

> **Document Purpose**: This file serves as the definitive reference log for AI agents, software engineers, and database architects working on this repository. It details all architectural decisions, database models, system flows, and API specifications built across **Phase 1**, **Phase 2A**, **Phase 2B**, and **Phase 3** (Migrated to official **Groq SDK**).

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
1. **LLM Provider Migration**: Fully migrated to the official **Groq Python SDK** (`groq>=1.0.0`) using `GROQ_API_KEY` and configurable `GROQ_MODEL="llama-3.3-70b-versatile"`. Removed all OpenAI, xAI Grok, or Whisper dependencies.
2. **GroqService (`groq_service.py`)**: Dedicated, reusable LLM client (`groq.AsyncGroq`) handling completions, structured JSON mode, exponential backoff retries, timeout error handling, and rule-based fallback processing.
3. **Centralized Prompt Engineering (`prompts/`)**: `system_prompt.txt`, `business_chat.txt`, `inventory_explainer.txt`, `report_summary.txt`, `recommendation_explainer.txt`, `command_parser.txt`.
4. **Database Chat Session Persistence (`models.py`)**: Added `ChatSession` and `ChatMessage` ORM models in PostgreSQL to log conversation threads and token-optimized summaries per business.
5. **AI Copilot Pipeline (`copilot_service.py`, `api/chat.py`)**: Natural language Q&A (`POST /chat`), session history (`POST /chat/history`), dynamic suggestions (`GET /chat/suggestions`). Operates as a senior Retail Operations Manager enforcing zero calculation & zero hallucination rules.
6. **Natural Language Inventory Command Parser & SQL Executor (`command_parser_service.py`, `POST /ai/parse-command`)**: Parses text commands ("I sold 12 Coke bottles", "Add 40 Milk packets") into structured JSON (`action`, `product`, `quantity`), validates product in PostgreSQL, and executes stock updates/sales transactions in SQL.
7. **Smart Executive Daily Brief (`GET /ai/daily-brief`)**: Generates structured morning briefing combining Analytics, Forecasts, Recommendations, and Risk Scorecard.
8. **Report & Metric Explainers (`GET /ai/report-summary`, `POST /ai/explain`)**: Provides plain-language explanations of financial performance, stockouts, and clearance recommendations.
9. **AI Engine Health Check (`GET /ai/health`)**: Endpoint checking Groq API provider status (`provider="Groq"`, `groq_api_configured=True/False`, `model="llama-3.3-70b-versatile"`).

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
│   │   │   ├── supplier.py           # Endpoints: GET/POST/PUT/DELETE /suppliers
│   │   │   ├── product.py            # Endpoints: GET/POST/PUT/DELETE /products
│   │   │   ├── inventory.py          # Endpoints: GET/POST/PUT/DELETE /inventory
│   │   │   ├── csv_import.py         # Endpoints: POST /upload/csv, POST /upload/csv/confirm, GET /upload/history
│   │   │   ├── dashboard.py          # Endpoints: GET /dashboard, GET /dashboard/summary
│   │   │   ├── analytics.py          # Endpoints: GET /analytics, GET /analytics/revenue, GET /analytics/products, GET /analytics/context
│   │   │   ├── forecast.py           # Endpoints: GET /forecast, GET /forecast/product/{id}, GET /forecast/week
│   │   │   ├── recommendation.py     # Endpoints: GET /recommendations, GET /recommendations/product/{id}
│   │   │   ├── risk.py               # Endpoint: GET /risk
│   │   │   ├── chat.py               # Endpoints: POST /chat, POST /chat/history, GET /chat/suggestions
│   │   │   └── ai_copilot.py         # Endpoints: GET /ai/daily-brief, GET /ai/report-summary, POST /ai/explain, POST /ai/business-summary, POST /ai/parse-command, GET /ai/health
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings loading from .env (GROQ_API_KEY, GROQ_MODEL)
│   │   │   ├── security.py           # Bcrypt password hashing & PyJWT token encoding/decoding
│   │   │   └── logging_config.py     # Centralized structured logging
│   │   ├── database/
│   │   │   ├── database.py           # SQLAlchemy 2.0 Async & Sync engine creation
│   │   │   ├── models.py             # ORM Models: User, Business, BusinessProfile, Supplier, Product, Inventory, Sale, ImportHistory, ChatSession, ChatMessage
│   │   │   └── session.py            # AsyncSession generator get_db()
│   │   ├── schemas/
│   │   │   ├── auth.py               # Auth Pydantic v2 validation models
│   │   │   ├── business.py           # Business & BusinessProfile Pydantic v2 schemas
│   │   │   ├── ai_discovery.py       # ExtractedProfile, DiscoveryInput, DiscoveryResponse, ConfirmRequest
│   │   │   ├── supplier.py           # Supplier CRUD schemas
│   │   │   ├── product.py            # Product CRUD schemas
│   │   │   ├── inventory.py          # Inventory & stock status schemas
│   │   │   ├── csv_import.py         # Column mapping, preview & import audit schemas
│   │   │   ├── dashboard.py          # Dashboard Cards & Summary schemas
│   │   │   ├── analytics.py          # Analytics overview & sales trends schemas
│   │   │   ├── forecast.py           # Multi-horizon forecast schemas
│   │   │   ├── recommendation.py     # Reorder & clearance recommendation schemas
│   │   │   ├── risk.py               # Business Risk Scorecard schemas
│   │   │   └── copilot.py            # Chat, Daily Brief, Report Explainer, Command Parser schemas
│   │   ├── services/
│   │   │   ├── groq_service.py       # Dedicated Groq Python SDK client (AsyncGroq)
│   │   │   ├── auth_service.py       # User creation, authentication logic
│   │   │   ├── business_service.py   # Database queries & profile updates
│   │   │   ├── ai_service.py         # AI store discovery via Groq Service
│   │   │   ├── supplier_service.py   # Supplier DB operations
│   │   │   ├── product_service.py    # Product CRUD & SKU autogeneration
│   │   │   ├── inventory_service.py  # Inventory CRUD & dynamic status calculations
│   │   │   ├── csv_import_service.py # Multi-stage CSV import pipeline
│   │   │   ├── dashboard_service.py  # Real-time SQL aggregations for Dashboard Cards
│   │   │   ├── analytics_service.py  # Real-time SQL aggregations for Sales trends & Rankings
│   │   │   ├── business_context_service.py # Targeted retriever for AI context
│   │   │   ├── weather_service.py    # Weather REST API client with caching
│   │   │   ├── holiday_service.py    # Calendar & Holiday detection service
│   │   │   ├── feature_builder.py    # Feature engineering for ML models
│   │   │   ├── forecast_service.py   # Forecast Engine (XGBoost Regressor)
│   │   │   ├── business_rules.py     # Deterministic business rules engine
│   │   │   ├── recommendation_service.py # Reorder & Clearance Recommendation Engine
│   │   │   ├── risk_engine.py        # Risk Scorecard & Alerts generator
│   │   │   ├── copilot_service.py    # AI Business Copilot Pipeline via Groq
│   │   │   └── command_parser_service.py # Natural Language Command Executor via Groq
│   │   ├── prompts/                  # Centralized Prompts
│   │   │   ├── system_prompt.txt
│   │   │   ├── business_chat.txt
│   │   │   ├── inventory_explainer.txt
│   │   │   ├── report_summary.txt
│   │   │   ├── recommendation_explainer.txt
│   │   │   ├── command_parser.txt
│   │   │   └── discovery_prompts.py
│   │   └── main.py                   # FastAPI initialization, CORS, lifespan & router registrations
├── requirements.txt
├── .env
├── test_phase1.py                    # Phase 1 Integration Test
├── test_phase2a.py                   # Phase 2A Integration Test
├── test_phase2b.py                   # Phase 2B Decision Engine Test
├── test_phase3.py                    # Phase 3 AI Business Copilot Test (Groq Verified)
├── PROJECT_HISTORY.md                # This reference document
└── README.md
```

---

## 3. Complete API Reference

### Phase 1 Endpoints:
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `POST /api/v1/business`, `GET /api/v1/business`, `GET /api/v1/business/{id}`, `PUT /api/v1/business/{id}/profile`, `DELETE /api/v1/business/{id}`
- `POST /api/v1/ai/interview`, `POST /api/v1/ai/confirm`

### Phase 2A Endpoints:
- `POST /api/v1/upload/csv`, `POST /api/v1/upload/csv/confirm`, `GET /api/v1/upload/history`
- `GET /api/v1/dashboard`, `GET /api/v1/dashboard/summary`
- `GET /api/v1/inventory`, `GET /api/v1/inventory/{id}`, `POST /api/v1/inventory`, `PUT /api/v1/inventory/{id}`, `DELETE /api/v1/inventory/{id}`
- `GET /api/v1/products`, `GET /api/v1/products/{id}`, `POST /api/v1/products`, `PUT /api/v1/products/{id}`, `DELETE /api/v1/products/{id}`
- `GET /api/v1/analytics`, `GET /api/v1/analytics/revenue`, `GET /api/v1/analytics/products`, `GET /api/v1/analytics/context`
- `GET /api/v1/suppliers`, `POST /api/v1/suppliers`, `PUT /api/v1/suppliers/{id}`, `DELETE /api/v1/suppliers/{id}`

### Phase 2B Endpoints (Decision Engine):
- `GET /api/v1/forecast`, `GET /api/v1/forecast/product/{id}`, `GET /api/v1/forecast/week`
- `GET /api/v1/recommendations`, `GET /api/v1/recommendations/product/{id}`
- `GET /api/v1/risk`

### Phase 3 Endpoints (AI Business Copilot - Groq SDK):
- `POST /api/v1/chat`: Send chat message, detect intent, retrieve ground-truth SQL context, and generate reasoned AI response.
- `POST /api/v1/chat/history`: Retrieve recent chat message history for a session.
- `GET /api/v1/chat/suggestions`: Get starter prompt recommendations.
- `GET /api/v1/ai/daily-brief`: Executive Smart Daily Briefing combining Analytics, Forecasts, Recommendations, and Risks.
- `GET /api/v1/ai/report-summary`: Executive report explaining sales performance, revenue, profit, and top sellers.
- `POST /api/v1/ai/explain`: Plain language explainer for specific metrics or recommendations.
- `POST /api/v1/ai/business-summary`: AI overview of store profile setup.
- `POST /api/v1/ai/parse-command`: Converts natural language commands ("I sold 12 Coke bottles") into structured JSON, validates product in PostgreSQL, and executes stock updates in SQL.
- `GET /api/v1/ai/health`: AI Copilot engine health check (Groq API provider status).
