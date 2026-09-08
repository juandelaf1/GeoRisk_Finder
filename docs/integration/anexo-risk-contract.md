# GeoRisk V3 → anexo_risk Integration Contract

## Purpose
This document defines the conceptual integration contract between GeoRisk V3 
(risk/evidence backend) and anexo_risk (emergency operations center).

## Status: PRELIMINARY / CONCEPTUAL
This is not an implementation spec. It documents what GeoRisk CAN provide 
based on verified V3 capabilities.

---

## 1. GeoRisk → anexo_risk: What Can GeoRisk Provide?

For each capability, state:
- What data is available
- The endpoint that provides it
- Evidence level (VERIFIED IN CODE / VERIFIED BY TEST / DOCUMENTED ONLY)
- Freshness / latency

---

### 1.1 Geographic Location

| Field | Type | Description |
|-------|------|-------------|
| `lat` | float | Latitude (WGS84) |
| `lon` | float | Longitude (WGS84) |

**Endpoint:** `GET /api/search?q={query}` → returns `lat`, `lon`  
**Endpoint:** `GET /api/cell/{cell_id}` → returns `lat`, `lon`  
**Evidence:** VERIFIED IN CODE — `main.py:249-260` (search), `main.py:138-158` (_find_cell)  
**Freshness:** Static — derived from H3 grid at pipeline time

**Usage:** anexo_risk can resolve any named location to coordinates, then retrieve the H3 cell covering that point.

---

### 1.2 H3 Cell Identification

| Field | Type | Description |
|-------|------|-------------|
| `cell_id` | string | H3 cell identifier (e.g., `83262ffffffffffff`) |
| `h3_index` | string | H3 hexagon index for deck.gl rendering |
| `kmeans_cluster` | int | Cluster assignment from K-means |
| `dbscan_label` | int | Cluster assignment from DBSCAN |
| `cluster_color` | string | Color associated with the cluster |

**Endpoint:** `GET /api/cell/{cell_id}` → returns full cell record  
**Endpoint:** `GET /api/layers` → returns all cells with `h3_index`  
**Evidence:** VERIFIED IN CODE — `main.py:138-158`, `main.py:161-226`  
**Freshness:** Static — H3 grid computed once in pipeline

**Usage:** Each geographic point maps to exactly one H3 cell. anexo_risk can use `cell_id` as the primary key for all subsequent queries.

---

### 1.3 Hazard Types

| Hazard | Data Source | Available Fields |
|--------|-------------|------------------|
| Earthquake | USGS (via adapters) | magnitude, year, lat, lon, depth |
| Cyclone | IBTrACS (via adapters) | category, year, wind_speed, path |
| Volcano | GVP (via adapters) | lat, lon, elevation, type |
| Flood | Derived / GDACS alerts | severity, location |

**Endpoint:** `GET /api/cell/{cell_id}` → returns `n_earthquakes`, `n_cyclones`, `n_volcanoes`  
**Endpoint:** `GET /api/events/{cell_id}` → returns individual events per type  
**Endpoint:** `GET /api/alerts` → returns real-time alerts (GDACS + USGS)  
**Evidence:** VERIFIED IN CODE — `main.py:442-448` (cell), `main.py:501-569` (events), `main.py:574-716` (alerts)  
**Freshness:** Cell data: static. Events: static (historical). Alerts: cached 5 min, fetched from live feeds.

**Usage:** anexo_risk can determine which hazard types are relevant to any given cell and retrieve both historical events and live alerts.

---

### 1.4 Hazard Severity / Risk Score

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `risk_score` | float | 0.0 – 1.0 | Composite risk score |
| `category` | string | `critical\|high\|moderate\|low` | Derived from score |
| `region` | string | — | Geographic region name |

**Category thresholds** (verified in `main.py:852`):
- `critical`: score ≥ 0.75
- `high`: 0.5 ≤ score < 0.75
- `moderate`: 0.25 ≤ score < 0.5
- `low`: score < 0.25

**Endpoint:** `GET /api/cell/{cell_id}` → returns `risk_score`, `kmeans_cluster`  
**Endpoint:** `GET /api/ranking?limit=N` → returns top-N cells by risk  
**Evidence:** VERIFIED IN CODE — `main.py:138-158`, `main.py:239-246`  
**Freshness:** Static — computed in ML pipeline (`pipeline_riesgo.joblib`)

**Usage:** Core severity metric for triage in anexo_risk. Risk score drives prioritization of emergency response.

---

### 1.5 Historical Events

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Event identifier (e.g., `eq-{cell}-{n}`) |
| `type` | string | `earthquake`, `cyclone`, `volcano` |
| `magnitude` | float | Magnitude (earthquakes) or category (cyclones) |
| `date` | string | Year of event |
| `distance` | float | Distance from cell center in km |
| `source` | string | Data source: `USGS`, `IBTrACS`, `GVP` |
| `title` | string | Human-readable event title |

**Endpoint:** `GET /api/events/{cell_id}` → returns up to 20 nearest events  
**Evidence:** VERIFIED IN CODE — `main.py:501-569`  
**Freshness:** Static — historical catalog data

**Usage:** anexo_risk can display event history for any location to support situational awareness and context.

---

### 1.6 Nearby Events

The `/api/events/{cell_id}` endpoint returns events sorted by proximity to the cell center. Distance is computed as Euclidean distance on lat/lon (approximate, not geodesic).

**Behavior:**
- Earthquakes: up to 10 nearest from catalog of 500
- Volcanoes: up to 5 nearest from full catalog
- Cyclones: up to 10 with paths passing within 500 km
- Results merged and sorted by date (most recent first), capped at 20

**Endpoint:** `GET /api/events/{cell_id}`  
**Evidence:** VERIFIED IN CODE — `main.py:510-568`

---

### 1.7 Climate Scenario / SSP

| Scenario ID | Label | Description | Risk Multiplier |
|-------------|-------|-------------|-----------------|
| `ssp126` | SSP1-2.6 | Sustainable — low emissions | 0.8× |
| `ssp245` | SSP2-4.5 | Intermediate — moderate emissions | 1.0× |
| `ssp370` | SSP3-7.0 | Regional — high emissions | 1.35× |
| `ssp585` | SSP5-8.5 | Fossil — extreme emissions | 1.7× |

**Endpoint:** `GET /api/scenarios` → returns all available scenarios  
**Endpoint:** `GET /api/layers/projected?year=2050&scenario=ssp245` → applies scenario to grid  
**Evidence:** VERIFIED IN CODE — `main.py:754-761`, `main.py:764-769`, `main.py:774-811`  
**Freshness:** Static — multiplier model based on IPCC SSP pathways

**Usage:** anexo_risk can request risk projections under different emission scenarios for climate adaptation planning.

---

### 1.8 Projected Risk (by year)

| Field | Type | Description |
|-------|------|-------------|
| `year` | int | Target projection year |
| `scenario` | string | SSP scenario ID |
| `risk_multiplier` | float | Computed multiplier |

**Projection formula** (verified in `main.py:782`):
```
year_factor = 1.0 + (year - 2024) * 0.003 * scenario_multiplier
projected_risk = base_risk * year_factor  (clipped to [0, 1])
```

**Endpoint:** `GET /api/layers/projected?year={year}&scenario={scenario}`  
**Evidence:** VERIFIED IN CODE — `main.py:774-811`  
**Freshness:** Static — deterministic projection from base risk

**Usage:** anexo_risk can visualize and query how risk evolves over time under different scenarios. Supports long-term emergency planning.

---

### 1.9 Economic Exposure

| Field | Type | Description |
|-------|------|-------------|
| `exposure` | float | Total asset exposure (USD proxy) |
| `annual_loss` | float | Annual Expected Loss (AEL) |
| `adaptation_cost` | float | Cost of adaptation measures |
| `net_savings_10y` | float | Net savings over 10 years |
| `bcr` | float | Benefit-Cost Ratio |
| `payback_years` | float | Payback period in years |
| `cost_of_inaction_10y` | float | Cost of doing nothing over 10 years |
| `hazard_factor` | float | Composite hazard density factor |

**Actuarial model** (verified in `main.py:462-479`):
- `hazard_factor = 1.0 + (eq × 0.08) + (cyc × 0.12) + (vol × 0.05)`
- `base_exposure = risk_score × 50000 × hazard_factor`
- `ael = base_exposure × (eq_loss_prob + cyc_loss_prob + vol_loss_prob) / hazard_factor`
- `adaptation_cost = ael × 3.5`
- `bcr = avoided_loss_10y / adaptation_cost`

**Endpoint:** `GET /api/economic/{cell_id}`  
**Evidence:** VERIFIED IN CODE — `main.py:452-496`  
**Freshness:** Static — derived from cell risk data

**Usage:** Translates physical risk into financial terms. Critical for anexo_risk cost-benefit decisions and resource allocation.

---

### 1.10 Financial Indicators

| Field | Type | Description |
|-------|------|-------------|
| `country` | string | Region/country name |
| `gdp` | float | GDP proxy (derived) |
| `exposure` | float | Asset exposure |
| `resilience` | float | Resilience score (0.1–0.95) |
| `risk_score` | float | Risk score |
| `ews_score` | float | Early Warning System score (0–0.9) |

**Formulas** (verified in `main.py:731-739`):
- `resilience = max(0.1, min(0.95, 1.0 - risk_score × 0.7))`
- `gdp = exposure × 0.0012`
- `ews = min(0.9, 0.3 + (eq + cyc + vol) × 0.02)`

**Endpoint:** `GET /api/financial` → returns top 50 cells  
**Evidence:** VERIFIED IN CODE — `main.py:721-749`  
**Freshness:** Static — derived from ranking data

**Usage:** Provides macro-level financial context for regional risk assessment. Supports insurance and investment decisions.

---

### 1.11 Risk Explanation (NLP)

| Field | Type | Description |
|-------|------|-------------|
| `risk_story` | string | Natural language risk narrative |
| `hazard_breakdown` | array | Structured hazard summary |
| `risk_score` | float | Risk score |
| `region` | string | Region name |

**Narrative template** (verified in `main.py:914-918`):
```
"This location has a risk score of {score:.2f} ({category}). 
Historical data shows {hazard_list}."
```

**Endpoint:** `GET /api/explain/{cell_id}`  
**Evidence:** VERIFIED IN CODE — `main.py:896-926`  
**Freshness:** Static — generated from cell data

**Usage:** Provides human-readable risk context for anexo_risk operators. No LLM dependency — deterministic template.

---

### 1.12 Evidence / Data Sources

| Source | Coverage | Endpoint |
|--------|----------|----------|
| USGS Earthquake Catalog | Global earthquakes | `GET /api/events/{cell_id}` |
| IBTrACS | Global tropical cyclones | `GET /api/events/{cell_id}` |
| GVP (Global Volcano Program) | Global volcanoes | `GET /api/events/{cell_id}` |
| GDACS | Real-time disaster alerts | `GET /api/alerts` |
| H3 Grid | Global risk tessellation | `GET /api/layers` |
| Tectonic Plates (PB2002) | Plate boundaries | `GET /api/layers` (plates layer) |

**Endpoint:** `GET /api/stats` → returns aggregate counts  
**Evidence:** VERIFIED IN CODE — `main.py:959-974`  
**Freshness:** Mixed — catalog data is static; GDACS/USGS alerts cached 5 min

**Usage:** anexo_risk can cite data provenance for every risk assessment.

---

### 1.13 Timestamps / Data Freshness

| Data Type | Freshness | Mechanism |
|-----------|-----------|-----------|
| H3 risk grid | Static | Computed in `pipeline_riesgo.joblib` |
| Earthquake catalog | Static | Loaded from processed CSV |
| Cyclone catalog | Static | Loaded from processed CSV |
| Volcano catalog | Static | Loaded from processed CSV |
| GDACS alerts | 5 min cache | `_ALERTS_TTL = 300` in `main.py:579` |
| USGS alerts | 5 min cache | Shared with GDACS cache |
| Projected layers | On-demand | Computed per request |
| Economic indicators | On-demand | Derived from cell data |

**Endpoint:** `GET /api/alerts` — returns `timestamp` per alert  
**Evidence:** VERIFIED IN CODE — `main.py:577-711`

---

### 1.14 Model / Version Info

| Field | Value | Description |
|-------|-------|-------------|
| `georisk_version` | `3.0.0` | Application version |
| `api_version` | `v3` | API generation |
| `pipeline_version` | `pipeline_riesgo.joblib` | ML pipeline artifact |
| `clustering` | K-means + DBSCAN | Dual clustering approach |

**Endpoint:** `GET /api/stats` → aggregate model statistics  
**Evidence:** VERIFIED IN CODE — `main.py:959-974`, adapters.py pipeline loading  
**Freshness:** Static — model version is fixed at deploy time

---

## 2. Request Conceptual Schema

Define a conceptual request that anexo_risk could send:

```json
{
  "location": {
    "lat": 0.0,
    "lon": 0.0,
    "cell_id": "string (optional, H3 index)",
    "radius_km": 0
  },
  "hazards": ["earthquake", "cyclone", "volcano"],
  "scenario": "ssp245 | null",
  "time_horizon": 2050,
  "options": {
    "include_events": true,
    "include_projections": true,
    "include_economic": true,
    "include_explanation": true,
    "max_events": 20
  }
}
```

### Field Definitions

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `location.lat` | Yes | — | Latitude |
| `location.lon` | Yes | — | Longitude |
| `location.cell_id` | No | auto-resolved | H3 cell ID (if known) |
| `location.radius_km` | No | 0 | Search radius (not yet implemented) |
| `hazards` | No | `["earthquake","cyclone","volcano"]` | Hazard types to include |
| `scenario` | No | `null` | SSP scenario for projections |
| `time_horizon` | No | `2050` | Year for projections |
| `options.include_events` | No | `true` | Include historical events |
| `options.include_projections` | No | `true` | Include projected risk |
| `options.include_economic` | No | `true` | Include economic impact |
| `options.include_explanation` | No | `true` | Include NLP narrative |
| `options.max_events` | No | `20` | Max events to return |

### Current API Mapping (multiple calls needed)

```
1. GET /api/search?q={lat},{lon}          → resolve location
2. GET /api/cell/{cell_id}                → core risk data
3. GET /api/events/{cell_id}              → historical events
4. GET /api/economic/{cell_id}            → economic impact
5. GET /api/explain/{cell_id}             → risk narrative
6. GET /api/layers/projected?year=Y&scenario=S → projections
```

> **Note:** There is no single unified endpoint. anexo_risk must make multiple calls or GeoRisk would need to expose a composite endpoint.

---

## 3. Response Conceptual Schema

Define what GeoRisk would return:

```json
{
  "risk": {
    "cell_id": "string",
    "score": 0.0,
    "category": "critical|high|moderate|low",
    "cluster": 0,
    "region": "string"
  },
  "hazards": {
    "earthquakes": 0,
    "cyclones": 0,
    "volcanoes": 0,
    "primary": "string"
  },
  "events": [...],
  "projections": {
    "year": 2050,
    "scenario": "ssp245",
    "risk_multiplier": 1.0
  },
  "economic_impact": {
    "exposure": 0.0,
    "annual_loss": 0.0,
    "adaptation_cost": 0.0,
    "bcr": 0.0,
    "payback_years": 0.0
  },
  "financial_impact": {
    "gdp": 0.0,
    "resilience": 0.0,
    "ews_score": 0.0
  },
  "explanation": {
    "narrative": "string",
    "hazard_breakdown": [...],
    "recommended_actions": [...],
    "contingency_measures": [...]
  },
  "evidence": {
    "data_sources": ["USGS", "IBTrACS", "GVP", "GDACS"],
    "model_version": "v3",
    "pipeline_version": "pipeline_riesgo.joblib",
    "timestamp": "ISO8601",
    "freshness": "cached_5min | realtime"
  },
  "metadata": {
    "georisk_version": "3.0.0",
    "api_version": "v3",
    "endpoints_used": [...]
  }
}
```

### Field Sources by Endpoint

| Response Field | Source Endpoint | Status |
|----------------|-----------------|--------|
| `risk.cell_id`, `risk.score`, `risk.cluster`, `risk.region` | `GET /api/cell/{cell_id}` | Available |
| `risk.category` | Derived from `risk.score` | Available (compute client-side) |
| `hazards.*` | `GET /api/cell/{cell_id}` | Available |
| `hazards.primary` | Derived — max of hazard counts | Compute client-side |
| `events` | `GET /api/events/{cell_id}` | Available |
| `projections` | `GET /api/layers/projected` | Available (different shape) |
| `economic_impact` | `GET /api/economic/{cell_id}` | Available |
| `financial_impact` | `GET /api/financial` | Available (different granularity) |
| `explanation.narrative` | `GET /api/explain/{cell_id}` | Available as `risk_story` |
| `explanation.hazard_breakdown` | `GET /api/explain/{cell_id}` | Available |
| `explanation.recommended_actions` | Computed client-side | Not in API |
| `explanation.contingency_measures` | Computed client-side | Not in API |
| `evidence.*` | Static metadata | Compose from known values |
| `metadata.*` | Static metadata | Compose from known values |

---

## 4. Mapping: anexo_risk → GeoRisk Endpoints

| anexo_risk Need | GeoRisk Endpoint | Method | Notes |
|-----------------|------------------|--------|-------|
| Search location by name | `/api/search?q={query}` | GET | Returns lat/lon |
| Get risk for coordinates | `/api/search` → `/api/cell/{id}` | GET | Two-step: resolve then fetch |
| Get risk for cell directly | `/api/cell/{cell_id}` | GET | Single call if cell_id known |
| Get historical events | `/api/events/{cell_id}` | GET | Returns eq + cyclone + volcano |
| Get economic impact | `/api/economic/{cell_id}` | GET | Actuarial model output |
| Get risk narrative | `/api/explain/{cell_id}` | GET | Template-based NLP |
| Get projected risk | `/api/layers/projected?year=Y&scenario=S` | GET | Returns full grid, filter client-side |
| Get financial context | `/api/financial` | GET | Top 50 cells, no per-cell endpoint |
| Get real-time alerts | `/api/alerts` | GET | GDACS + USGS, cached 5 min |
| Get scenarios | `/api/scenarios` | GET | Returns 4 SSP options |
| Get ranking | `/api/ranking?limit=N` | GET | Top-N cells by risk |
| Get stats | `/api/stats` | GET | Aggregate counts |
| Get layers (all cells) | `/api/layers` | GET | Full grid for map rendering |
| Compare two cells | `/api/compare?cell_a=X&cell_b=Y` | GET | Side-by-side comparison |
| Generate report | `/api/report/{cell_id}` | GET | HTML report |
| Execute action | `/api/action/execute?cell_id=X&action=Y` | GET | Acknowledges action |
| WebSocket alerts | `ws://{host}/ws/alerts` | WS | Push every 30s |
| Auth login | `POST /api/auth/login` | POST | Demo-only JWT |
| Auth register | `POST /api/auth/register` | POST | Demo-only JWT |
| Auth me | `GET /api/auth/me?token=X` | GET | Validate token |
| Create project | `POST /api/projects` | POST | Requires auth |
| List projects | `GET /api/projects` | GET | Requires auth |
| Get project | `GET /api/projects/{id}` | GET | Requires auth |
| Update project | `PUT /api/projects/{id}` | PUT | Requires auth |
| Delete project | `DELETE /api/projects/{id}` | DELETE | Requires auth |
| Get portfolio | `GET /api/projects/{id}/portfolio` | GET | Requires auth |

---

## 5. Data Flow Diagram

### Conceptual Flow: Emergency Alert → Risk Context

```
┌─────────────────────────────────────────────────────────────────┐
│  anexo_risk (Emergency Operations Center)                       │
│                                                                 │
│  1. Receives external alert (e.g., from national seismological  │
│     service, meteorological agency, or GDACS)                   │
│                                                                 │
│  2. Extracts: lat, lon, hazard type, severity                   │
│                                                                 │
│  3. Queries GeoRisk for risk context:                           │
│     ┌───────────────────────────────────────────────────────┐   │
│     │  GET /api/search?q={lat},{lon}                        │   │
│     │  → returns { cell_id, lat, lon }                      │   │
│     └───────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│     ┌───────────────────────▼───────────────────────────────┐   │
│     │  GET /api/cell/{cell_id}                              │   │
│     │  → returns { risk_score, n_earthquakes, ... }         │   │
│     └───────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│     ┌───────────────────────▼───────────────────────────────┐   │
│     │  GET /api/events/{cell_id}                            │   │
│     │  → returns [ { type, magnitude, date, distance } ]    │   │
│     └───────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│     ┌───────────────────────▼───────────────────────────────┐   │
│     │  GET /api/economic/{cell_id}                          │   │
│     │  → returns { exposure, annual_loss, bcr }             │   │
│     └───────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│     ┌───────────────────────▼───────────────────────────────┐   │
│     │  GET /api/explain/{cell_id}                           │   │
│     │  → returns { risk_story, hazard_breakdown }           │   │
│     └───────────────────────────────────────────────────────┘   │
│                                                                 │
│  4. Merges responses into unified risk context                  │
│                                                                 │
│  5. Displays in anexo_risk UI:                                  │
│     - Risk score + category                                     │
│     - Historical event timeline                                 │
│     - Economic impact summary                                   │
│     - Recommended actions                                       │
│     - Narrative explanation                                     │
│                                                                 │
│  6. Operator takes decision based on risk context               │
└─────────────────────────────────────────────────────────────────┘
```

### Parallel Flow: Proactive Risk Assessment

```
┌─────────────────────────────────────────────────────────────────┐
│  anexo_risk                                                     │
│                                                                 │
│  1. Queries GeoRisk ranking for top-risk regions:               │
│     GET /api/ranking?limit=20                                   │
│                                                                 │
│  2. For each high-risk cell, fetches:                           │
│     - GET /api/economic/{cell_id}                               │
│     - GET /api/events/{cell_id}                                 │
│                                                                 │
│  3. Queries projected risk for planning horizon:                │
│     GET /api/layers/projected?year=2050&scenario=ssp245         │
│                                                                 │
│  4. Builds risk dashboard for pre-positioning resources         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Known Limitations for Integration

### 6.1 No Unified Query Endpoint
GeoRisk does not offer a single endpoint that returns risk + events + economic + explanation in one call. anexo_risk must make 4–6 sequential HTTP requests to assemble full context.

### 6.2 No Real-Time Push to External Systems
The WebSocket endpoint (`/ws/alerts`) is designed for the GeoRisk frontend. It is not authenticated and does not support external subscribers with filtering.

### 6.3 No Webhook / Callback Mechanism
GeoRisk cannot push alerts to anexo_risk. Integration must be polling-based or event-driven from the anexo_risk side.

### 6.4 Authentication Is Demo-Only
JWT tokens are generated from hardcoded secrets. No real user database, no token refresh, no role-based access control at the API level.

### 6.5 No Multi-Tenant Data Isolation at DB Level
Projects and portfolios are stored in-memory (`_projects_db`). Data is lost on restart. No row-level security.

### 6.6 Alerts Are Cached 5 Minutes
GDACS and USGS alerts are fetched every 5 minutes (`_ALERTS_TTL = 300`). Not suitable for sub-minute response requirements.

### 6.7 Projected Layers Return Full Grid
`/api/layers/projected` returns ALL cells with projected risk. No per-cell projection endpoint. anexo_risk must filter client-side.

### 6.8 No Batch Endpoint for Multiple Cells
No endpoint accepts a list of cell_ids and returns aggregated results. anexo_risk must loop over cells.

### 6.9 No Geospatial Radius Search
No endpoint supports "find all cells within X km of point (lat, lon)." Only exact cell_id lookup or full grid.

### 6.10 Economic Model Is Simplified
The actuarial model uses fixed coefficients (e.g., `0.08` per earthquake). Not calibrated to real insurance data. Results are illustrative, not actuarial-grade.

### 6.11 No LLM-Based Explanation
Risk narratives are template-based, not generated by an LLM. Limited nuance in explanation.

### 6.12 SQLite Ephemeral on Render Free
On Render free tier, the data directory is ephemeral. Projects and portfolios are lost on redeploy.

---

## 7. Future Integration Options

When ready to implement:

### Option A: Direct HTTP Integration
anexo_risk calls GeoRisk REST endpoints directly.

**Pros:** Simple, no new infrastructure.  
**Cons:** Multiple round-trips, no push capability, polling overhead.

```
anexo_risk → HTTP → GeoRisk API (port 8000)
```

### Option B: Shared Database
Both systems read from the same PostgreSQL / SQLite database.

**Pros:** Single source of truth, no API overhead.  
**Cons:** Tight coupling, schema must be coordinated.

```
anexo_risk ──┐
             ├──→ PostgreSQL / SQLite
GeoRisk ─────┘
```

### Option C: Event-Driven (Message Queue)
GeoRisk publishes events to a message queue (Redis Streams, RabbitMQ, Kafka). anexo_risk subscribes.

**Pros:** Real-time push, decoupled, supports filtering.  
**Cons:** Requires message broker infrastructure.

```
GeoRisk → Redis Stream → anexo_risk (subscriber)
```

### Option D: GraphQL Federation
Expose a unified GraphQL schema combining GeoRisk and anexo_risk data.

**Pros:** Single query for all data, flexible.  
**Cons:** Requires GraphQL gateway, significant refactoring.

```
anexo_risk → GraphQL Gateway → GeoRisk resolver + anexo_risk resolver
```

### Recommended Path
**Phase 1:** Option A (Direct HTTP) — quickest to implement, matches current capabilities.  
**Phase 2:** Option C (Event-Driven) — when real-time push is needed.  
**Phase 3:** Option D (GraphQL) — when both systems mature and need flexible querying.

---

## 8. Verification Status

| Capability | Evidence | Status |
|-----------|----------|--------|
| Risk scoring | `main.py:138-158` + `adapters.py` | VERIFIED IN CODE + BY TEST |
| Cell lookup by ID | `main.py:138-158` (_find_cell) | VERIFIED IN CODE |
| Search by name | `main.py:249-260` | VERIFIED IN CODE |
| Ranking | `main.py:239-246` | VERIFIED IN CODE |
| Historical events | `main.py:501-569` | VERIFIED IN CODE |
| Economic impact | `main.py:452-496` | VERIFIED IN CODE |
| Risk explanation | `main.py:896-926` | VERIFIED IN CODE |
| Scenarios (SSP) | `main.py:754-769` | VERIFIED IN CODE |
| Projected layers | `main.py:774-811` | VERIFIED IN CODE |
| Financial indicators | `main.py:721-749` | VERIFIED IN CODE |
| Alerts (GDACS) | `main.py:598-648` | VERIFIED IN CODE |
| Alerts (USGS) | `main.py:651-690` | VERIFIED IN CODE |
| Alerts (WebSocket) | `main.py:984-1008` | VERIFIED IN CODE |
| Auth (login) | `main.py:277-290` | VERIFIED IN CODE |
| Auth (register) | `main.py:293-306` | VERIFIED IN CODE |
| Auth (me) | `main.py:309-317` | VERIFIED IN CODE |
| Projects CRUD | `main.py:325-402` | VERIFIED IN CODE |
| Portfolio | `main.py:405-437` | VERIFIED IN CODE |
| Compare cells | `main.py:931-954` | VERIFIED IN CODE |
| Stats | `main.py:959-974` | VERIFIED IN CODE |
| Report (HTML) | `main.py:845-891` | VERIFIED IN CODE |
| Action execute | `main.py:837-840` | VERIFIED IN CODE |
| Layers (full grid) | `main.py:161-226` | VERIFIED IN CODE |
| H3 hexagon rendering | `main.py:186-190` | VERIFIED IN CODE |
| Trend data | `main.py:816-832` | VERIFIED IN CODE |
| K-means clustering | `adapters.py` + `clustering.py` | VERIFIED IN CODE |
| DBSCAN clustering | `adapters.py` + `clustering.py` | VERIFIED IN CODE |
| Region detection | `main.py:112-135` | VERIFIED IN CODE |
| Batch multiple cells | — | NOT AVAILABLE |
| Radius search | — | NOT AVAILABLE |
| Real-time push to external | — | NOT AVAILABLE |
| Webhook callbacks | — | NOT AVAILABLE |
| LLM-based explanation | — | NOT AVAILABLE |
| Auth with real DB | — | NOT AVAILABLE |

---

*Document generated from GeoRisk V3 codebase analysis. Last verified: 2026-09-08.*
