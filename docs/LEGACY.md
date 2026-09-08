# GeoRisk V3 — Legacy Files

## Status: DOCUMENTED / NOT ACTIVE

These files exist in the repository but are NOT part of the V3 runtime.
They are preserved for historical reference and potential reuse.

---

## Legacy Frontend Generations

### frontend/ (Generation 1)
- **Type:** Vanilla TypeScript + deck.gl
- **Files:** src/main.ts, src/api.ts, src/layers.ts, src/stream.ts, src/store.ts, src/style.css
- **Status:** Superseded by georisk-frontend/
- **Can be removed:** Yes, after V3 is stable

### frontend_new/ (Generation 2)
- **Type:** Pre-built dist only (no source)
- **Status:** Orphaned experiment from commit 3184749
- **Can be removed:** Yes

### georisk_globe/ (Streamlit component)
- **Type:** Streamlit custom component for deck.gl
- **Status:** Only used by broken app.py
- **Can be removed:** Yes

---

## Legacy Backend

### app.py (Streamlit entrypoint)
- **Type:** Streamlit app
- **Status:** BROKEN - imports deleted src/ui/styles.py
- **Can be removed:** Yes

### scripts/api_server.py (Alternative FastAPI)
- **Type:** Earlier FastAPI server (port 3000)
- **Status:** Superseded by main.py (port 8000)
- **Differences:** Uses PyJWT, random alerts, random events
- **Can be removed:** Yes

---

## Legacy Data/UI

### src/ui/ (Empty module)
- **Status:** Only __init__.py + orphaned .pyc files
- **Can be removed:** Yes

### src/layers/ (Empty module)  
- **Status:** Only __init__.py + orphaned .pyc files
- **Can be removed:** Yes

### static/ (Test HTML files)
- **Status:** Test HTML pages, not served by V3
- **Can be removed:** Yes

---

## Legacy Streamlit

### streamlit_app/ (Financial dashboard)
- **Type:** Separate Streamlit app for financial analysis
- **Status:** Independent from V3 globe app
- **Can be removed:** Yes (but may have standalone value)

### demo/ (Demo with synthetic data)
- **Type:** Demo app with fake data
- **Status:** Not connected to V3
- **Can be removed:** Yes

---

## Temp Files (should be gitignored)

- server_err.log, server_out.log
- streamlit_stderr.log, streamlit_stdout.log
- _check_component.py, _check_server.py
- mlflow.db, mlruns/
- __pycache__/, .pytest_cache/, .ruff_cache/
- presentacion/, figures/, outputs/
