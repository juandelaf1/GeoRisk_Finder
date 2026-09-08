# GeoRisk Finder — Plan de Migración a Frontend Profesional Unificado

> **Objetivo:** Migrar la aplicación a un frontend React + Vite + TypeScript + deck.gl, respaldado por FastAPI y el pipeline de datos existente, manteniendo el Streamlit dashboard como herramienta interna.

---

## 1. Stack Definitivo

| Capa | Tecnología | Origen |
|------|-----------|--------|
| Frontend | Vite + React + TypeScript | `frontend/` (juan-local) |
| Visualización 3D | deck.gl v9 | `frontend/src/layers.ts` |
| Visualización 2D (fallback) | Leaflet | `frontend_new/dist/app.js` |
| Estado global | Zustand | `frontend/src/store.ts` |
| Estilos | CSS Modules + CSS custom properties | `theme.py` (Nexus palette) |
| Backend | FastAPI | `scripts/api_server.py` (juan-local) |
| Dashboard interno | Streamlit | `streamlit_app/` (se mantiene) |
| Datos | CSV en `data/processed/` | compartido |

---

## 2. Estructura de Directorios Final

```
GeoRisk_Finder/
├── georisk-frontend/           ← NUEVO: Vite + React + TS
│   ├── public/
│   │   └── assets/             ← logos, infografías (desde streamlit_app/assets/)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Globe/          ← deck.gl 3D
│   │   │   ├── Map/            ← Leaflet (alternativa)
│   │   │   ├── Sidebar/        ← ranking + filtros
│   │   │   ├── IntelPanel/     ← panel de inteligencia
│   │   │   ├── LayerPanel/     ← control de capas (glassmorphism)
│   │   │   ├── Topbar/         ← barra superior
│   │   │   └── ui/             ← badges, callouts, tabs, tabla estilizada
│   │   ├── pages/
│   │   │   ├── RiskMap.tsx     ← mapa global (unifica mapa_global.py + app.js)
│   │   │   ├── Financial.tsx   ← modelo financiero EWS
│   │   │   ├── Insurance.tsx   ← panel aseguradora
│   │   │   └── Aid.tsx         ← ayuda humanitaria
│   │   ├── hooks/
│   │   │   ├── useRanking.ts   ← API client (ranking)
│   │   │   ├── useLayers.ts    ← capas H3/sismos/ciclones/volcanes
│   │   │   ├── useFinancial.ts ← modelo financiero
│   │   │   └── useDataLoader.ts← carga CSV + normalización
│   │   ├── store/
│   │   │   ├── index.ts        ← store global (zustand)
│   │   │   ├── layersSlice.ts  ← estado de capas
│   │   │   ├── rankingSlice.ts ← estado de ranking
│   │   │   └── uiSlice.ts      ← estado de UI (sidebar, panel, timeline)
│   │   ├── theme/
│   │   │   └── nexus.ts        ← paleta Nexus + CSS custom properties
│   │   ├── utils/
│   │   │   ├── dataLoader.ts   ← carga/normalización (desde data_utils.py)
│   │   │   └── clustering.ts   ← lógica de clusters
│   │   ├── api/
│   │   │   └── client.ts       ← HTTP client para FastAPI
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── scripts/
│   └── api_server.py           ← FastAPI (refactorizado con endpoints completos)
│
├── data/processed/             ← CSVs compartidos (sin cambios)
├── src/                        ← pipeline ML (sin cambios)
├── streamlit_app/              ← se mantiene como herramienta interna
├── notebooks/                  ← notebooks existentes (sin cambios)
└── docs/
    ├── ARCHITECTURE.md
    └── MIGRATION_PLAN.md       ← este documento
```

---

## 3. Data Flow

```
[React + deck.gl]  ←→  [FastAPI (api_server.py)]  ←→  [data/processed/*.csv]
       ↓                          ↑
[Zustand Store]          [src/data/adapters.py] (DataAdapter, clustering)
       ↓
[Sidebar / IntelPanel / LayerPanel]
```

---

## 4. Pasos de Ejecución

### Paso 1 — Recuperar assets del commit 3184749

Sin borrar nada existente, recuperar:
- `frontend_new/dist/app.js` → lógica API client, ranking, filtros, mapa Leaflet
- `frontend_new/dist/style.css` → base de estilos (sidebar, topbar, intel panel)
- `scripts/api_server.py` → backend FastAPI

```
git checkout 3184749 -- frontend_new/dist/app.js
git checkout 3184749 -- frontend_new/dist/style.css
git checkout 3184749 -- scripts/api_server.py
```

### Paso 2 — Inicializar proyecto Vite + React + TypeScript

```bash
cd GeoRisk_Finder
npm create vite@latest georisk-frontend -- --template react-ts
cd georisk-frontend
npm install
npm install deck.gl @deck.gl/core @deck.gl/layers @deck.gl/geo-layers
npm install zustand h3-js h3-js@3.7.2
npm install leaflet react-leaflet @types/leaflet
npm install react-router-dom
```

### Paso 3 — Portar sistema de diseño Nexus

Desde `streamlit_app/theme.py`:
- Crear `src/theme/nexus.ts` con la paleta y tokens
- Crear `src/styles/global.css` con CSS custom properties
- Portar estilos de componentes: badges, callouts, tabs, tablas

### Paso 4 — Portar API client y store

- Migrar `app.js` (API calls + ranking) a `src/api/client.ts`
- Migrar lógica de filtros y ranking a slices de Zustand
- Migrar `data_utils.py` a `src/utils/dataLoader.ts`

### Paso 5 — Componentes core

- **Globe**: Portar `frontend/src/main.ts` y `layers.ts` a componente React (deck.gl)
- **Map**: Leaflet alternativo desde `app.js`
- **Sidebar**: Ranking + filtros desde `app.js` y `pages/mapa_global.py`
- **IntelPanel**: Panel de inteligencia desde `app.js` y `panel_aseguradora.py`
- **LayerPanel**: Control de capas con glassmorphism desde `georisk_globe/`
- **Topbar**: Barra superior desde `app.js`

### Paso 6 — Páginas

- **RiskMap.tsx**: Mapa global → unificar `mapa_global.py` + `app.js`
- **Financial.tsx**: Modelo financiero EWS → traducir `modelo_financiero.py`
- **Insurance.tsx**: Panel aseguradora → traducir `panel_aseguradora.py`
- **Aid.tsx**: Ayuda humanitaria → traducir `ayuda_humanitaria.py`

### Paso 7 — Montar API server

```bash
cd scripts
pip install fastapi uvicorn pandas numpy h3
uvicorn api_server:app --reload --port 8000
```

### Paso 8 — Conectar frontend con API

- Configurar proxy en `vite.config.ts` (5173 → 8000)
- Verificar que todos los endpoints funcionan
  - `GET /api/ranking`
  - `GET /api/layers`
  - `GET /api/layers/h3`
  - `GET /api/cell/{id}`
  - `GET /api/search`
  - `GET /api/stats`

### Paso 9 — Agregar endpoint financiero

```python
# en api_server.py
@app.get("/api/financial")
def get_financial_data():
    ...
```

### Paso 10 — Prueba end-to-end

```bash
cd georisk-frontend && npm run dev
# en otra terminal
cd scripts && uvicorn api_server:app --reload --port 8000
```

---

## 5. Consideraciones Técnicas

### 5.1 TypeScript > JavaScript
Todo el nuevo código en `.ts`/`.tsx`. El frontend deck.gl existente ya usa TypeScript.

### 5.2 Zustand como store único
- `useRanking` → alimenta `rankingSlice`
- `useLayers` → alimenta `layersSlice`
- Estado de UI (sidebar abierta, panel activo, timeline) → `uiSlice`

### 5.3 Globe como visualización principal
deck.gl 3D es la interfaz principal. Leaflet funciona como respaldo para dispositivos sin WebGL o como mapa rápido en páginas secundarias.

### 5.4 API server intacto
`scripts/api_server.py` no se reescribe. Solo se agregan endpoints nuevos (`/financial`) cuando sea necesario.

### 5.5 Migración Streamlit → React (1:1)
Cada page.py de Streamlit se traduce a:
- Un componente página (`.tsx`)
- Un hook con la lógica de negocio (`.ts`)
- El hook llama a `api/client.ts`

---

## 6. Referencias Cruzadas

| Archivo origen | → | Archivo destino |
|---------------|---|----------------|
| `frontend/src/main.ts` + `layers.ts` | → | `src/components/Globe/` |
| `frontend_new/dist/app.js` | → | `src/api/client.ts` + `src/hooks/useRanking.ts` |
| `frontend_new/dist/style.css` | → | `src/styles/` |
| `streamlit_app/theme.py` | → | `src/theme/nexus.ts` + `src/styles/global.css` |
| `streamlit_app/data_utils.py` | → | `src/utils/dataLoader.ts` |
| `streamlit_app/pages/mapa_global.py` | → | `src/pages/RiskMap.tsx` |
| `streamlit_app/pages/modelo_financiero.py` | → | `src/pages/Financial.tsx` + `src/hooks/useFinancial.ts` |
| `streamlit_app/pages/panel_aseguradora.py` | → | `src/pages/Insurance.tsx` |
| `streamlit_app/pages/ayuda_humanitaria.py` | → | `src/pages/Aid.tsx` |
| `georisk_globe/` | → | `src/components/LayerPanel/` |
| `scripts/api_server.py` | → | `scripts/api_server.py` (se extiende) |
