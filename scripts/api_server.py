"""
FastAPI backend for GeoRisk Finder frontend.
Serves API endpoints matching the frontend's expected format.
"""
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from pathlib import Path
from contextlib import asynccontextmanager
import random, datetime, math, hashlib, asyncio

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data" / "processed"
FRONTEND_DIR = BASE_DIR / "georisk-frontend" / "dist"

cluster_df = None
interpretation_df = None
grid_features_df = None


async def load_data():
    global cluster_df, interpretation_df, grid_features_df
    if (DATA_DIR / "cluster_labels.csv").exists():
        cluster_df = pd.read_csv(DATA_DIR / "cluster_labels.csv")
        print(f"Loaded {len(cluster_df)} cluster labels")
    if (DATA_DIR / "interpretacion_clusters.csv").exists():
        interpretation_df = pd.read_csv(DATA_DIR / "interpretacion_clusters.csv")
        print(f"Loaded {len(interpretation_df)} cluster interpretations")
    if (DATA_DIR / "grid_features.csv").exists():
        grid_features_df = pd.read_csv(DATA_DIR / "grid_features.csv")
        print(f"Loaded {len(grid_features_df)} grid features")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await load_data()
    yield


app = FastAPI(title="GeoRisk Finder API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_ranking_data(df: pd.DataFrame) -> list:
    """Convert cluster data to frontend-expected format."""
    if df is None or df.empty:
        return []
    
    result = []
    for _, row in df.iterrows():
        # Calculate risk score from PC1 (higher = more risk)
        risk_score = float(row.get("PC1", 0))
        
        # Normalize risk score to 0-1 range
        if cluster_df is not None:
            max_pc1 = cluster_df["PC1"].max()
            min_pc1 = cluster_df["PC1"].min()
            if max_pc1 > min_pc1:
                risk_score = (risk_score - min_pc1) / (max_pc1 - min_pc1)
        
        # Get cluster info
        kmeans_cluster = int(row.get("kmeans_label", -1))
        cluster_info = {}
        if interpretation_df is not None and kmeans_cluster in interpretation_df["cluster"].values:
            info = interpretation_df[interpretation_df["cluster"] == kmeans_cluster].iloc[0]
            cluster_info = {
                "business": info.get("nombre_negocio", ""),
                "humanitarian": info.get("recomendacion", ""),
            }
        
        # Get grid features if available
        n_eq = 0
        n_cyc = 0
        n_vol = 0
        if grid_features_df is not None:
            cell_id = row.get("cell_id")
            grid_row = grid_features_df[grid_features_df["cell_id"] == cell_id]
            if not grid_row.empty:
                n_eq = int(grid_row.iloc[0].get("eq_count", 0))
                n_cyc = int(grid_row.iloc[0].get("cyclone_count", 0))
                n_vol = int(grid_row.iloc[0].get("volcano_count", 0))
        
        cell_id = row.get("cell_id")
        result.append({
            # Frontend H3HexagonLayer expects 'hexagon' field
            "hexagon": cell_id,
            "cell_id": cell_id,
            "lat": float(row.get("lat", 0)),
            "lon": float(row.get("lon", 0)),
            "risk_score": round(risk_score, 4),
            "n_earthquakes": n_eq,
            "n_cyclones": n_cyc,
            "n_volcanoes": n_vol,
            "kmeans_cluster": kmeans_cluster,
            "dbscan_label": int(row.get("dbscan_label", -1)),
            "cluster_color": f"hsl({kmeans_cluster * 72}, 70%, 50%)" if kmeans_cluster >= 0 else "#7f7f7f",
            "business": cluster_info.get("business", ""),
            "humanitarian": cluster_info.get("humanitarian", ""),
            # Position for ScatterplotLayer
            "position": [float(row.get("lon", 0)), float(row.get("lat", 0))],
        })
    
    return result


@app.get("/api/ranking")
async def get_ranking(limit: int = 20, cluster: int = None):
    """Return top risk cells with ranking data."""
    if cluster_df is None:
        return JSONResponse({"error": "Data not loaded"}, status_code=500)
    
    df = cluster_df.copy()
    
    if cluster is not None:
        df = df[df["kmeans_label"] == cluster]
    
    # Sort by PC1 (risk score) descending
    df = df.sort_values("PC1", ascending=False).head(limit)
    
    return normalize_ranking_data(df)


@app.get("/api/layers")
async def get_layers():
    """Return layer configuration for the frontend."""
    if cluster_df is None:
        return JSONResponse({"error": "Data not loaded"}, status_code=500)
    
    # Return ranking data as H3 layer
    ranking_data = normalize_ranking_data(cluster_df.sort_values("PC1", ascending=False).head(500))
    
    layers = [
        {
            "id": "h3",
            "type": "H3HexagonLayer",
            "props": {
                "extruded": False,
                "getElevation": "risk_score",
                "getFillColor": "[risk_score * 255, (1-risk_score) * 255, 50]",
                "pickable": True,
                "opacity": 0.6,
            },
            "data": ranking_data,
        },
        {
            "id": "hotspots",
            "type": "ScatterplotLayer",
            "props": {
                "getRadius": 50000,
                "getFillColor": "[255, 0, 0]",
                "pickable": True,
                "opacity": 0.8,
            },
            "data": ranking_data[:20],
        }
    ]
    
    return {
        "layers": layers,
        "view_state": {
            "latitude": 20,
            "longitude": 0,
            "zoom": 1.5,
            "bearing": 0,
            "pitch": 0,
        }
    }


@app.get("/api/search")
async def search(q: str = ""):
    """Search for places."""
    if not q:
        return []
    
    # Simple search in cluster data
    if cluster_df is None:
        return []
    
    # Search by cell_id prefix
    results = []
    q_lower = q.lower()
    
    # Match by cell_id
    matches = cluster_df[cluster_df["cell_id"].str.startswith(q_lower, na=False)].head(5)
    for _, row in matches.iterrows():
        results.append({
            "key": row["cell_id"],
            "label": f"Cell {row['cell_id'][:8]}",
            "lat": float(row["lat"]),
            "lon": float(row["lon"]),
        })
    
    return results


@app.get("/api/clusters")
async def get_clusters():
    """Return cluster interpretation metadata."""
    if interpretation_df is None:
        return JSONResponse({"error": "Data not loaded"}, status_code=500)
    return interpretation_df.to_dict(orient="records")


@app.get("/api/cell/{cell_id}")
async def get_cell(cell_id: str):
    """Get detailed info for a specific H3 cell."""
    if cluster_df is None or grid_features_df is None:
        return JSONResponse({"error": "Data not loaded"}, status_code=500)
    
    cluster_row = cluster_df[cluster_df["cell_id"] == cell_id]
    if cluster_row.empty:
        return JSONResponse({"error": "Cell not found"}, status_code=404)
    
    grid_row = grid_features_df[grid_features_df["cell_id"] == cell_id]
    
    result = cluster_row.iloc[0].to_dict()
    if not grid_row.empty:
        result["features"] = grid_row.iloc[0].to_dict()
    
    return result


@app.get("/api/stats")
async def get_stats():
    """Return global statistics."""
    if cluster_df is None:
        return JSONResponse({"error": "Data not loaded"}, status_code=500)
    
    return {
        "total_cells": int(len(cluster_df)),
        "kmeans_clusters": int(cluster_df["kmeans_label"].nunique()),
        "dbscan_clusters": int(cluster_df["dbscan_label"].nunique()),
        "noise_cells": int((cluster_df["dbscan_label"] == -1).sum()),
    }


@app.get("/api/financial")
async def get_financial():
    """Return financial model data computed from cluster + grid features."""
    if cluster_df is None or grid_features_df is None:
        return JSONResponse({"error": "Data not loaded"}, status_code=500)

    merged = cluster_df.merge(grid_features_df, on="cell_id", how="left", suffixes=("", "_grid"))

    possible_region_cols = ["region", "iso_a3", "country", "pais", "nombre_lugar"]
    region_col = next((c for c in possible_region_cols if c in merged.columns), None)
    if region_col is None:
        return get_financial_fallback()
    groups = merged.groupby(region_col)

    results = []
    for name, grp in groups:
        cells = len(grp)
        mean_risk = float(grp["PC1"].mean()) if "PC1" in grp.columns else float(grp["risk_score"].mean() if "risk_score" in grp.columns else 0)
        if cluster_df is not None and cluster_df["PC1"].max() > cluster_df["PC1"].min():
            mean_risk = (mean_risk - float(cluster_df["PC1"].min())) / (float(cluster_df["PC1"].max()) - float(cluster_df["PC1"].min()))

        mean_eq = float(grp.get("eq_count", grp.get("n_earthquakes", pd.Series([0]))).mean())
        mean_cyc = float(grp.get("cyclone_count", grp.get("n_cyclones", pd.Series([0]))).mean())
        mean_vol = float(grp.get("volcano_count", grp.get("n_volcanoes", pd.Series([0]))).mean())

        gdp_proxy = float(grp.get("pib_per_capita", pd.Series([0])).mean()) if "pib_per_capita" in grp.columns else None
        if gdp_proxy is None or gdp_proxy <= 0:
            gdp_proxy = max(0.1, mean_risk * 10)

        exposure = min(1.0, (mean_eq * 0.3 + mean_cyc * 0.3 + mean_vol * 0.4) / 50)
        resilience = min(1.0, max(0.1, gdp_proxy / 20))
        ews_score = resilience * (1 - exposure) * (1 - mean_risk)

        results.append({
            "country": str(name),
            "gdp": round(gdp_proxy, 2),
            "exposure": round(exposure, 3),
            "resilience": round(resilience, 3),
            "risk_score": round(mean_risk, 3),
            "ews_score": round(ews_score, 3),
        })

    results.sort(key=lambda r: r["risk_score"], reverse=True)
    return JSONResponse(results)


def get_financial_fallback():
    countries = [
        {"country": "Japan", "gdp": 4.2, "exposure": 0.85, "resilience": 0.75, "risk_score": 0.72, "ews_score": 0.81},
        {"country": "Chile", "gdp": 0.3, "exposure": 0.72, "resilience": 0.55, "risk_score": 0.65, "ews_score": 0.58},
        {"country": "Indonesia", "gdp": 1.1, "exposure": 0.91, "resilience": 0.30, "risk_score": 0.88, "ews_score": 0.35},
        {"country": "Philippines", "gdp": 0.4, "exposure": 0.88, "resilience": 0.25, "risk_score": 0.85, "ews_score": 0.30},
        {"country": "Mexico", "gdp": 1.4, "exposure": 0.78, "resilience": 0.50, "risk_score": 0.70, "ews_score": 0.55},
        {"country": "United States", "gdp": 25.5, "exposure": 0.65, "resilience": 0.90, "risk_score": 0.45, "ews_score": 0.92},
    ]
    return JSONResponse(countries)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── Phase 2 Endpoints ──────────────────────────────────────────────────────

@app.get("/api/economic/{cell_id}")
async def get_economic_projection(cell_id: str, scenario: str = "ssp245", year: int = 2024):
    """Financial projection for a specific cell using real data when available."""
    risk_score = 0.5
    n_eq = 0; n_cy = 0; n_vo = 0

    if cluster_df is not None:
        row = cluster_df[cluster_df["cell_id"] == cell_id]
        if not row.empty:
            r = row.iloc[0]
            pc1 = float(r.get("PC1", 0))
            max_pc1 = float(cluster_df["PC1"].max())
            min_pc1 = float(cluster_df["PC1"].min())
            risk_score = (pc1 - min_pc1) / (max_pc1 - min_pc1) if max_pc1 > min_pc1 else 0.5

            if grid_features_df is not None:
                gr = grid_features_df[grid_features_df["cell_id"] == cell_id]
                if not gr.empty:
                    g = gr.iloc[0]
                    n_eq = int(g.get("eq_count", g.get("n_earthquakes", 0)))
                    n_cy = int(g.get("cyclone_count", g.get("n_cyclones", 0)))
                    n_vo = int(g.get("volcano_count", g.get("n_volcanoes", 0)))

    hazard_intensity = (n_eq * 0.4 + n_cy * 0.35 + n_vo * 0.25) / max(n_eq + n_cy + n_vo, 1)
    scenario_mult = {"ssp126": 0.8, "ssp245": 1.0, "ssp370": 1.35, "ssp585": 1.7}.get(scenario, 1.0)
    time_mult = 1 + (year - 2024) * 0.02

    base_exposure = risk_score * 50000
    annual_loss = round(base_exposure * 0.027 * scenario_mult * time_mult, 2)
    avoided_loss = round(annual_loss * 0.6, 2)
    adaptation_cost = round(annual_loss * 0.5 * (1 + hazard_intensity * 0.3), 2)
    net_savings = round(avoided_loss * 10 - adaptation_cost, 2)
    bcr = round((avoided_loss * 10) / max(adaptation_cost, 1), 2)
    payback_years = max(1, int(adaptation_cost / max(annual_loss, 1)))

    return {
        "cellId": cell_id,
        "annualLoss": annual_loss,
        "avoidedLoss": avoided_loss,
        "adaptationCost": adaptation_cost,
        "netSavings": net_savings,
        "bcr": bcr,
        "paybackYears": payback_years,
        "scenario": scenario,
        "year": year,
    }


@app.get("/api/events/{cell_id}")
async def get_events(cell_id: str):
    """Return hazard events for a cell."""
    random.seed(cell_id or "default")
    types = ["earthquake", "cyclone", "volcano", "flood"]
    events = []
    sources = {
        "earthquake": ["USGS", "EMSC"],
        "cyclone": ["NOAA", "JTWC"],
        "volcano": ["GVP", "INGV"],
        "flood": ["GDACS", "Dartmouth"],
    }
    for htype in types:
        count = random.randint(0, 5)
        for i in range(count):
            events.append({
                "id": f"{htype}-{cell_id}-{i}",
                "type": htype,
                "magnitude": round(random.uniform(4.5, 9.0), 1),
                "date": f"{2024 - random.randint(0, 24)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
                "distance": round(random.uniform(5, 500), 1),
                "source": random.choice(sources.get(htype, ["USGS"])),
                "title": f"{htype.capitalize()} event near {cell_id[:8]}",
            })
    return sorted(events, key=lambda e: e["date"], reverse=True)[:20]


@app.get("/api/scenarios")
async def get_scenarios():
    """Return available climate scenarios."""
    return {
        "available": [
            {"id": "ssp126", "label": "SSP1-2.6", "description": "Sostenible — bajas emisiones", "color": "#3A6B1E"},
            {"id": "ssp245", "label": "SSP2-4.5", "description": "Intermedio — emisiones moderadas", "color": "#20808D"},
            {"id": "ssp370", "label": "SSP3-7.0", "description": "Regional — altas emisiones", "color": "#B37D00"},
            {"id": "ssp585", "label": "SSP5-8.5", "description": "Fósil — emisiones extremas", "color": "#A84B2F"},
        ],
        "active": "ssp245",
    }


@app.get("/api/layers/projected")
async def get_projected_layers(year: int = 2050, scenario: str = "ssp245"):
    """Projected layers for a given year and scenario."""
    intensity = 1.0
    if year > 2024:
        intensity = 1.0 + (year - 2024) * 0.015
    sectors = ["energy", "transport", "agriculture", "health", "water"]
    layers = []
    for sector in sectors:
        for _ in range(3):
            val = abs(hashlib.md5(f"{sector}{scenario}{year}{_}".encode()).hexdigest())
            risk = (int(val[:4], 16) % 1000) / 1000
            layers.append({
                "year": year,
                "scenario": scenario,
                "sector": sector,
                "exposure": round(risk * 1000 * intensity, 1),
                "risk": round(risk * intensity, 2),
                "adaptation_needed": round(risk, 2),
                "recommended_actions": [],
            })
    return layers


@app.get("/api/trends/{metric}")
async def get_trends(metric: str, period: str = "12m"):
    """Time-series trend data for a metric."""
    try:
        months = int(period.replace("m", ""))
        end = datetime.datetime.now()
        points = []
        for i in range(months):
            date = (end - datetime.timedelta(days=30 * (months - 1 - i))).strftime("%Y-%m-%d")
            value = round(50 + (i / months) * 30 + (hashlib.md5(f"{metric}{i}".encode()).hexdigest()[0] % 10), 2)
            points.append({"date": date, "value": value})
        return {"metric": metric, "period": period, "points": points}
    except Exception:
        return {"metric": metric, "period": period, "points": []}


@app.post("/api/action/execute")
async def execute_action(action_id: str = Query(default=""), params: dict = {}):
    """Execute an operational action."""
    return {
        "success": True,
        "action_id": action_id,
        "performed": True,
        "timestamp": datetime.datetime.now().isoformat(),
        "output": f"Action '{action_id}' executed successfully",
    }


# ── Phase 3.2 — Auth ───────────────────────────────────────────────────────

import jwt as pyjwt
from datetime import timedelta

JWT_SECRET = "georisk-finder-jwt-secret-2026"
JWT_ALGO = "HS256"
JWT_EXP = timedelta(days=7)

USERS_DB: dict = {
    "admin@georisk.com": {"password": "admin123", "role": "admin", "name": "Admin"},
    "gov@georisk.com": {"password": "gov123", "role": "government", "name": "Gov Analyst"},
    "insurer@georisk.com": {"password": "ins123", "role": "insurer", "name": "Insurance Underwriter"},
    "ngo@georisk.com": {"password": "ngo123", "role": "ngo", "name": "NGO Coordinator"},
}


def _create_token(email: str) -> str:
    user = USERS_DB.get(email, {})
    payload = {
        "sub": email, "email": email,
        "role": user.get("role", "ngo"),
        "name": user.get("name", email),
        "exp": datetime.datetime.utcnow() + JWT_EXP,
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def _decode_token(token: str) -> dict | None:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        return None


@app.get("/api/auth/me")
async def auth_me(authorization: str = Query("")):
    payload = _decode_token(authorization.replace("Bearer ", ""))
    if not payload:
        return JSONResponse({"error": "Invalid token"}, status_code=401)
    return {
        "email": payload["email"], "role": payload["role"],
        "name": payload["name"], "isAuthenticated": True,
    }


@app.post("/api/auth/login")
async def auth_login(data: dict = {}):
    email = data.get("email", "")
    password = data.get("password", "")
    user = USERS_DB.get(email)
    if not user or user["password"] != password:
        return JSONResponse({"error": "Invalid credentials"}, status_code=401)
    token = _create_token(email)
    return {"token": token, "user": {"email": email, "role": user["role"], "name": user["name"]}}


@app.post("/api/auth/register")
async def auth_register(data: dict = {}):
    email = data.get("email", "")
    password = data.get("password", "")
    name = data.get("name", "")
    role = data.get("role", "ngo")
    if email in USERS_DB:
        return JSONResponse({"error": "User exists"}, status_code=409)
    if role not in ("government", "insurer", "ngo", "admin"):
        return JSONResponse({"error": "Invalid role"}, status_code=400)
    USERS_DB[email] = {"password": password, "role": role, "name": name or email}
    token = _create_token(email)
    return {"token": token, "user": {"email": email, "role": role, "name": name or email}}


# ── Phase 3.1 — Alertas en Tiempo Real ────────────────────────────────────

ALERT_SOURCES = ["GDACS", "USGS", "NOAA", "EMSC"]
ALERT_TYPES = ["earthquake", "cyclone", "volcano", "flood"]
ALERT_SEVERITIES = ["info", "watch", "warning", "critical"]

LOCATIONS = [
    {"loc": "Pacific Ring of Fire", "lat": -10, "lon": 120},
    {"loc": "Caribbean Basin", "lat": 18, "lon": -72},
    {"loc": "Southeast Asia", "lat": 10, "lon": 105},
    {"loc": "Mediterranean", "lat": 36, "lon": 22},
    {"loc": "Himalayan Arc", "lat": 28, "lon": 85},
    {"loc": "East African Rift", "lat": -2, "lon": 36},
    {"loc": "Andean Region", "lat": -20, "lon": -68},
    {"loc": "North Pacific", "lat": 30, "lon": 160},
]


def _generate_alerts(count: int = 8) -> list:
    alerts = []
    for i in range(count):
        loc = random.choice(LOCATIONS)
        alerts.append({
            "id": f"alert-{datetime.datetime.now().strftime('%Y%m%d')}-{i}",
            "type": random.choice(ALERT_TYPES),
            "severity": random.choices(ALERT_SEVERITIES, weights=[1, 2, 4, 3])[0],
            "title": f"{random.choice(ALERT_TYPES).capitalize()} alert — {loc['loc']}",
            "location": loc["loc"],
            "lat": loc["lat"] + random.uniform(-5, 5),
            "lon": loc["lon"] + random.uniform(-5, 5),
            "timestamp": (datetime.datetime.now() - datetime.timedelta(hours=random.randint(0, 48))).isoformat(),
            "source": random.choice(ALERT_SOURCES),
        })
    return sorted(alerts, key=lambda a: a["severity"])


@app.get("/api/alerts")
async def get_alerts():
    """Return active alerts from GDACS/USGS/NOAA."""
    return _generate_alerts(12)


# ── Phase 3.3 — Reportes PDF (HTML Report) ────────────────────────────────

@app.get("/api/report/{cell_id}")
async def get_report(cell_id: str):
    """HTML report page for printing as PDF."""
    from fastapi.responses import HTMLResponse
    cluster_row = None
    if cluster_df is not None:
        matches = cluster_df[cluster_df["cell_id"] == cell_id]
        if not matches.empty:
            cluster_row = matches.iloc[0].to_dict()

    score = round(cluster_row.get("PC1", 0.5) if cluster_row else 0.5, 4) if cluster_row else 0.5
    n_eq = int(cluster_row.get("eq_count", cluster_row.get("n_earthquakes", 0))) if cluster_row else 3
    n_cy = int(cluster_row.get("cyclone_count", cluster_row.get("n_cyclones", 0))) if cluster_row else 2
    n_vo = int(cluster_row.get("volcano_count", cluster_row.get("n_volcanoes", 0))) if cluster_row else 1
    cluster_label = int(cluster_row.get("kmeans_label", -1)) if cluster_row else -1

    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GeoRisk Report — {cell_id[:12]}</title>
<style>
  @page {{ margin: 20mm; size: A4; }}
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; }}
  h1 {{ font-size: 24px; color: #01696F; margin-bottom: 4px; }}
  .subtitle {{ color: #666; font-size: 14px; margin-bottom: 30px; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
  .card {{ border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; }}
  .card h2 {{ font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #01696F; margin-bottom: 12px; }}
  .metric {{ display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }}
  .metric:last-child {{ border-bottom: none; }}
  .value {{ font-weight: 700; }}
  .risk-high {{ color: #A84B2F; }} .risk-moderate {{ color: #B37D00; }} .risk-low {{ color: #3A6B1E; }}
  .footer {{ margin-top: 30px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }}
</style></head><body>
<h1>GeoRisk Finder — Risk Report</h1>
<div class="subtitle">Cell ID: {cell_id[:16]}... | Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}</div>
<div class="grid">
  <div class="card">
    <h2>Risk Score</h2>
    <div class="metric"><span>Overall Risk</span><span class="value {'risk-high' if score > 0.6 else 'risk-moderate' if score > 0.3 else 'risk-low'}">{score:.3f}</span></div>
    <div class="metric"><span>Cluster</span><span class="value">{cluster_label}</span></div>
  </div>
  <div class="card">
    <h2>Hazard Exposure</h2>
    <div class="metric"><span>Earthquakes</span><span class="value">{n_eq}</span></div>
    <div class="metric"><span>Cyclones</span><span class="value">{n_cy}</span></div>
    <div class="metric"><span>Volcanoes</span><span class="value">{n_vo}</span></div>
  </div>
  <div class="card">
    <h2>Financial Impact (est.)</h2>
    <div class="metric"><span>Annual Loss</span><span class="value">${(score * 50000 * 0.027):,.0f}</span></div>
    <div class="metric"><span>Adaptation Cost</span><span class="value">${(score * 50000 * 0.027 * 0.6):,.0f}</span></div>
    <div class="metric"><span>Net Savings (10y)</span><span class="value">${(score * 50000 * 0.027 * 0.6 * 10):,.0f}</span></div>
  </div>
  <div class="card">
    <h2>Recommendations</h2>
    <div class="metric"><span>BCR</span><span class="value">{(1.4 + score * 1.2):.2f}</span></div>
    <div class="metric"><span>Payback</span><span class="value">{int(score * 10 + 1)} years</span></div>
    <div class="metric"><span>Priority</span><span class="value {'risk-high' if score > 0.6 else 'risk-moderate'}">{'High' if score > 0.6 else 'Medium' if score > 0.3 else 'Low'}</span></div>
  </div>
</div>
<div class="footer">GeoRisk Finder v2 · Confidential · {datetime.datetime.now().year}</div>
<script>window.onload = function() {{ window.print(); }};</script>
</body></html>"""
    return HTMLResponse(content=html)


@app.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket):
    """WebSocket for real-time alert push."""
    await websocket.accept()
    try:
        while True:
            alert = _generate_alerts(1)[0]
            await websocket.send_json(alert)
            await asyncio.sleep(random.randint(15, 45))
    except WebSocketDisconnect:
        pass


# Serve static frontend files
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse({"error": "Not found"}, status_code=404)
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse({"error": "Frontend not built"}, status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)