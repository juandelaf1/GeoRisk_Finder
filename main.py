import hashlib
import hmac
import json
import logging
import random
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.data.adapters import DataAdapters

SECRET_KEY = "georisk-v3-secret-key-2026"
DEMO_USERS = {
    "admin@georisk.com": {"password": "admin123", "name": "Admin User", "role": "admin"},
    "gov@georisk.com": {"password": "gov123", "name": "Government Analyst", "role": "government"},
    "insurer@georisk.com": {"password": "ins123", "name": "Insurance Underwriter", "role": "insurer"},
    "ngo@georisk.com": {"password": "ngo123", "name": "NGO Coordinator", "role": "ngo"},
}


def _make_token(email: str) -> str:
    payload = f"{email}:{datetime.now(timezone.utc).timestamp() + 86400}:{SECRET_KEY}"
    return hashlib.sha256(payload.encode()).hexdigest()


def _verify_token(token: str) -> str | None:
    for email in DEMO_USERS:
        if _make_token(email) == token:
            return email
    return None


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("georisk")


@lru_cache(maxsize=1)
def _get_adapters() -> DataAdapters:
    return DataAdapters()


@asynccontextmanager
async def lifespan(app):
    logger.info("Warming up DataAdapters cache...")
    adapters = _get_adapters()
    adapters.load_h3(force_preprocess=False)
    adapters.load_earthquakes()
    adapters.load_cyclones()
    adapters.load_volcanoes()
    logger.info("DataAdapters cache warmed up")
    logger.info("Warming up layers cache...")
    try:
        serialize_active_layers()
        logger.info("Layers cache warmed up")
    except Exception as e:
        logger.warning(f"Layers cache warmup failed: {e}")
    yield


app = FastAPI(title="GeoRisk Finder", lifespan=lifespan)


def _graticule_data():
    lines = []
    for lat in range(-90, 91, 30):
        pts = [[lon, lat] for lon in range(-180, 181, 5)]
        lines.append({"path": pts})
    for lon in range(-180, 181, 30):
        pts = [[lon, lat] for lat in range(-90, 91, 5)]
        lines.append({"path": pts})
    return lines


_PLATES_URL = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json"


@lru_cache(maxsize=1)
def _fetch_plate_boundaries():
    r = requests.get(_PLATES_URL, timeout=10)
    r.raise_for_status()
    gj = r.json()
    paths = []
    for feat in gj["features"]:
        geom = feat["geometry"]
        if geom["type"] == "MultiLineString":
            for seg in geom["coordinates"]:
                paths.append({"path": [[c[0], c[1]] for c in seg]})
        elif geom["type"] == "LineString":
            paths.append({"path": [[c[0], c[1]] for c in geom["coordinates"]]})
    return paths


def _add_position(records):
    for r in records:
        r["position"] = [r["lon"], r["lat"]]
    return records


_layers_cache: dict | None = None


def _region_name(lat: float, lon: float) -> str:
    regions = [
        ("Japan", 130, 146, 30, 46),
        ("Philippines", 116, 128, 4, 21),
        ("Indonesia", 95, 142, -11, 6),
        ("Chile", -76, -66, -56, -18),
        ("Mexico", -118, -86, 14, 33),
        ("California", -125, -114, 32, 42),
        ("Pacific Ring", 120, -70, -60, 60),
        ("Caribbean", -90, -60, 8, 28),
        ("Mediterranean", -10, 40, 30, 48),
        ("New Zealand", 166, 179, -48, -34),
        ("Iceland", -25, -15, 63, 67),
        ("India", 68, 98, 6, 36),
    ]
    for name, w, e, s, n in regions:
        if w <= e:
            if w <= lon <= e and s <= lat <= n:
                return name
        else:
            if lon >= w or lon <= e:
                if s <= lat <= n:
                    return name
    return "Unknown"


def _find_cell(cell_id: str) -> dict | None:
    adapters = _get_adapters()
    h3_df = adapters.load_h3()
    if h3_df.empty:
        return None
    match = h3_df[h3_df["cell_id"] == cell_id]
    if match.empty:
        return None
    row = match.iloc[0]
    return {
        "cell_id": str(row.get("cell_id", "")),
        "lat": float(row.get("lat", 0)),
        "lon": float(row.get("lon", 0)),
        "risk_score": float(row.get("risk_score", 0)),
        "n_earthquakes": int(row.get("n_earthquakes", 0)),
        "n_cyclones": int(row.get("n_cyclones", 0)),
        "n_volcanoes": int(row.get("n_volcanoes", 0)),
        "kmeans_cluster": int(row.get("kmeans_cluster", -1)),
        "dbscan_label": int(row.get("dbscan_label", -1)),
        "region": _region_name(float(row.get("lat", 0)), float(row.get("lon", 0))),
    }


def serialize_active_layers():
    global _layers_cache
    if _layers_cache is not None:
        return _layers_cache

    adapters = _get_adapters()
    h3_df = adapters.load_h3()
    quake_df = adapters.load_earthquakes()
    cyclone_df = adapters.load_cyclones()
    volcano_df = adapters.load_volcanoes()
    heat_df = adapters.load_heatmap()

    layers = []
    layers.append({
        "id": "graticule", "type": "PathLayer",
        "data": _graticule_data(), "pickable": False,
        "props": {"getPath": "path", "getColor": [42, 53, 80, 50], "getWidth": 0.5, "widthMinPixels": 0.3, "opacity": 0.12},
    })
    h3_safe_cols = [
        "cell_id", "lat", "lon", "risk_score", "pc1",
        "kmeans_cluster", "dbscan_label",
        "elevation", "color", "cluster_color", "h3_index",
        "n_earthquakes", "n_cyclones", "n_volcanoes", "year",
    ]
    h3_records = h3_df[[c for c in h3_safe_cols if c in h3_df.columns]].to_dict(orient="records")
    layers.append({
        "id": "h3", "type": "H3HexagonLayer",
        "data": h3_records, "pickable": True,
        "props": {"getHexagon": "h3_index", "getFillColor": "color", "getElevation": 0, "elevationScale": 0, "extruded": False, "opacity": 0.7, "autoHighlight": False, "lineWidthMinPixels": 0.3, "getLineColor": [42, 53, 80, 100]},
    })
    if not quake_df.empty:
        layers.append({
            "id": "earthquakes", "type": "ScatterplotLayer",
            "data": _add_position(quake_df.to_dict(orient="records")), "pickable": True,
            "props": {"getPosition": "position", "getRadius": "radius", "getFillColor": "color", "radiusScale": 1, "radiusMinPixels": 1.5, "radiusMaxPixels": 15, "opacity": 0.6, "stroked": False},
        })
    if not cyclone_df.empty:
        layers.append({
            "id": "cyclones", "type": "PathLayer",
            "data": cyclone_df.to_dict(orient="records"), "pickable": True,
            "props": {"getPath": "path", "getColor": "color", "getWidth": "width", "widthScale": 1, "widthMinPixels": 1, "widthMaxPixels": 4, "opacity": 0.5, "capRounded": True},
        })
    if not volcano_df.empty:
        layers.append({
            "id": "volcanoes", "type": "ScatterplotLayer",
            "data": _add_position(volcano_df.to_dict(orient="records")), "pickable": True,
            "props": {"getPosition": "position", "getRadius": "radius", "getFillColor": "color", "getLineColor": [255, 255, 255, 100], "getLineWidth": 1.5, "radiusScale": 1, "radiusMinPixels": 4, "radiusMaxPixels": 12, "opacity": 0.8, "stroked": True},
        })
    if not heat_df.empty:
        layers.append({
            "id": "heatmap", "type": "HeatmapLayer",
            "data": _add_position(heat_df.to_dict(orient="records")), "pickable": False,
            "props": {"getPosition": "position", "getWeight": "risk_score", "aggregation": "MEAN", "radiusPixels": 25, "intensity": 1, "threshold": 0.05, "opacity": 0.35},
        })
    try:
        plates_data = _fetch_plate_boundaries()
    except Exception:
        plates_data = []
    if plates_data:
        layers.append({
            "id": "plates", "type": "PathLayer",
            "data": plates_data, "pickable": False,
            "props": {"getPath": "path", "getColor": [42, 53, 80, 120], "getWidth": 1, "widthMinPixels": 0.5, "opacity": 0.3},
        })
    _layers_cache = {"layers": layers, "view_state": {"latitude": 15, "longitude": 0, "zoom": 1.5, "pitch": 0, "bearing": 0}}
    return _layers_cache


# ---- Existing Endpoints (fixed/kept) ----

@app.get("/api/layers")
def get_layers():
    return serialize_active_layers()


_ranking_cache: dict[int, list] = {}


@app.get("/api/ranking")
def get_ranking(limit: int = Query(10, ge=1, le=100)):
    if limit in _ranking_cache:
        return _ranking_cache[limit]
    adapters = _get_adapters()
    result = adapters.load_ranking(limit=limit)
    _ranking_cache[limit] = result
    return result


@app.get("/api/search")
def search(q: str = Query(..., min_length=1)):
    adapters = _get_adapters()
    result = adapters.search(q)
    if result is None:
        return []
    return [{
        "key": q.lower().replace(" ", "_"),
        "label": q.title(),
        "lat": result["lat"],
        "lon": result["lon"],
    }]


# ---- Auth Endpoints ----

class AuthRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str


@app.post("/api/auth/login")
def auth_login(req: AuthRequest):
    user = DEMO_USERS.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = _make_token(req.email)
    return {
        "token": token,
        "user": {
            "email": req.email,
            "name": user["name"],
            "role": user["role"],
        },
    }


@app.post("/api/auth/register")
def auth_register(req: RegisterRequest):
    if req.email in DEMO_USERS:
        raise HTTPException(status_code=409, detail="User already exists")
    DEMO_USERS[req.email] = {"password": req.password, "name": req.name, "role": req.role}
    token = _make_token(req.email)
    return {
        "token": token,
        "user": {
            "email": req.email,
            "name": req.name,
            "role": req.role,
        },
    }


@app.get("/api/auth/me")
def auth_me(token: str = Query(...)):
    email = _verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = DEMO_USERS.get(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": email, "name": user["name"], "role": user["role"]}


# ---- Projects / Portfolios (Multi-tenant) ----

_projects_db: dict[str, dict] = {}


class ProjectRequest(BaseModel):
    name: str
    description: str = ""
    cell_ids: list[str] = []
    scenario: str = "ssp245"
    tags: list[str] = []


@app.post("/api/projects")
def create_project(req: ProjectRequest, token: str = Query(...)):
    email = _verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    project_id = f"proj-{uuid.uuid4().hex[:12]}"
    project = {
        "id": project_id,
        "owner": email,
        "name": req.name,
        "description": req.description,
        "cell_ids": req.cell_ids,
        "scenario": req.scenario,
        "tags": req.tags,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _projects_db[project_id] = project
    return project


@app.get("/api/projects")
def list_projects(token: str = Query(...)):
    email = _verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_projects = [p for p in _projects_db.values() if p["owner"] == email]
    return user_projects


@app.get("/api/projects/{project_id}")
def get_project(project_id: str, token: str = Query(...)):
    email = _verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    project = _projects_db.get(project_id)
    if not project or project["owner"] != email:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.put("/api/projects/{project_id}")
def update_project(project_id: str, req: ProjectRequest, token: str = Query(...)):
    email = _verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    project = _projects_db.get(project_id)
    if not project or project["owner"] != email:
        raise HTTPException(status_code=404, detail="Project not found")
    project.update({
        "name": req.name,
        "description": req.description,
        "cell_ids": req.cell_ids,
        "scenario": req.scenario,
        "tags": req.tags,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return project


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str, token: str = Query(...)):
    email = _verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    project = _projects_db.get(project_id)
    if not project or project["owner"] != email:
        raise HTTPException(status_code=404, detail="Project not found")
    del _projects_db[project_id]
    return {"deleted": True}


@app.get("/api/projects/{project_id}/portfolio")
def get_portfolio(project_id: str, token: str = Query(...)):
    email = _verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    project = _projects_db.get(project_id)
    if not project or project["owner"] != email:
        raise HTTPException(status_code=404, detail="Project not found")

    adapters = _get_adapters()
    cells = []
    for cid in project.get("cell_ids", []):
        cell = _find_cell(cid)
        if cell:
            cells.append(cell)

    if not cells:
        return {"project": project, "cells": [], "summary": {"total_exposure": 0, "avg_risk": 0, "count": 0}}

    total_exposure = sum(c.get("risk_score", 0) * 50000 for c in cells)
    avg_risk = sum(c.get("risk_score", 0) for c in cells) / len(cells) if cells else 0
    critical = sum(1 for c in cells if c.get("risk_score", 0) >= 0.7)

    return {
        "project": project,
        "cells": cells,
        "summary": {
            "total_exposure": round(total_exposure),
            "avg_risk": round(avg_risk, 4),
            "count": len(cells),
            "critical_cells": critical,
        },
    }


# ---- Cell Detail ----

@app.get("/api/cell/{cell_id}")
def get_cell(cell_id: str):
    cell = _find_cell(cell_id)
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    return cell


# ---- Economic Impact ----

@app.get("/api/economic/{cell_id}")
def get_economic(cell_id: str):
    cell = _find_cell(cell_id)
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")

    score = cell["risk_score"]
    eq = cell["n_earthquakes"]
    cyc = cell["n_cyclones"]
    vol = cell["n_volcanoes"]

    # Actuarial model: base exposure scales with hazard density
    hazard_factor = 1.0 + (eq * 0.08) + (cyc * 0.12) + (vol * 0.05)
    base_exposure = score * 50000 * hazard_factor

    # Annual Expected Loss (AEL) — probability-weighted
    eq_loss_prob = min(eq * 0.015, 0.3)
    cyc_loss_prob = min(cyc * 0.02, 0.25)
    vol_loss_prob = min(vol * 0.008, 0.15)
    ael = base_exposure * (eq_loss_prob + cyc_loss_prob + vol_loss_prob) / max(hazard_factor, 1)

    # Adaptation cost — reduces risk by ~60%
    adaptation_cost = ael * 3.5
    avoided_loss_10y = ael * 10 * 0.6
    cost_inaction_10y = ael * 10
    net_savings = avoided_loss_10y - adaptation_cost
    bcr = avoided_loss_10y / adaptation_cost if adaptation_cost > 0 else 0
    payback = adaptation_cost / (ael * 0.6) if ael > 0 else 0

    return {
        "cell_id": cell_id,
        "risk_score": score,
        "exposure": round(base_exposure, 2),
        "annual_loss": round(ael, 2),
        "cost_of_inaction_10y": round(cost_inaction_10y, 2),
        "adaptation_cost": round(adaptation_cost, 2),
        "net_savings_10y": round(net_savings, 2),
        "bcr": round(bcr, 2),
        "payback_years": round(payback, 1),
        "break_even_years": round(payback, 1),
        "hazard_factor": round(hazard_factor, 2),
        "n_earthquakes": eq,
        "n_cyclones": cyc,
        "n_volcanoes": vol,
    }


# ---- Events ----

@app.get("/api/events/{cell_id}")
def get_events(cell_id: str):
    cell = _find_cell(cell_id)
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")

    adapters = _get_adapters()
    events = []
    lat, lon = cell["lat"], cell["lon"]

    quake_df = adapters.load_earthquakes(500)
    if not quake_df.empty:
        quake_df["_dist"] = (quake_df["lat"] - lat) ** 2 + (quake_df["lon"] - lon) ** 2
        nearby = quake_df.nsmallest(min(10, len(quake_df)), "_dist")
        for _, row in nearby.iterrows():
            events.append({
                "id": f"eq-{cell_id}-{len(events)}",
                "type": "earthquake",
                "magnitude": round(float(row.get("magnitude", 0)), 1),
                "date": str(row.get("year", 2020)),
                "distance": round((float(row["_dist"]) ** 0.5) * 111, 1),
                "source": "USGS",
                "title": f"M{row.get('magnitude', 0):.1f} Earthquake",
            })

    volcano_df = adapters.load_volcanoes()
    if not volcano_df.empty:
        volcano_df["_dist"] = (volcano_df["lat"] - lat) ** 2 + (volcano_df["lon"] - lon) ** 2
        nearby = volcano_df.nsmallest(min(5, len(volcano_df)), "_dist")
        for _, row in nearby.iterrows():
            events.append({
                "id": f"vol-{cell_id}-{len(events)}",
                "type": "volcano",
                "magnitude": 0,
                "date": "2024",
                "distance": round((float(row["_dist"]) ** 0.5) * 111, 1),
                "source": "GVP",
                "title": f"Volcano at {float(row.get('lat', 0)):.1f}, {float(row.get('lon', 0)):.1f}",
            })

    if cell["n_cyclones"] > 0:
        cyc_df = adapters.load_cyclones()
        if not cyc_df.empty and "path" in cyc_df.columns:
            # Find cyclones with paths near this cell
            for _, row in cyc_df.head(20).iterrows():
                path = row.get("path", [])
                if not path or not isinstance(path, list):
                    continue
                # Check if any point on the path is near the cell
                min_dist = min(
                    ((p[1] - lat) ** 2 + (p[0] - lon) ** 2) ** 0.5 * 111
                    for p in path if isinstance(p, (list, tuple)) and len(p) >= 2
                ) if path else 999

                if min_dist < 500:
                    events.append({
                        "id": f"cyc-{cell_id}-{len(events)}",
                        "type": "cyclone",
                        "magnitude": row.get("category", 0),
                        "date": str(row.get("year", 2024)),
                        "distance": round(min_dist, 1),
                        "source": "IBTrACS",
                        "title": f"Cyclone ({row.get('category', 'Unknown')}) — {row.get('year', '')}",
                    })
                    if len(events) >= 10:
                        break

    events.sort(key=lambda e: e["date"], reverse=True)
    return events[:20]


# ---- Alerts ----

import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed

_alerts_cache: list = []
_alerts_last_fetch: float = 0
_ALERTS_TTL = 300  # 5 min

_SEVERITY_MAP = {
    "Green": "info",
    "Yellow": "watch",
    "Orange": "warning",
    "Red": "critical",
}

_TYPE_MAP = {
    "EQ": "earthquake",
    "TC": "cyclone",
    "VO": "volcano",
    "FL": "flood",
    "DR": "flood",
    "WF": "flood",
}


def _fetch_gdacs() -> list:
    try:
        resp = requests.get("https://www.gdacs.org/xml/rss.xml", timeout=10)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        alerts = []
        for item in root.iter("item"):
            title_el = item.find("title")
            desc_el = item.find("description")
            link_el = item.find("link")
            geo_lat = item.find("{http://www.w3.org/2003/01/geo/wgs84#}lat")
            geo_lon = item.find("{http://www.w3.org/2003/01/geo/wgs84#}long")

            title = (title_el.text or "").strip() if title_el is not None else ""
            if not title:
                continue

            # Parse alert type from title prefix (e.g. "EQ", "TC", "VO")
            alert_type = "flood"
            severity = "info"
            for prefix, t in _TYPE_MAP.items():
                if title.startswith(prefix):
                    alert_type = t
                    break

            # Parse severity from color
            for item_el in item.iter():
                if item_el.tag == "gdacs:alertlevel" and item_el.text:
                    severity = _SEVERITY_MAP.get(item_el.text.strip(), "info")

            lat = float(geo_lat.text) if geo_lat is not None and geo_lat.text else 0
            lon = float(geo_lon.text) if geo_lon is not None and geo_lon.text else 0

            if lat == 0 and lon == 0:
                continue

            alerts.append({
                "id": f"gdacs-{hash(title) % 10**8}",
                "type": alert_type,
                "severity": severity,
                "title": title[:120],
                "location": title[:80],
                "lat": lat,
                "lon": lon,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "GDACS",
            })
        return alerts[:30]
    except Exception as e:
        logger.warning(f"GDACS fetch failed: {e}")
        return []


def _fetch_usgs() -> list:
    try:
        resp = requests.get(
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson",
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        alerts = []
        for feat in data.get("features", []):
            props = feat.get("properties", {})
            coords = feat.get("geometry", {}).get("coordinates", [0, 0, 0])
            mag = props.get("mag", 0)
            place = props.get("place", "Unknown")
            title = props.get("title", place)
            event_time = props.get("time", 0)

            severity = "info"
            if mag >= 7:
                severity = "critical"
            elif mag >= 6:
                severity = "warning"
            elif mag >= 5:
                severity = "watch"

            alerts.append({
                "id": f"usgs-{feat.get('id', hash(title) % 10**8)}",
                "type": "earthquake",
                "severity": severity,
                "title": f"M{mag} — {title}",
                "location": place,
                "lat": coords[1] if len(coords) > 1 else 0,
                "lon": coords[0] if len(coords) > 0 else 0,
                "timestamp": datetime.fromtimestamp(event_time / 1000, tz=timezone.utc).isoformat() if event_time else datetime.now(timezone.utc).isoformat(),
                "source": "USGS",
            })
        return alerts[:20]
    except Exception as e:
        logger.warning(f"USGS fetch failed: {e}")
        return []


def _fetch_all_alerts() -> list:
    global _alerts_cache, _alerts_last_fetch
    now = datetime.now().timestamp()
    if _alerts_cache and (now - _alerts_last_fetch) < _ALERTS_TTL:
        return _alerts_cache

    results = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {pool.submit(_fetch_gdacs): "gdacs", pool.submit(_fetch_usgs): "usgs"}
        for f in as_completed(futures):
            try:
                results.extend(f.result())
            except Exception:
                pass

    results.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
    _alerts_cache = results
    _alerts_last_fetch = now
    return results


@app.get("/api/alerts")
def get_alerts():
    return _fetch_all_alerts()


# ---- Financial ----

@app.get("/api/financial")
def get_financial():
    adapters = _get_adapters()
    ranking = adapters.load_ranking(50)
    result = []
    for r in ranking:
        score = r.get("risk_score", 0)
        eq = r.get("n_earthquakes", 0)
        cyc = r.get("n_cyclones", 0)
        vol = r.get("n_volcanoes", 0)

        # Derive exposure from hazard density + risk score
        exposure = score * 50000 * (1.0 + eq * 0.08 + cyc * 0.12 + vol * 0.05)
        # Resilience inversely correlated with risk
        resilience = max(0.1, min(0.95, 1.0 - score * 0.7))
        # GDP proxy based on region (rough estimate per country)
        gdp = round(exposure * 0.0012, 1)
        # EWS score — higher for regions with more events (better monitoring)
        ews = min(0.9, 0.3 + (eq + cyc + vol) * 0.02)

        result.append({
            "country": r.get("region", "Unknown"),
            "gdp": gdp,
            "exposure": round(exposure, 2),
            "resilience": round(resilience, 2),
            "risk_score": round(score, 3),
            "ews_score": round(ews, 2),
        })
    return result


# ---- Scenarios ----

@app.get("/api/scenarios")
def get_scenarios():
    return [
        {"id": "ssp126", "label": "SSP1-2.6", "description": "Sostenible — bajas emisiones", "color": "#3A6B1E"},
        {"id": "ssp245", "label": "SSP2-4.5", "description": "Intermedio — emisiones moderadas", "color": "#20808D"},
        {"id": "ssp370", "label": "SSP3-7.0", "description": "Regional — altas emisiones", "color": "#B37D00"},
        {"id": "ssp585", "label": "SSP5-8.5", "description": "Fósil — emisiones extremas", "color": "#A84B2F"},
    ]


_SCENARIO_MULTIPLIERS = {
    "ssp126": 0.8,
    "ssp245": 1.0,
    "ssp370": 1.35,
    "ssp585": 1.7,
}


# ---- Projected Layers ----

@app.get("/api/layers/projected")
def get_projected_layers(year: int = Query(2050), scenario: str = Query("ssp245")):
    adapters = _get_adapters()
    h3_df = adapters.load_h3()
    if h3_df.empty:
        return []

    mult = _SCENARIO_MULTIPLIERS.get(scenario, 1.0)
    year_factor = 1.0 + (year - 2024) * 0.003 * mult
    df = h3_df.copy()
    df["risk_score"] = (df["risk_score"] * year_factor).clip(0, 1)
    df["color"] = df["risk_score"].apply(
        lambda r: [16, 185, 129, 180] if r < 0.25 else [245, 158, 11, 180] if r < 0.5 else [249, 115, 22, 200] if r < 0.75 else [239, 68, 68, 220]
    )

    h3_safe_cols = [
        "cell_id", "lat", "lon", "risk_score", "pc1",
        "kmeans_cluster", "dbscan_label",
        "elevation", "color", "cluster_color", "h3_index",
        "n_earthquakes", "n_cyclones", "n_volcanoes", "year",
    ]
    records = df[[c for c in h3_safe_cols if c in df.columns]].to_dict(orient="records")
    return [{
        "id": "h3-projected",
        "type": "H3HexagonLayer",
        "data": records,
        "pickable": True,
        "props": {
            "getHexagon": "h3_index",
            "getFillColor": "color",
            "getElevation": 0,
            "elevationScale": 0,
            "extruded": False,
            "opacity": 0.6,
            "lineWidthMinPixels": 0.3,
            "getLineColor": [42, 53, 80, 100],
        },
    }]


# ---- Trends ----

@app.get("/api/trends")
def get_trends(metric: str = Query("risk"), period: str = Query("12m")):
    months = int(period.replace("m", "")) if "m" in period else 12
    adapters = _get_adapters()
    ranking = adapters.load_ranking(50)
    base = sum(r.get("risk_score", 0) for r in ranking) / max(len(ranking), 1) * 100

    points = []
    for i in range(months - 1, -1, -1):
        val = base + (months - i) * 0.3 + random.uniform(-2, 2)
        d = datetime.now(timezone.utc) - timedelta(days=30 * i)
        points.append({
            "date": d.strftime("%Y-%m"),
            "value": round(max(val, 0), 2),
        })

    return {"metric": metric, "period": period, "points": points}


# ---- Action Execute ----

@app.get("/api/action/execute")
def execute_action(cell_id: str, action: str):
    logger.info(f"Action executed: {action} on cell {cell_id}")
    return {"success": True, "action": action, "cell_id": cell_id, "status": "acknowledged"}


# ---- Report ----

@app.get("/api/report/{cell_id}")
def get_report(cell_id: str):
    cell = _find_cell(cell_id)
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")

    score = cell["risk_score"]
    category = "Critical" if score >= 0.75 else "High" if score >= 0.5 else "Moderate" if score >= 0.25 else "Low"
    color = "#A84B2F" if score >= 0.75 else "#B37D00" if score >= 0.5 else "#7A3B49" if score >= 0.25 else "#3A6B1E"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8">
<title>GeoRisk Report — {cell_id}</title>
<style>
body {{ font-family: 'Inter', sans-serif; background: #fff; color: #1C1A15; padding: 40px; max-width: 800px; margin: auto; }}
h1 {{ color: #01696F; border-bottom: 3px solid #01696F; padding-bottom: 8px; }}
.score {{ font-size: 48px; font-weight: 800; color: {color}; }}
.meta {{ color: #6B6A64; font-size: 14px; }}
table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
th, td {{ text-align: left; padding: 8px 12px; border-bottom: 1px solid #E3E0D8; }}
th {{ color: #01696F; }}
.footer {{ margin-top: 40px; color: #6B6A64; font-size: 12px; border-top: 1px solid #E3E0D8; padding-top: 12px; }}
</style></head>
<body>
<h1>GeoRisk Finder — Report</h1>
<p class="meta">Cell: {cell_id} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
<div class="score">{round(score * 100)}</div>
<p>Risk Category: <strong>{category}</strong></p>
<table>
<tr><th>Metric</th><th>Value</th></tr>
<tr><td>Risk Score</td><td>{score:.4f}</td></tr>
<tr><td>Earthquakes</td><td>{cell['n_earthquakes']}</td></tr>
<tr><td>Cyclones</td><td>{cell['n_cyclones']}</td></tr>
<tr><td>Volcanoes</td><td>{cell['n_volcanoes']}</td></tr>
<tr><td>Cluster</td><td>{cell['kmeans_cluster']}</td></tr>
<tr><td>Region</td><td>{cell['region']}</td></tr>
</table>
<h2>Economic Impact</h2>
<table>
<tr><th>Metric</th><th>Value</th></tr>
<tr><td>Total Exposure</td><td>${round(score * 50000):,}</td></tr>
<tr><td>Annual Expected Loss</td><td>${round(score * 50000 * 0.027):,}</td></tr>
</table>
<div class="footer">GeoRisk Finder V3 · Confidential</div>
</body></html>"""
    return HTMLResponse(content=html)


# ---- Explain ----

@app.get("/api/explain/{cell_id}")
def get_explain(cell_id: str):
    cell = _find_cell(cell_id)
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    score = cell["risk_score"]
    eq = cell["n_earthquakes"]
    cyc = cell["n_cyclones"]
    vol = cell["n_volcanoes"]

    hazards = []
    if eq > 0:
        hazards.append({"type": "earthquake", "count": eq, "label": f"{eq} earthquake events"})
    if cyc > 0:
        hazards.append({"type": "cyclone", "count": cyc, "label": f"{cyc} cyclone events"})
    if vol > 0:
        hazards.append({"type": "volcano", "count": vol, "label": f"{vol} volcanic events"})

    risk_story = f"This location has a risk score of {score:.2f} ({'critical' if score > 0.7 else 'high' if score > 0.4 else 'moderate' if score > 0.2 else 'low'}). "
    if hazards:
        risk_story += "Historical data shows " + ", ".join(h["label"] for h in hazards) + "."
    else:
        risk_story += "No significant hazard events recorded."

    return {
        "cell_id": cell_id,
        "risk_story": risk_story,
        "hazard_breakdown": hazards,
        "risk_score": score,
        "region": cell["region"],
    }


# ---- Compare ----

@app.get("/api/compare")
def get_compare(cell_a: str = Query(...), cell_b: str = Query(...)):
    cell_a_data = _find_cell(cell_a)
    cell_b_data = _find_cell(cell_b)
    if not cell_a_data or not cell_b_data:
        raise HTTPException(status_code=404, detail="One or both cells not found")

    def pick_winner(a_val, b_val, lower_better=True):
        if a_val is None or b_val is None:
            return None
        if lower_better:
            return "A" if a_val < b_val else "B" if b_val < a_val else None
        return "A" if a_val > b_val else "B" if b_val > a_val else None

    return {
        "cell_a": cell_a_data,
        "cell_b": cell_b_data,
        "comparisons": [
            {"label": "Risk Score", "a": cell_a_data["risk_score"], "b": cell_b_data["risk_score"], "winner": pick_winner(cell_a_data["risk_score"], cell_b_data["risk_score"])},
            {"label": "Earthquakes", "a": cell_a_data["n_earthquakes"], "b": cell_b_data["n_earthquakes"], "winner": pick_winner(cell_a_data["n_earthquakes"], cell_b_data["n_earthquakes"])},
            {"label": "Cyclones", "a": cell_a_data["n_cyclones"], "b": cell_b_data["n_cyclones"], "winner": pick_winner(cell_a_data["n_cyclones"], cell_b_data["n_cyclones"])},
            {"label": "Volcanoes", "a": cell_a_data["n_volcanoes"], "b": cell_b_data["n_volcanoes"], "winner": pick_winner(cell_a_data["n_volcanoes"], cell_b_data["n_volcanoes"])},
        ],
    }


# ---- Stats ----

@app.get("/api/stats")
def get_stats():
    adapters = _get_adapters()
    h3_df = adapters.load_h3()
    quake_df = adapters.load_earthquakes()
    if h3_df.empty:
        return {"total_cells": 0, "mean_risk": 0, "total_events": 0, "critical_cells": 0}
    return {
        "total_cells": len(h3_df),
        "mean_risk": round(float(h3_df["risk_score"].mean()), 4),
        "critical_cells": int((h3_df["risk_score"] >= 0.7).sum()),
        "high_cells": int(((h3_df["risk_score"] >= 0.4) & (h3_df["risk_score"] < 0.7)).sum()),
        "total_earthquakes": len(quake_df) if not quake_df.empty else 0,
        "total_cyclones": len(adapters.load_cyclones()) if not adapters.load_cyclones().empty else 0,
        "total_volcanoes": len(adapters.load_volcanoes()) if not adapters.load_volcanoes().empty else 0,
    }


# ---- WebSocket Alerts ----

import asyncio

_ws_clients: set[WebSocket] = set()


@app.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket):
    await websocket.accept()
    _ws_clients.add(websocket)
    try:
        # Send initial alerts on connect
        alerts = _fetch_all_alerts()
        if alerts:
            await websocket.send_json({"type": "init", "alerts": alerts[:50]})

        # Keep alive + periodic push
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Push new alerts every 30s
                try:
                    alerts = _fetch_all_alerts()
                    await websocket.send_json({"type": "update", "alerts": alerts[:50]})
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        _ws_clients.discard(websocket)


# ---- Static files ----

STATIC_DIR = Path(__file__).parent / "georisk-frontend" / "dist"
ASSETS_DIR = STATIC_DIR / "assets"

if ASSETS_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")


@app.get("/favicon.svg")
def favicon():
    p = STATIC_DIR / "favicon.svg"
    if p.exists():
        return FileResponse(p)
    return {"status": "no favicon"}


@app.get("/icons.svg")
def icons():
    p = STATIC_DIR / "icons.svg"
    if p.exists():
        return FileResponse(p)
    return {"status": "no icons"}


@app.get("/")
def index():
    p = STATIC_DIR / "index.html"
    if p.exists():
        return FileResponse(p)
    return {"status": "GeoRisk V3 API", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
