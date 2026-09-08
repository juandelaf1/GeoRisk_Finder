from pathlib import Path
import warnings

import joblib
import numpy as np
import pandas as pd

from src.clustering import (
    compute_elbow,
    find_knee_point,
    fit_dbscan,
    fit_kmeans,
    suggest_eps,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "processed"
MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
H3_CACHE_PATH = DATA_DIR / "h3_cache.pkl"

_REGIONS = [
    ("Japan", 130, 146, 30, 46),
    ("Philippines", 116, 128, 4, 21),
    ("Indonesia", 95, 142, -11, 6),
    ("Chile", -76, -66, -56, -18),
    ("Peru", -82, -68, -19, 0),
    ("Mexico", -118, -86, 14, 33),
    ("Central America", -93, -77, 7, 19),
    ("California", -125, -114, 32, 42),
    ("Alaska", -170, -130, 51, 72),
    ("Pacific Ring", 120, -70, -60, 60),
    ("Caribbean", -90, -60, 8, 28),
    ("Mediterranean", -10, 40, 30, 48),
    ("Middle East", 35, 60, 12, 42),
    ("Himalayas", 72, 98, 26, 38),
    ("New Zealand", 166, 179, -48, -34),
    ("Iceland", -25, -15, 63, 67),
    ("East Africa Rift", 29, 42, -20, 5),
    ("India", 68, 98, 6, 36),
    ("China", 73, 136, 18, 54),
    ("Russia", 30, 180, 45, 72),
    ("Europe", -10, 40, 36, 60),
    ("South America", -82, -34, -56, 12),
    ("North America", -130, -60, 24, 50),
    ("Australia", 112, 155, -44, -10),
    ("Africa", -20, 52, -36, 38),
]


def _region_name(lat: float, lon: float) -> str:
    for name, w, e, s, n in _REGIONS:
        if w <= e:
            if w <= lon <= e and s <= lat <= n:
                return name
        else:
            if lon >= w or lon <= e:
                if s <= lat <= n:
                    return name
    return "Unknown"


def _classify_storm_category(wind_speed: float) -> str:
    if pd.isna(wind_speed) or wind_speed < 34:
        return "TD"
    if wind_speed < 64:
        return "TS"
    if wind_speed < 83:
        return "C1"
    if wind_speed < 96:
        return "C2"
    if wind_speed < 113:
        return "C3"
    if wind_speed < 137:
        return "C4"
    return "C5"


def _risk_color(risk: float) -> list:
    if risk < 0.25:
        return [16, 185, 129, 180]
    if risk < 0.5:
        return [245, 158, 11, 180]
    if risk < 0.75:
        return [249, 115, 22, 200]
    return [239, 68, 68, 220]


_CLUSTER_PALETTE = [
    [59, 130, 246, 180],
    [239, 68, 68, 180],
    [16, 185, 129, 180],
    [245, 158, 11, 180],
    [139, 92, 246, 180],
    [236, 72, 153, 180],
    [34, 211, 238, 180],
    [251, 146, 60, 180],
    [132, 204, 22, 180],
    [168, 85, 247, 180],
]


def _cluster_color(cluster_id: int) -> list:
    return _CLUSTER_PALETTE[cluster_id % len(_CLUSTER_PALETTE)]


def _magnitude_color(mag: float) -> list:
    if mag < 4:
        return [16, 185, 129, 180]
    if mag < 5:
        return [245, 158, 11, 180]
    if mag < 6:
        return [249, 115, 22, 200]
    if mag < 7:
        return [239, 68, 68, 220]
    return [239, 68, 68, 255]


def _cyclone_color(cat: str) -> list:
    colors = {
        "TD": [16, 185, 129, 160],
        "TS": [94, 234, 212, 160],
        "C1": [245, 158, 11, 180],
        "C2": [249, 115, 22, 180],
        "C3": [239, 68, 68, 200],
        "C4": [220, 38, 38, 220],
        "C5": [180, 20, 20, 240],
    }
    return colors.get(cat, [100, 100, 100, 160])


def _cyclone_width(cat: str) -> int:
    widths = {"TD": 1, "TS": 1.5, "C1": 2, "C2": 2.5, "C3": 3, "C4": 4, "C5": 5}
    return widths.get(cat, 1)


class DataAdapters:
    def __init__(self):
        self._h3_cache = None
        self._quake_cache = None
        self._cyclone_cache = None
        self._volcano_cache = None
        self._heatmap_cache = None
        self._pipeline_cache = None

    def _load_pipeline(self):
        if self._pipeline_cache is not None:
            return self._pipeline_cache
        path = MODELS_DIR / "pipeline_riesgo.joblib"
        if path.exists():
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                self._pipeline_cache = joblib.load(path)
        else:
            self._pipeline_cache = None
        return self._pipeline_cache

    def _compute_risk_and_pc1(self, grid_df: pd.DataFrame) -> pd.DataFrame:
        pipeline = self._load_pipeline()
        df = grid_df.copy()
        if "categoria_tormenta" not in df.columns:
            df["categoria_tormenta"] = df["wind_mean"].apply(_classify_storm_category)

        exclude = {"lat", "lon", "cell_id"}
        numeric_cols = [
            c
            for c in df.select_dtypes(include=[np.number]).columns
            if c not in exclude
        ]
        feature_cols = numeric_cols + ["categoria_tormenta"]
        X = df[feature_cols].copy()
        for c in X.select_dtypes(include=[np.number]).columns:
            X[c] = X[c].fillna(X[c].median())

        if pipeline is not None:
            try:
                components = pipeline.transform(X)
                pc1 = components[:, 0]
            except Exception:
                pc1 = np.zeros(len(df))
        else:
            pc1 = np.zeros(len(df))

        pc1_min, pc1_max = pc1.min(), pc1.max()
        if pc1_max > pc1_min:
            risk_score = (pc1 - pc1_min) / (pc1_max - pc1_min)
        else:
            risk_score = np.zeros(len(df))
        risk_score = risk_score.clip(0, 1)

        df["risk_score"] = risk_score
        df["pc1"] = pc1
        return df

    def _compute_clusters(self, grid_df: pd.DataFrame) -> pd.DataFrame:
        df = grid_df.copy()
        if "categoria_tormenta" not in df.columns:
            df["categoria_tormenta"] = df["wind_mean"].apply(_classify_storm_category)

        exclude = {"lat", "lon", "cell_id"}
        numeric_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns if c not in exclude
        ]
        cat_dummies = pd.get_dummies(df["categoria_tormenta"], prefix="cat")
        X_num = df[numeric_cols].copy()
        for c in X_num.select_dtypes(include=[np.number]).columns:
            X_num[c] = X_num[c].fillna(X_num[c].median())
        X = pd.concat([X_num, cat_dummies], axis=1).values

        n_cells = len(df)
        k = 5
        if n_cells > 20:
            try:
                elbow_df = compute_elbow(X, k_range=range(2, min(11, n_cells)))
                knee_idx = find_knee_point(elbow_df["inertia"].values)
                k = int(elbow_df.iloc[knee_idx]["k"])
            except Exception:
                k = max(2, min(5, n_cells // 50))

        km_labels, _ = fit_kmeans(X, n_clusters=k)
        df["kmeans_cluster"] = km_labels

        try:
            eps = suggest_eps(X, k=5)
            db_labels, _ = fit_dbscan(X, eps=eps)
        except Exception:
            db_labels = np.zeros(len(df), dtype=int)
        df["dbscan_label"] = db_labels

        return df

    def load_h3(self, force_preprocess: bool = True) -> pd.DataFrame:
        if self._h3_cache is not None:
            return self._h3_cache

        if not force_preprocess and H3_CACHE_PATH.exists():
            try:
                self._h3_cache = pd.read_pickle(H3_CACHE_PATH)
                return self._h3_cache
            except Exception:
                pass

        path = DATA_DIR / "grid_features.csv"
        if path.exists():
            df = pd.read_csv(path)
        else:
            return pd.DataFrame()

        df = self._compute_risk_and_pc1(df)
        df = self._compute_clusters(df)
        df["elevation"] = 0
        df["color"] = df["risk_score"].apply(_risk_color)
        df["cluster_color"] = df["kmeans_cluster"].apply(_cluster_color)
        df["h3_index"] = df["cell_id"]
        df["n_earthquakes"] = df["eq_count"].fillna(0).astype(int)
        df["n_cyclones"] = df["cyclone_count"].fillna(0).astype(int)
        df["n_volcanoes"] = df["volcano_count"].fillna(0).astype(int)
        df["year"] = 2026

        try:
            pd.to_pickle(df, H3_CACHE_PATH)
        except Exception:
            pass

        self._h3_cache = df
        return self._h3_cache

    def load_earthquakes(self, n: int = 20000) -> pd.DataFrame:
        if self._quake_cache is not None:
            return self._quake_cache

        path = DATA_DIR / "usgs_earthquakes_clean.csv"
        if path.exists():
            df = pd.read_csv(path)
        else:
            return pd.DataFrame()

        df = df.drop_duplicates(subset=["event_id"]).head(n)
        df["radius"] = df["magnitude"].fillna(3).clip(3, 30) * 1.5
        df["color"] = df["magnitude"].fillna(3).apply(_magnitude_color)
        df["year"] = pd.to_datetime(df["timestamp"], errors="coerce").dt.year.fillna(2000).astype(int)
        df = df.rename(columns={"magnitude": "magnitude", "depth_km": "depth"})
        df = df[["lat", "lon", "magnitude", "depth", "year", "radius", "color"]].dropna(subset=["lat", "lon"])

        self._quake_cache = df
        return self._quake_cache

    def load_cyclones(self) -> pd.DataFrame:
        if self._cyclone_cache is not None:
            return self._cyclone_cache

        path = DATA_DIR / "ciclones_clean.csv"
        if path.exists():
            df = pd.read_csv(path)
        else:
            return pd.DataFrame()

        rows = []
        for event_id, group in df.groupby("event_id"):
            group = group.sort_values("timestamp")
            pts = group[["lon", "lat"]].dropna().values.tolist()
            if len(pts) < 2:
                continue
            wind = group["wind"].dropna()
            wind_mean = wind.mean() if not wind.empty else 0
            cat = _classify_storm_category(wind_mean)
            ts = pd.to_datetime(group["timestamp"].iloc[0], errors="coerce")
            rows.append({
                "path": pts,
                "color": _cyclone_color(cat),
                "width": _cyclone_width(cat),
                "category": cat,
                "year": ts.year if pd.notna(ts) else 2000,
            })

        self._cyclone_cache = pd.DataFrame(rows)
        return self._cyclone_cache

    def load_volcanoes(self) -> pd.DataFrame:
        if self._volcano_cache is not None:
            return self._volcano_cache

        path = DATA_DIR / "volcanes_clean.csv"
        if path.exists():
            df = pd.read_csv(path)
        else:
            return pd.DataFrame()

        df = df.drop_duplicates(subset=["place", "lat", "lon"]).copy()
        df["radius"] = 6
        df["color"] = df.apply(lambda _: [239, 68, 68, 200], axis=1)
        df["year"] = 2026
        df["elevation"] = df["elevation"].fillna(0).astype(int)
        df["active"] = True
        df = df[["lat", "lon", "elevation", "active", "year", "radius", "color"]].dropna(subset=["lat", "lon"])

        self._volcano_cache = df
        return self._volcano_cache

    def load_heatmap(self) -> pd.DataFrame:
        if self._heatmap_cache is not None:
            return self._heatmap_cache
        h3_data = self.load_h3()
        if h3_data.empty:
            self._heatmap_cache = pd.DataFrame()
            return self._heatmap_cache
        self._heatmap_cache = h3_data[["lat", "lon", "risk_score"]].copy()
        return self._heatmap_cache

    def search(self, query: str) -> dict | None:
        cities = {
            # Asia
            "madrid": {"lat": 40.4168, "lon": -3.7038, "zoom": 6},
            "tokio": {"lat": 35.6762, "lon": 139.6503, "zoom": 5},
            "japon": {"lat": 36.2048, "lon": 138.2529, "zoom": 4},
            "chile": {"lat": -33.4489, "lon": -70.6693, "zoom": 4},
            "indonesia": {"lat": -0.7893, "lon": 113.9213, "zoom": 4},
            "california": {"lat": 36.7783, "lon": -119.4179, "zoom": 5},
            "valencia": {"lat": 39.4699, "lon": -0.3763, "zoom": 7},
            "venezuela": {"lat": 6.4238, "lon": -66.9036, "zoom": 5},
            "espana": {"lat": 40.4637, "lon": -3.7492, "zoom": 4},
            "canarias": {"lat": 28.2916, "lon": -16.6291, "zoom": 6},
            "manila": {"lat": 14.5995, "lon": 120.9842, "zoom": 7},
            "yakarta": {"lat": -6.2088, "lon": 106.8456, "zoom": 7},
            "katmandu": {"lat": 27.7172, "lon": 85.3240, "zoom": 7},
            "estambul": {"lat": 41.0082, "lon": 28.9784, "zoom": 7},
            "napoles": {"lat": 40.8518, "lon": 14.2681, "zoom": 8},
            "san francisco": {"lat": 37.7749, "lon": -122.4194, "zoom": 7},
            "santiago": {"lat": -33.4489, "lon": -70.6693, "zoom": 7},
            "caracas": {"lat": 10.4806, "lon": -66.9036, "zoom": 7},
            "lima": {"lat": -12.0464, "lon": -77.0428, "zoom": 7},
            "bogota": {"lat": 4.7110, "lon": -74.0721, "zoom": 7},
            "port-au-prince": {"lat": 18.5944, "lon": -72.3074, "zoom": 7},
            "mexico": {"lat": 19.4326, "lon": -99.1332, "zoom": 6},
            "colombia": {"lat": 4.5709, "lon": -74.2073, "zoom": 6},
            "peru": {"lat": -12.0464, "lon": -77.0428, "zoom": 6},
            "filipinas": {"lat": 12.8797, "lon": 121.774, "zoom": 7},
            "nepal": {"lat": 27.7172, "lon": 85.324, "zoom": 7},
            # Extended world gazetteer
            "london": {"lat": 51.5074, "lon": -0.1278, "zoom": 6},
            "paris": {"lat": 48.8566, "lon": 2.3522, "zoom": 6},
            "berlin": {"lat": 52.5200, "lon": 13.4050, "zoom": 6},
            "roma": {"lat": 41.9028, "lon": 12.4964, "zoom": 6},
            "atenas": {"lat": 37.9838, "lon": 23.7275, "zoom": 6},
            "lisboa": {"lat": 38.7223, "lon": -9.1393, "zoom": 6},
            "amsterdam": {"lat": 52.3676, "lon": 4.9041, "zoom": 6},
            "bruselas": {"lat": 50.8503, "lon": 4.3517, "zoom": 6},
            "viena": {"lat": 48.2082, "lon": 16.3738, "zoom": 6},
            "zurich": {"lat": 47.3769, "lon": 8.5417, "zoom": 6},
            "milan": {"lat": 45.4642, "lon": 9.1900, "zoom": 6},
            "barcelona": {"lat": 41.3874, "lon": 2.1686, "zoom": 6},
            "sevilla": {"lat": 37.3891, "lon": -5.9845, "zoom": 7},
            "malaga": {"lat": 36.7213, "lon": -4.4214, "zoom": 7},
            "lisboa": {"lat": 38.7223, "lon": -9.1393, "zoom": 6},
            "moscu": {"lat": 55.7558, "lon": 37.6173, "zoom": 5},
            "sankt petersburg": {"lat": 59.9311, "lon": 30.3609, "zoom": 6},
            "kiev": {"lat": 50.4501, "lon": 30.5234, "zoom": 6},
            "bucarest": {"lat": 44.4268, "lon": 26.1025, "zoom": 6},
            "budapest": {"lat": 47.4979, "lon": 19.0402, "zoom": 6},
            "praga": {"lat": 50.0755, "lon": 14.4378, "zoom": 6},
            "varsovia": {"lat": 52.2297, "lon": 21.0122, "zoom": 6},
            "belgrado": {"lat": 44.7866, "lon": 20.4489, "zoom": 6},
            "sofia": {"lat": 42.6977, "lon": 23.3219, "zoom": 6},
            "dublin": {"lat": 53.3498, "lon": -6.2603, "zoom": 6},
            "copenhague": {"lat": 55.6761, "lon": 12.5683, "zoom": 6},
            "estocolmo": {"lat": 59.3293, "lon": 18.0686, "zoom": 6},
            "oslo": {"lat": 59.9139, "lon": 10.7522, "zoom": 6},
            "helsinki": {"lat": 60.1699, "lon": 24.9384, "zoom": 6},
            "nueva york": {"lat": 40.7128, "lon": -74.0060, "zoom": 5},
            "los angeles": {"lat": 34.0522, "lon": -118.2437, "zoom": 5},
            "chicago": {"lat": 41.8781, "lon": -87.6298, "zoom": 5},
            "houston": {"lat": 29.7604, "lon": -95.3698, "zoom": 5},
            "miami": {"lat": 25.7617, "lon": -80.1918, "zoom": 6},
            "washington": {"lat": 38.9072, "lon": -77.0369, "zoom": 6},
            "seattle": {"lat": 47.6062, "lon": -122.3321, "zoom": 6},
            "vegas": {"lat": 36.1699, "lon": -115.1398, "zoom": 6},
            "nuevo orleans": {"lat": 29.9511, "lon": -90.0715, "zoom": 6},
            "florida": {"lat": 27.6648, "lon": -81.5158, "zoom": 5},
            "toronto": {"lat": 43.6532, "lon": -79.3832, "zoom": 6},
            "montreal": {"lat": 45.5017, "lon": -73.5673, "zoom": 6},
            "vancouver": {"lat": 49.2827, "lon": -123.1207, "zoom": 6},
            "rio de janeiro": {"lat": -22.9068, "lon": -43.1729, "zoom": 5},
            "sao paulo": {"lat": -23.5505, "lon": -46.6333, "zoom": 5},
            "buenos aires": {"lat": -34.6037, "lon": -58.3816, "zoom": 5},
            "montevideo": {"lat": -34.9011, "lon": -56.1645, "zoom": 6},
            "quito": {"lat": -0.1807, "lon": -78.4678, "zoom": 6},
            "guayaquil": {"lat": -2.1700, "lon": -79.9224, "zoom": 6},
            "la paz": {"lat": -16.4897, "lon": -68.1193, "zoom": 6},
            "quito": {"lat": -0.1807, "lon": -78.4678, "zoom": 6},
            "asuncion": {"lat": -25.2637, "lon": -57.5759, "zoom": 6},
            "panama": {"lat": 8.9824, "lon": -79.5199, "zoom": 6},
            "santo domingo": {"lat": 18.4861, "lon": -69.9312, "zoom": 6},
            "la habana": {"lat": 23.1136, "lon": -82.3666, "zoom": 6},
            "guatemala": {"lat": 14.6349, "lon": -90.5069, "zoom": 6},
            "san jose": {"lat": 9.9281, "lon": -84.0907, "zoom": 6},
            "san salvador": {"lat": 13.6929, "lon": -89.2182, "zoom": 6},
            "tegucigalpa": {"lat": 14.0723, "lon": -87.1921, "zoom": 6},
            "managua": {"lat": 12.1150, "lon": -86.2362, "zoom": 6},
            "san juan": {"lat": 18.4655, "lon": -66.1057, "zoom": 6},
            "kingston": {"lat": 17.9714, "lon": -76.7936, "zoom": 6},
            "beijing": {"lat": 39.9042, "lon": 116.4074, "zoom": 5},
            "shanghai": {"lat": 31.2304, "lon": 121.4737, "zoom": 5},
            "guangzhou": {"lat": 23.1291, "lon": 113.2644, "zoom": 5},
            "hong kong": {"lat": 22.3193, "lon": 114.1694, "zoom": 6},
            "seul": {"lat": 37.5665, "lon": 126.9780, "zoom": 6},
            "pyongyang": {"lat": 39.0392, "lon": 125.7625, "zoom": 6},
            "taipei": {"lat": 25.0330, "lon": 121.5654, "zoom": 6},
            "bangkok": {"lat": 13.7563, "lon": 100.5018, "zoom": 6},
            "hanoi": {"lat": 21.0278, "lon": 105.8342, "zoom": 6},
            "ho chi minh": {"lat": 10.8231, "lon": 106.6297, "zoom": 6},
            "kuala lumpur": {"lat": 3.1390, "lon": 101.6869, "zoom": 6},
            "singapur": {"lat": 1.3521, "lon": 103.8198, "zoom": 6},
            "nueva delhi": {"lat": 28.6139, "lon": 77.2090, "zoom": 5},
            "mumbai": {"lat": 19.0760, "lon": 72.8777, "zoom": 5},
            "chennai": {"lat": 13.0827, "lon": 80.2707, "zoom": 5},
            "bombay": {"lat": 19.0760, "lon": 72.8777, "zoom": 5},
            "calcuta": {"lat": 22.5726, "lon": 88.3639, "zoom": 6},
            "colombo": {"lat": 6.9271, "lon": 79.8612, "zoom": 6},
            "daca": {"lat": 23.8103, "lon": 90.4125, "zoom": 6},
            "karachi": {"lat": 24.8607, "lon": 67.0011, "zoom": 6},
            "islamabad": {"lat": 33.6844, "lon": 73.0479, "zoom": 6},
            "kabul": {"lat": 34.5553, "lon": 69.2075, "zoom": 6},
            "teheran": {"lat": 35.6892, "lon": 51.3890, "zoom": 6},
            "bagdad": {"lat": 33.3152, "lon": 44.3661, "zoom": 6},
            "riyadh": {"lat": 24.7136, "lon": 46.6753, "zoom": 5},
            "yeda": {"lat": 21.4858, "lon": 39.1925, "zoom": 6},
            "dubai": {"lat": 25.2048, "lon": 55.2708, "zoom": 6},
            "abu dabi": {"lat": 24.4539, "lon": 54.3773, "zoom": 6},
            "doha": {"lat": 25.2854, "lon": 51.5310, "zoom": 6},
            "el cairo": {"lat": 30.0444, "lon": 31.2357, "zoom": 5},
            "alejandria": {"lat": 31.2001, "lon": 29.9187, "zoom": 6},
            "casablanca": {"lat": 33.5731, "lon": -7.5898, "zoom": 6},
            "tunez": {"lat": 36.8065, "lon": 10.1815, "zoom": 6},
            "argel": {"lat": 36.7538, "lon": 3.0588, "zoom": 6},
            "tripoli": {"lat": 32.8872, "lon": 13.1913, "zoom": 6},
            "nairobi": {"lat": -1.2921, "lon": 36.8219, "zoom": 6},
            "lagos": {"lat": 6.5244, "lon": 3.3792, "zoom": 5},
            "abuja": {"lat": 9.0765, "lon": 7.3986, "zoom": 6},
            "accra": {"lat": 5.6037, "lon": -0.1870, "zoom": 6},
            "dakar": {"lat": 14.7167, "lon": -17.4677, "zoom": 6},
            "ciudad del cabo": {"lat": -33.9249, "lon": 18.4241, "zoom": 6},
            "johannesburgo": {"lat": -26.2041, "lon": 28.0473, "zoom": 6},
            "pretoria": {"lat": -25.7479, "lon": 28.2293, "zoom": 6},
            "addis abeba": {"lat": 9.0243, "lon": 38.7468, "zoom": 6},
            "jartum": {"lat": 15.5007, "lon": 32.5599, "zoom": 6},
            "sydney": {"lat": -33.8688, "lon": 151.2093, "zoom": 5},
            "melbourne": {"lat": -37.8136, "lon": 144.9631, "zoom": 5},
            "brisbane": {"lat": -27.4698, "lon": 153.0251, "zoom": 6},
            "perth": {"lat": -31.9505, "lon": 115.8605, "zoom": 6},
            "adelaida": {"lat": -34.9285, "lon": 138.6007, "zoom": 6},
            "canberra": {"lat": -35.2809, "lon": 149.1300, "zoom": 6},
            "australia": {"lat": -25.2744, "lon": 133.7751, "zoom": 4},
            "nueva zelanda": {"lat": -40.9006, "lon": 174.8860, "zoom": 5},
            "auckland": {"lat": -36.8509, "lon": 174.7645, "zoom": 6},
            "honolulu": {"lat": 21.3069, "lon": -157.8583, "zoom": 6},
            "maui": {"lat": 20.7984, "lon": -156.3319, "zoom": 6},
            "guam": {"lat": 13.4443, "lon": 144.7937, "zoom": 6},
            "puerto rico": {"lat": 18.2208, "lon": -66.5901, "zoom": 6},
            "república dominicana": {"lat": 18.7357, "lon": -70.1627, "zoom": 5},
            "haiti": {"lat": 18.9712, "lon": -72.2852, "zoom": 5},
            "cuba": {"lat": 21.5218, "lon": -77.7812, "zoom": 5},
            "jamaica": {"lat": 18.1096, "lon": -77.2975, "zoom": 5},
            "trinidad": {"lat": 10.6918, "lon": -61.2225, "zoom": 6},
            "barbados": {"lat": 13.1939, "lon": -59.5432, "zoom": 6},
            "estados unidos": {"lat": 37.0902, "lon": -95.7129, "zoom": 4},
            "eeuu": {"lat": 37.0902, "lon": -95.7129, "zoom": 4},
            "usa": {"lat": 37.0902, "lon": -95.7129, "zoom": 4},
            "canada": {"lat": 56.1304, "lon": -106.3468, "zoom": 3},
            "brasil": {"lat": -14.2350, "lon": -51.9253, "zoom": 4},
            "argentina": {"lat": -38.4161, "lon": -63.6167, "zoom": 4},
            "china": {"lat": 35.8617, "lon": 104.1954, "zoom": 3},
            "india": {"lat": 20.5937, "lon": 78.9629, "zoom": 4},
            "pakistan": {"lat": 30.3753, "lon": 69.3451, "zoom": 4},
            "bangladesh": {"lat": 23.6850, "lon": 90.3563, "zoom": 5},
            "afganistan": {"lat": 33.9391, "lon": 67.7100, "zoom": 5},
            "iran": {"lat": 32.4279, "lon": 53.6880, "zoom": 4},
            "irak": {"lat": 33.2232, "lon": 43.6793, "zoom": 5},
            "arabia saudita": {"lat": 23.8859, "lon": 45.0792, "zoom": 4},
            "emiratos": {"lat": 23.4241, "lon": 53.8478, "zoom": 5},
            "qatar": {"lat": 25.3548, "lon": 51.1839, "zoom": 5},
            "egipto": {"lat": 26.8206, "lon": 30.8025, "zoom": 4},
            "marruecos": {"lat": 31.7917, "lon": -7.0926, "zoom": 4},
            "argelia": {"lat": 28.0339, "lon": 1.6596, "zoom": 4},
            "tunez": {"lat": 33.8869, "lon": 9.5375, "zoom": 5},
            "libia": {"lat": 26.3351, "lon": 17.2283, "zoom": 4},
            "nigeria": {"lat": 9.0820, "lon": 8.6753, "zoom": 4},
            "kenia": {"lat": -0.0236, "lon": 37.9062, "zoom": 4},
            "sudafrica": {"lat": -30.5595, "lon": 22.9375, "zoom": 4},
            "etiopia": {"lat": 9.1450, "lon": 40.4897, "zoom": 4},
            "sudan": {"lat": 12.8628, "lon": 30.2176, "zoom": 4},
            "vietnam": {"lat": 14.0583, "lon": 108.2772, "zoom": 4},
            "tailandia": {"lat": 15.8700, "lon": 100.9925, "zoom": 4},
            "malasia": {"lat": 4.2105, "lon": 101.9758, "zoom": 4},
            "singapur": {"lat": 1.3521, "lon": 103.8198, "zoom": 6},
            "birmania": {"lat": 21.9162, "lon": 95.9560, "zoom": 4},
            "camboya": {"lat": 12.5657, "lon": 104.9910, "zoom": 5},
            "laos": {"lat": 19.8563, "lon": 102.4955, "zoom": 5},
            "korea": {"lat": 35.9078, "lon": 127.7669, "zoom": 4},
            "corea": {"lat": 35.9078, "lon": 127.7669, "zoom": 4},
            "taiwan": {"lat": 23.6978, "lon": 120.9605, "zoom": 5},
            "mongolia": {"lat": 46.8625, "lon": 103.8467, "zoom": 4},
            "turquia": {"lat": 38.9637, "lon": 35.2433, "zoom": 4},
            "grecia": {"lat": 39.0742, "lon": 21.8243, "zoom": 4},
            "italia": {"lat": 41.8719, "lon": 12.5674, "zoom": 4},
            "francia": {"lat": 46.2276, "lon": 2.2137, "zoom": 4},
            "alemania": {"lat": 51.1657, "lon": 10.4515, "zoom": 4},
            "reino unido": {"lat": 55.3781, "lon": -3.4360, "zoom": 4},
            "portugal": {"lat": 39.3999, "lon": -8.2245, "zoom": 4},
            "paises bajos": {"lat": 52.1326, "lon": 5.2913, "zoom": 5},
            "belgica": {"lat": 50.5039, "lon": 4.4699, "zoom": 5},
            "suiza": {"lat": 46.8182, "lon": 8.2275, "zoom": 5},
            "austria": {"lat": 47.5162, "lon": 14.5501, "zoom": 5},
            "polonia": {"lat": 51.9194, "lon": 19.1451, "zoom": 4},
            "ucrania": {"lat": 48.3794, "lon": 31.1656, "zoom": 4},
            "rumania": {"lat": 45.9432, "lon": 24.9668, "zoom": 4},
            "hungria": {"lat": 47.1625, "lon": 19.5033, "zoom": 5},
            "chequia": {"lat": 49.8175, "lon": 15.4730, "zoom": 5},
            "suecia": {"lat": 60.1282, "lon": 18.6435, "zoom": 4},
            "noruega": {"lat": 60.4720, "lon": 8.4689, "zoom": 4},
            "finlandia": {"lat": 61.9241, "lon": 25.7482, "zoom": 4},
            "dinamarca": {"lat": 56.2639, "lon": 9.5018, "zoom": 5},
            "irlanda": {"lat": 53.4129, "lon": -8.2439, "zoom": 5},
            "rusia": {"lat": 61.5240, "lon": 105.3188, "zoom": 3},
            "australia": {"lat": -25.2744, "lon": 133.7751, "zoom": 4},
            "nueva zelanda": {"lat": -40.9006, "lon": 174.8860, "zoom": 5},
            "mongolia": {"lat": 46.8625, "lon": 103.8467, "zoom": 4},
            "kazajistan": {"lat": 48.0196, "lon": 66.9237, "zoom": 4},
            "uzbekistan": {"lat": 41.3775, "lon": 64.5853, "zoom": 5},
        }
        q = query.lower().strip()
        # normalize diacritics
        replacements = {
            "á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n",
        }
        for k, v in replacements.items():
            q = q.replace(k, v)
        if q in cities:
            return self._snap_to_h3(cities[q])
        for name, coords in cities.items():
            if q in name:
                return self._snap_to_h3(coords)
        return None

    def _snap_to_h3(self, coords: dict) -> dict:
        """Snaps a city coordinate to the nearest H3 cell from grid_features.csv."""
        try:
            h3_data = self.load_h3()
            if h3_data.empty:
                return coords
            lat, lon = coords["lat"], coords["lon"]
            h3_data["_dist"] = (h3_data["lat"] - lat) ** 2 + (h3_data["lon"] - lon) ** 2
            nearest = h3_data.loc[h3_data["_dist"].idxmin()]
            return {"lat": float(nearest["lat"]), "lon": float(nearest["lon"]), "zoom": coords.get("zoom", 6)}
        except Exception:
            return coords

    def load_ranking(self, limit: int = 10) -> list:
        h3_data = self.load_h3()
        if h3_data.empty:
            return []
        top = h3_data.nlargest(limit, "risk_score")
        records = top[[
            "cell_id", "lat", "lon", "risk_score", "pc1",
            "n_earthquakes", "n_cyclones", "n_volcanoes",
            "eq_count", "cyclone_count", "volcano_count",
            "kmeans_cluster",
        ]].to_dict(orient="records")
        for r in records:
            r["region"] = _region_name(r["lat"], r["lon"])
        return records
