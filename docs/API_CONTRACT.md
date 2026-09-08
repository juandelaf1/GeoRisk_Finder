# GeoRisk Finder V3 — API Contract

> Auto-generated from `main.py`. All field names, types, and response shapes are exact to the implementation.

---

## Table of Contents

1. [Base URL](#base-url)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Caching Behavior](#caching-behavior)
5. [Endpoints](#endpoints)
   - 5.1 [Geospatial](#1-geospatial)
   - 5.2 [Risk](#2-risk)
   - 5.3 [Events](#3-events)
   - 5.4 [Scenarios](#4-scenarios)
   - 5.5 [Economics](#5-economics)
   - 5.6 [Financial](#6-financial)
   - 5.7 [Explainability](#7-explainability)
   - 5.8 [Alerts](#8-alerts)
   - 5.9 [Projects](#9-projects)
   - 5.10 [Auth](#10-auth)
   - 5.11 [Actions](#11-actions)
   - 5.12 [Reports](#12-reports)
   - 5.13 [Compare](#13-compare)
   - 5.14 [Search](#14-search)
   - 5.15 [Trends](#15-trends)

---

## Base URL

```
http://localhost:8000
```

In production (Render/Docker), the same origin serves both the API and the static frontend.

---

## Authentication

**Mechanism:** SHA-256 token (DEMO — not production-grade).

- Tokens are generated server-side via `_make_token(email)` which hashes `email:expiry:secret_key`.
- Token is passed as a **query parameter** `?token=...` on protected endpoints.
- No JWT library is used; tokens are not cryptographically signed with asymmetric keys.

**Demo users (hardcoded):**

| Email | Password | Role |
|-------|----------|------|
| `admin@georisk.com` | `admin123` | `admin` |
| `gov@georisk.com` | `gov123` | `government` |
| `insurer@georisk.com` | `ins123` | `insurer` |
| `ngo@georisk.com` | `ngo123` | `ngo` |

**Registration:** Creates in-memory user (lost on server restart).

---

## Rate Limiting

None. No rate limiting is implemented on any endpoint.

---

## Caching Behavior

| Cache | TTL | Scope |
|-------|-----|-------|
| `_layers_cache` (global, module-level) | Until server restart | `GET /api/layers` |
| `_ranking_cache` (per `limit` value) | Until server restart | `GET /api/ranking` |
| `_alerts_cache` (module-level) | 300 seconds (5 min) | `GET /api/alerts`, `WS /ws/alerts` |
| `_projects_db` (in-memory dict) | Until server restart | All `/api/projects/*` |

---

## Endpoints

### 1. Geospatial

---

#### GET /api/layers

**Description:** Returns all active map layers (graticule, H3 hexagons, earthquakes, cyclones, volcanoes, heatmap, plate boundaries) with their deck.gl configuration.

**Auth required:** No

**Data source:** Real (preprocessed H3 data + live-cached adapter data)

**Request:**

- Query params: None

**Response:**

```json
{
  "layers": [
    {
      "id": "string",
      "type": "string",
      "data": [{}],
      "pickable": false,
      "props": {}
    }
  ],
  "view_state": {
    "latitude": 15,
    "longitude": 0,
    "zoom": 1.5,
    "pitch": 0,
    "bearing": 0
  }
}
```

**Layer IDs and types:**

| ID | Type | Description |
|----|------|-------------|
| `graticule` | `PathLayer` | Lat/lon grid lines |
| `h3` | `H3HexagonLayer` | Risk-scored H3 cells |
| `earthquakes` | `ScatterplotLayer` | Earthquake epicenters |
| `cyclones` | `PathLayer` | Cyclone tracks |
| `volcanoes` | `ScatterplotLayer` | Volcano locations |
| `heatmap` | `HeatmapLayer` | Risk heatmap |
| `plates` | `PathLayer` | Tectonic plate boundaries |

**H3 record shape:**

```json
{
  "cell_id": "string",
  "lat": 0.0,
  "lon": 0.0,
  "risk_score": 0.0,
  "pc1": 0.0,
  "kmeans_cluster": 0,
  "dbscan_label": 0,
  "elevation": 0.0,
  "color": [0, 0, 0, 0],
  "cluster_color": [0, 0, 0, 0],
  "h3_index": "string",
  "n_earthquakes": 0,
  "n_cyclones": 0,
  "n_volcanoes": 0,
  "year": 0
}
```

**Error behavior:** Returns 500 if DataAdapters fail to load.

---

#### GET /api/layers/projected

**Description:** Returns projected H3 layer with risk scores adjusted by scenario and year.

**Auth required:** No

**Data source:** Modelled (base data is real; projections are modelled via `_SCENARIO_MULTIPLIERS`)

**Request:**

- Query params:
  - `year` (int, default `2050`): Target projection year
  - `scenario` (str, default `"ssp245"`): Climate scenario ID

**Response:**

```json
[
  {
    "id": "h3-projected",
    "type": "H3HexagonLayer",
    "data": [
      {
        "cell_id": "string",
        "lat": 0.0,
        "lon": 0.0,
        "risk_score": 0.0,
        "pc1": 0.0,
        "kmeans_cluster": 0,
        "dbscan_label": 0,
        "elevation": 0.0,
        "color": [0, 0, 0, 0],
        "cluster_color": [0, 0, 0, 0],
        "h3_index": "string",
        "n_earthquakes": 0,
        "n_cyclones": 0,
        "n_volcanoes": 0,
        "year": 0
      }
    ],
    "pickable": true,
    "props": {
      "getHexagon": "h3_index",
      "getFillColor": "color",
      "getElevation": 0,
      "elevationScale": 0,
      "extruded": false,
      "opacity": 0.6,
      "lineWidthMinPixels": 0.3,
      "getLineColor": [42, 53, 80, 100]
    }
  }
]
```

**Error behavior:** Returns `[]` if H3 data is empty.

**Projection formula:** `year_factor = 1.0 + (year - 2024) * 0.003 * scenario_multiplier`

---

### 2. Risk

---

#### GET /api/ranking

**Description:** Returns top N cells ranked by risk score (descending).

**Auth required:** No

**Data source:** Real (from preprocessed H3 data)

**Request:**

- Query params:
  - `limit` (int, default `10`, min `1`, max `100`): Number of results

**Response:**

```json
[
  {
    "cell_id": "string",
    "lat": 0.0,
    "lon": 0.0,
    "risk_score": 0.0,
    "n_earthquakes": 0,
    "n_cyclones": 0,
    "n_volcanoes": 0,
    "kmeans_cluster": 0,
    "dbscan_label": 0,
    "region": "string"
  }
]
```

**Error behavior:** Returns 422 on validation error for `limit` out of range.

---

#### GET /api/cell/{cell_id}

**Description:** Returns full detail for a single H3 cell.

**Auth required:** No

**Data source:** Real

**Request:**

- Path params:
  - `cell_id` (string): H3 cell identifier

**Response:**

```json
{
  "cell_id": "string",
  "lat": 0.0,
  "lon": 0.0,
  "risk_score": 0.0,
  "n_earthquakes": 0,
  "n_cyclones": 0,
  "n_volcanoes": 0,
  "kmeans_cluster": 0,
  "dbscan_label": 0,
  "region": "string"
}
```

**Error behavior:** 404 with `"Cell not found"` if cell_id does not exist in H3 data.

---

#### GET /api/stats

**Description:** Returns aggregate statistics across the entire dataset.

**Auth required:** No

**Data source:** Real (computed from adapter data)

**Request:**

- Query params: None

**Response:**

```json
{
  "total_cells": 0,
  "mean_risk": 0.0,
  "critical_cells": 0,
  "high_cells": 0,
  "total_earthquakes": 0,
  "total_cyclones": 0,
  "total_volcanoes": 0
}
```

**Error behavior:** Returns zeroed stats if H3 data is empty.

**Thresholds:** `critical_cells` = risk_score >= 0.7; `high_cells` = risk_score >= 0.4 AND < 0.7.

---

### 3. Events

---

#### GET /api/events/{cell_id}

**Description:** Returns nearby hazard events (earthquakes, volcanoes, cyclones) for a given cell, sorted by date descending. Max 20 results.

**Auth required:** No

**Data source:** Real

**Request:**

- Path params:
  - `cell_id` (string): H3 cell identifier

**Response:**

```json
[
  {
    "id": "string",
    "type": "earthquake | volcano | cyclone",
    "magnitude": 0.0,
    "date": "string",
    "distance": 0.0,
    "source": "USGS | GVP | IBTrACS",
    "title": "string"
  }
]
```

**Event ID prefixes:**
- `eq-{cell_id}-{index}` for earthquakes
- `vol-{cell_id}-{index}` for volcanoes
- `cyc-{cell_id}-{index}` for cyclones

**Distance:** Euclidean lat/lon distance multiplied by 111 (approx km per degree).

**Error behavior:** 404 with `"Cell not found"` if cell_id does not exist.

---

### 4. Scenarios

---

#### GET /api/scenarios

**Description:** Returns the list of available climate scenarios.

**Auth required:** No

**Data source:** Real (hardcoded)

**Request:**

- Query params: None

**Response:**

```json
[
  {
    "id": "ssp126",
    "label": "SSP1-2.6",
    "description": "Sostenible — bajas emisiones",
    "color": "#3A6B1E"
  },
  {
    "id": "ssp245",
    "label": "SSP2-4.5",
    "description": "Intermedio — emisiones moderadas",
    "color": "#20808D"
  },
  {
    "id": "ssp370",
    "label": "SSP3-7.0",
    "description": "Regional — altas emisiones",
    "color": "#B37D00"
  },
  {
    "id": "ssp585",
    "label": "SSP5-8.5",
    "description": "Fósil — emisiones extremas",
    "color": "#A84B2F"
  }
]
```

**Error behavior:** Never errors (static data).

---

### 5. Economics

---

#### GET /api/economic/{cell_id}

**Description:** Returns actuarial economic impact analysis for a cell: exposure, annual expected loss, adaptation cost, BCR, payback period.

**Auth required:** No

**Data source:** Derived (modelled from real hazard data via actuarial formula)

**Request:**

- Path params:
  - `cell_id` (string): H3 cell identifier

**Response:**

```json
{
  "cell_id": "string",
  "risk_score": 0.0,
  "exposure": 0.0,
  "annual_loss": 0.0,
  "cost_of_inaction_10y": 0.0,
  "adaptation_cost": 0.0,
  "net_savings_10y": 0.0,
  "bcr": 0.0,
  "payback_years": 0.0,
  "break_even_years": 0.0,
  "hazard_factor": 0.0,
  "n_earthquakes": 0,
  "n_cyclones": 0,
  "n_volcanoes": 0
}
```

**Formulas:**

| Field | Formula |
|-------|---------|
| `hazard_factor` | `1.0 + (eq * 0.08) + (cyc * 0.12) + (vol * 0.05)` |
| `exposure` | `risk_score * 50000 * hazard_factor` |
| `annual_loss` | `exposure * (eq_loss_prob + cyc_loss_prob + vol_loss_prob) / max(hazard_factor, 1)` |
| `adaptation_cost` | `annual_loss * 3.5` |
| `cost_of_inaction_10y` | `annual_loss * 10` |
| `net_savings_10y` | `(annual_loss * 10 * 0.6) - adaptation_cost` |
| `bcr` | `(annual_loss * 10 * 0.6) / adaptation_cost` |
| `payback_years` | `adaptation_cost / (annual_loss * 0.6)` |
| `break_even_years` | Same as `payback_years` |

**Units:** USD (approximate, modelled). `break_even_years` in years.

**Error behavior:** 404 with `"Cell not found"` if cell_id does not exist.

---

### 6. Financial

---

#### GET /api/financial

**Description:** Returns financial summary (GDP proxy, exposure, resilience, EWS score) for top 50 cells by risk.

**Auth required:** No

**Data source:** Derived (computed from ranking data)

**Request:**

- Query params: None

**Response:**

```json
[
  {
    "country": "string",
    "gdp": 0.0,
    "exposure": 0.0,
    "resilience": 0.0,
    "risk_score": 0.0,
    "ews_score": 0.0
  }
]
```

**Field derivation:**

| Field | Formula |
|-------|---------|
| `country` | `region` from ranking data |
| `gdp` | `exposure * 0.0012` |
| `exposure` | `risk_score * 50000 * (1.0 + eq*0.08 + cyc*0.12 + vol*0.05)` |
| `resilience` | `clamp(1.0 - risk_score * 0.7, 0.1, 0.95)` |
| `ews_score` | `min(0.9, 0.3 + (eq + cyc + vol) * 0.02)` |

**Units:** `gdp` and `exposure` in USD (approximate). `resilience` and `ews_score` are 0-1 scale.

**Error behavior:** Never errors (returns empty array if no data).

---

### 7. Explainability

---

#### GET /api/explain/{cell_id}

**Description:** Returns human-readable risk narrative and hazard breakdown for a cell.

**Auth required:** No

**Data source:** Derived (composed from real cell data)

**Request:**

- Path params:
  - `cell_id` (string): H3 cell identifier

**Response:**

```json
{
  "cell_id": "string",
  "risk_story": "string",
  "hazard_breakdown": [
    {
      "type": "earthquake | cyclone | volcano",
      "count": 0,
      "label": "string"
    }
  ],
  "risk_score": 0.0,
  "region": "string"
}
```

**Risk story format:** `"This location has a risk score of {score:.2f} ({critical|high|moderate|low}). Historical data shows {list of hazards}."`

**Risk level thresholds:** `> 0.7` = critical, `> 0.4` = high, `> 0.2` = moderate, else low.

**Error behavior:** 404 with `"Cell not found"` if cell_id does not exist.

---

### 8. Alerts

---

#### GET /api/alerts

**Description:** Returns merged alerts from GDACS and USGS, sorted by timestamp descending. Cached for 5 minutes.

**Auth required:** No

**Data source:** Real (live fetch from GDACS RSS + USGS GeoJSON feeds)

**Request:**

- Query params: None

**Response:**

```json
[
  {
    "id": "string",
    "type": "earthquake | cyclone | volcano | flood",
    "severity": "info | watch | warning | critical",
    "title": "string",
    "location": "string",
    "lat": 0.0,
    "lon": 0.0,
    "timestamp": "string (ISO 8601)",
    "source": "GDACS | USGS"
  }
]
```

**Severity mapping (GDACS):**

| GDACS Color | Severity |
|-------------|----------|
| Green | `info` |
| Yellow | `watch` |
| Orange | `warning` |
| Red | `critical` |

**Severity mapping (USGS):**

| Magnitude | Severity |
|-----------|----------|
| >= 7 | `critical` |
| >= 6 | `warning` |
| >= 5 | `watch` |
| < 5 | `info` |

**Type mapping (GDACS prefix):**

| Prefix | Type |
|--------|------|
| EQ | `earthquake` |
| TC | `cyclone` |
| VO | `volcano` |
| FL, DR, WF | `flood` |

**Error behavior:** Returns `[]` if both feeds fail (with warning logged).

---

#### WS /ws/alerts

**Description:** WebSocket endpoint that pushes alert updates every 30 seconds. Sends initial alert batch on connect.

**Auth required:** No

**Data source:** Real (same as `/api/alerts`)

**Messages sent:**

```json
{
  "type": "init | update",
  "alerts": [
    {
      "id": "string",
      "type": "string",
      "severity": "string",
      "title": "string",
      "location": "string",
      "lat": 0.0,
      "lon": 0.0,
      "timestamp": "string",
      "source": "string"
    }
  ]
}
```

**Error behavior:** Connection closes on error. No reconnection logic server-side.

---

### 9. Projects

---

#### POST /api/projects

**Description:** Creates a new project (multi-tenant).

**Auth required:** Yes (query param `?token=`)

**Data source:** Real (in-memory store, volatile)

**Request:**

- Query params:
  - `token` (string): Auth token
- Body:

```json
{
  "name": "string",
  "description": "string (optional, default \"\")",
  "cell_ids": ["string"] (optional, default []),
  "scenario": "string (optional, default \"ssp245\")",
  "tags": ["string"] (optional, default [])
}
```

**Response:**

```json
{
  "id": "proj-{12-char-hex}",
  "owner": "string (email)",
  "name": "string",
  "description": "string",
  "cell_ids": ["string"],
  "scenario": "string",
  "tags": ["string"],
  "created_at": "string (ISO 8601)",
  "updated_at": "string (ISO 8601)"
}
```

**Error behavior:** 401 with `"Invalid token"` if token is invalid.

---

#### GET /api/projects

**Description:** Lists all projects owned by the authenticated user.

**Auth required:** Yes (query param `?token=`)

**Data source:** Real (in-memory store)

**Request:**

- Query params:
  - `token` (string): Auth token

**Response:**

```json
[
  {
    "id": "string",
    "owner": "string",
    "name": "string",
    "description": "string",
    "cell_ids": ["string"],
    "scenario": "string",
    "tags": ["string"],
    "created_at": "string",
    "updated_at": "string"
  }
]
```

**Error behavior:** 401 with `"Invalid token"` if token is invalid.

---

#### GET /api/projects/{project_id}

**Description:** Returns a single project by ID (owner-scoped).

**Auth required:** Yes (query param `?token=`)

**Data source:** Real (in-memory store)

**Request:**

- Path params:
  - `project_id` (string): Project ID
- Query params:
  - `token` (string): Auth token

**Response:**

```json
{
  "id": "string",
  "owner": "string",
  "name": "string",
  "description": "string",
  "cell_ids": ["string"],
  "scenario": "string",
  "tags": ["string"],
  "created_at": "string",
  "updated_at": "string"
}
```

**Error behavior:** 401 with `"Invalid token"` if token invalid. 404 with `"Project not found"` if not found or not owned by user.

---

#### PUT /api/projects/{project_id}

**Description:** Updates an existing project.

**Auth required:** Yes (query param `?token=`)

**Data source:** Real (in-memory store)

**Request:**

- Path params:
  - `project_id` (string): Project ID
- Query params:
  - `token` (string): Auth token
- Body:

```json
{
  "name": "string",
  "description": "string",
  "cell_ids": ["string"],
  "scenario": "string",
  "tags": ["string"]
}
```

**Response:** Same shape as `GET /api/projects/{project_id}` with `updated_at` refreshed.

**Error behavior:** 401 with `"Invalid token"` if token invalid. 404 with `"Project not found"` if not found or not owned by user.

---

#### DELETE /api/projects/{project_id}

**Description:** Deletes a project.

**Auth required:** Yes (query param `?token=`)

**Data source:** Real (in-memory store)

**Request:**

- Path params:
  - `project_id` (string): Project ID
- Query params:
  - `token` (string): Auth token

**Response:**

```json
{
  "deleted": true
}
```

**Error behavior:** 401 with `"Invalid token"` if token invalid. 404 with `"Project not found"` if not found or not owned by user.

---

#### GET /api/projects/{project_id}/portfolio

**Description:** Returns portfolio analysis for a project: all cells with risk data, plus summary stats (total exposure, avg risk, critical count).

**Auth required:** Yes (query param `?token=`)

**Data source:** Derived (computed from project cells + real H3 data)

**Request:**

- Path params:
  - `project_id` (string): Project ID
- Query params:
  - `token` (string): Auth token

**Response:**

```json
{
  "project": {
    "id": "string",
    "owner": "string",
    "name": "string",
    "description": "string",
    "cell_ids": ["string"],
    "scenario": "string",
    "tags": ["string"],
    "created_at": "string",
    "updated_at": "string"
  },
  "cells": [
    {
      "cell_id": "string",
      "lat": 0.0,
      "lon": 0.0,
      "risk_score": 0.0,
      "n_earthquakes": 0,
      "n_cyclones": 0,
      "n_volcanoes": 0,
      "kmeans_cluster": 0,
      "dbscan_label": 0,
      "region": "string"
    }
  ],
  "summary": {
    "total_exposure": 0,
    "avg_risk": 0.0,
    "count": 0,
    "critical_cells": 0
  }
}
```

**Summary formulas:**
- `total_exposure` = `sum(cell.risk_score * 50000 for cell in cells)`
- `avg_risk` = `sum(cell.risk_score for cell in cells) / len(cells)`
- `critical_cells` = `count(cell.risk_score >= 0.7)`

**Error behavior:** 401 with `"Invalid token"`. 404 with `"Project not found"`. Returns empty `cells` and zeroed summary if no valid cell_ids.

---

### 10. Auth

---

#### POST /api/auth/login

**Description:** Authenticates a user against demo credentials and returns a token.

**Auth required:** No

**Data source:** Real (hardcoded demo users)

**Request:**

- Body:

```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**

```json
{
  "token": "string (sha256 hex)",
  "user": {
    "email": "string",
    "name": "string",
    "role": "admin | government | insurer | ngo"
  }
}
```

**Error behavior:** 401 with `"Invalid credentials"` if email not found or password mismatch.

---

#### POST /api/auth/register

**Description:** Registers a new user (in-memory only).

**Auth required:** No

**Data source:** Real (in-memory, volatile)

**Request:**

- Body:

```json
{
  "email": "string",
  "password": "string",
  "name": "string",
  "role": "string"
}
```

**Response:**

```json
{
  "token": "string (sha256 hex)",
  "user": {
    "email": "string",
    "name": "string",
    "role": "string"
  }
}
```

**Error behavior:** 409 with `"User already exists"` if email is already registered.

---

#### GET /api/auth/me

**Description:** Returns the authenticated user profile from a token.

**Auth required:** Yes (query param `?token=`)

**Data source:** Real

**Request:**

- Query params:
  - `token` (string): Auth token

**Response:**

```json
{
  "email": "string",
  "name": "string",
  "role": "string"
}
```

**Error behavior:** 401 with `"Invalid token"` if token is invalid. 404 with `"User not found"` if email not in DEMO_USERS.

---

### 11. Actions

---

#### GET /api/action/execute

**Description:** Acknowledges an action on a cell (logging only, no side effects).

**Auth required:** No

**Data source:** Real (no data operation; logs action)

**Request:**

- Query params:
  - `cell_id` (string): Cell ID
  - `action` (string): Action identifier

**Response:**

```json
{
  "success": true,
  "action": "string",
  "cell_id": "string",
  "status": "acknowledged"
}
```

**Error behavior:** Never errors (always returns success).

---

### 12. Reports

---

#### GET /api/report/{cell_id}

**Description:** Returns a full HTML risk report for a cell (browser-renderable).

**Auth required:** No

**Data source:** Derived (composed from real cell data)

**Request:**

- Path params:
  - `cell_id` (string): H3 cell identifier

**Response:** `text/html` — Full HTML document with:

- Cell metadata
- Risk score (large, color-coded)
- Risk category: `Critical` (>= 0.75), `High` (>= 0.5), `Moderate` (>= 0.25), `Low` (< 0.25)
- Metrics table: risk_score, n_earthquakes, n_cyclones, n_volcanoes, kmeans_cluster, region
- Economic impact: Total Exposure (`score * 50000`), Annual Expected Loss (`score * 50000 * 0.027`)

**Category colors:**

| Category | Hex |
|----------|-----|
| Critical | `#A84B2F` |
| High | `#B37D00` |
| Moderate | `#7A3B49` |
| Low | `#3A6B1E` |

**Error behavior:** 404 with `"Cell not found"` if cell_id does not exist.

---

### 13. Compare

---

#### GET /api/compare

**Description:** Side-by-side comparison of two cells across risk metrics, with winner indicated per metric.

**Auth required:** No

**Data source:** Real

**Request:**

- Query params:
  - `cell_a` (string): First cell ID
  - `cell_b` (string): Second cell ID

**Response:**

```json
{
  "cell_a": {
    "cell_id": "string",
    "lat": 0.0,
    "lon": 0.0,
    "risk_score": 0.0,
    "n_earthquakes": 0,
    "n_cyclones": 0,
    "n_volcanoes": 0,
    "kmeans_cluster": 0,
    "dbscan_label": 0,
    "region": "string"
  },
  "cell_b": {
    "cell_id": "string",
    "lat": 0.0,
    "lon": 0.0,
    "risk_score": 0.0,
    "n_earthquakes": 0,
    "n_cyclones": 0,
    "n_volcanoes": 0,
    "kmeans_cluster": 0,
    "dbscan_label": 0,
    "region": "string"
  },
  "comparisons": [
    {
      "label": "Risk Score | Earthquakes | Cyclones | Volcanoes",
      "a": 0.0,
      "b": 0.0,
      "winner": "A | B | null"
    }
  ]
}
```

**Winner logic:** Lower is better for all metrics. Returns `"A"` if `a < b`, `"B"` if `b < a`, `null` if equal.

**Error behavior:** 404 with `"One or both cells not found"` if either cell_id is invalid.

---

### 14. Search

---

#### GET /api/search

**Description:** Searches for a location by name and returns lat/lon.

**Auth required:** No

**Data source:** Real (adapter search)

**Request:**

- Query params:
  - `q` (string, min length 1): Search query

**Response:**

```json
[
  {
    "key": "string (lowercase, underscored)",
    "label": "string (title case)",
    "lat": 0.0,
    "lon": 0.0
  }
]
```

**Key format:** `q.lower().replace(" ", "_")`

**Error behavior:** Returns `[]` if no match found (never errors).

---

### 15. Trends

---

#### GET /api/trends

**Description:** Returns time-series trend data for a metric over a period. Values are modelled (synthetic trend on top of real baseline).

**Auth required:** No

**Data source:** Modelled (real baseline + synthetic variation)

**Request:**

- Query params:
  - `metric` (string, default `"risk"`): Metric name (for reference only, not used in calculation)
  - `period` (string, default `"12m"`): Time period (e.g., `"6m"`, `"12m"`)

**Response:**

```json
{
  "metric": "string",
  "period": "string",
  "points": [
    {
      "date": "YYYY-MM",
      "value": 0.0
    }
  ]
}
```

**Generation formula:** Each point = `base + (months - i) * 0.3 + random(-2, 2)` where `base` = mean risk score of top 50 cells * 100.

**Error behavior:** Never errors (returns empty points if no ranking data).

---

## Appendix A: Error Response Format

All HTTP errors follow FastAPI's default format:

```json
{
  "detail": "string"
}
```

Status codes used:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 401 | Unauthorized (invalid token or credentials) |
| 404 | Not found (cell, project, or user) |
| 409 | Conflict (user already exists) |
| 422 | Validation error (query param constraints) |
| 500 | Internal server error |

---

## Appendix B: Data Sources Summary

| Source | Used In | Type |
|--------|---------|------|
| USGS Earthquake Catalog | `/api/alerts`, `/api/events/{cell_id}` | Real-time |
| GDACS RSS Feed | `/api/alerts` | Real-time |
| IBTrACS Cyclone Track Data | `/api/events/{cell_id}` | Historical |
| GVP Volcano Database | `/api/events/{cell_id}` | Historical |
| Tectonic Plate Boundaries (GitHub) | `/api/layers` | Static GeoJSON |
| Preprocessed H3 Grid | All risk endpoints | Preprocessed CSV |
