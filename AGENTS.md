# GeoRisk Finder V3 — Hoja de Ruta Estratégica

> Documento maestro de coordinación y roadmap.
> Basado en análisis de ClimateAI, Jupiter Intelligence, Palantir Foundry, Tomorrow.io, ArcGIS, Bloomberg Terminal, Datadog y Uber Movement.

---

## Principios de Producto (inmutables)

1. **Todo riesgo se explica, no se muestra** — ningún score sin narrativa causal
2. **Todo riesgo es futuro** — proyecciones, no reportes históricos
3. **El sistema no muestra datos, muestra acciones** — cada insight tiene un botón
4. **La complejidad aparece gradualmente** — progressive disclosure en cada capa
5. **Segundos para entender una crisis** — alertas con ventana de acción y prioridad
6. **Todo indicador permite drill-down a la causa raíz** — zero dead ends
7. **El riesgo físico se traduce a $$$** — financial translation layer
8. **La comparación revela patrones** — GeoComparator es central, no extra

---

## Arquitectura

```
AppShell
├── Topbar (logo + Cmd+K hint + toggle)
├── GlobeViewport
│   ├── Globe (deck.gl _GlobeView) ← EXISTING
│   ├── LayerPanel ← EXISTING
│   ├── TimelineBar (conectado a datos reales) ← V3 FIX
│   └── ActiveAlertsOverlay ← V3 FIX
├── ContextSidebar (tabs: ranking, financial, insurance, aid, executive)
│   └── ExecutiveDashboard ← V3 FIX
├── DecisionCenter ← V3 FIX
└── CommandBar (Cmd+K modal) ← V3 FIX
```

---

## Estado Actual — V3 Audit (2026-07-30)

### Leyenda
- ✅ Funciona con datos reales
- 🟡 Funciona pero tiene issues
- ❌ No funciona / datos falsos
- 🔧 Corregido en V3

| Elemento | Estado V2 | Estado V3 | Notas |
|----------|-----------|-----------|-------|
| **Globe 3D** | 🟢 | ✅ | H3 + hazards reales |
| **Layer Panel** | 🟡 Radio bug | 🔧 | Unique names por checkbox |
| **Sidebar Ranking** | 🟢 | ✅ | Datos reales |
| **Sidebar Financial** | ❌ No endpoint | 🔧 | Endpoint creado |
| **Sidebar Insurance** | 🟡 Fake premiums | 🟡 | Usa ranking data |
| **Sidebar Aid** | 🟡 Derivado | 🟡 | Usa ranking data |
| **RiskScoreCard** | 🟢 | ✅ | Score real |
| **RiskStory** | 🟡 Fake financial | 🔧 | Conectado a backend |
| **HazardSection** | 🟢 | ✅ | Datos reales |
| **EconomicImpact** | ❌ `*50000*0.027` | 🔧 | Endpoint real |
| **FinancialImpactStatement** | ❌ Fake | 🔧 | Endpoint real |
| **ROICalculator** | ❌ Fake | 🔧 | Endpoint real |
| **RecommendedActions** | 🟢 | ✅ | Lógica válida |
| **ContingencyMeasures** | 🟡 Hardcoded | 🟡 | Correcto pero genérico |
| **EventExplorer** | ❌ Hash seed | 🔧 | Endpoint real |
| **ActionBar** | 🟡 3/5 broken | 🔧 | Endpoints creados |
| **ExecutiveDashboard** | ❌ Math.random() | 🔧 | Empty state honesto |
| **NarrativeTimeline** | 🟡 Hardcoded + typo | 🔧 | Typo fix + datos |
| **ScenarioComparison** | 🟡 Hardcoded | 🔧 | Endpoint real |
| **TimelineBar** | 🟡 Decorativo | 🔧 | Conectado a proyecciones |
| **CommandBar Search** | ❌ Broken contract | 🔧 | Response alignado |
| **Topbar Search** | ❌ Broken contract | 🔧 | Response alignado |
| **AuthModal** | ❌ No backend | 🔧 | Endpoints JWT creados |
| **Alerts** | ❌ Empty | 🔧 | Endpoint + WS |
| **GeoComparator** | 🟢 | ✅ | Funciona |
| **Export Report** | ❌ 404 | 🔧 | Endpoint creado |
| **Responsive Mobile** | 🟢 | ✅ | CSS breakpoints |

---

## V3 Stabilization Plan

### Nivel 1 — Correcciones Críticas (P0) — COMPLETED ✓

| # | Corrección | Archivos | Estado |
|---|------------|----------|--------|
| 1 | Fix `/api/search` response — array vs object | `main.py`, `client.ts` | ✓ |
| 2 | Reemplazar `Math.random()` en ExecutiveDashboard | `ExecutiveDashboard.tsx` | ✓ |
| 3 | Endpoint `/api/economic/{cell_id}` real | `main.py` | ✓ |
| 4 | Fix LayerPanel radio button bug | `LayerPanel.tsx` | ✓ |
| 5 | Fix NarrativeTimeline typo `ssp24` → `ssp245` | `NarrativeTimeline.tsx` | ✓ |
| 6 | Click handler en Globe H3HexagonLayer | `deckgl.ts` | ✓ |
| 7 | Endpoint `/api/alerts` | `main.py` | ✓ |
| 8 | Endpoint `/api/auth/*` JWT | `main.py` | ✓ |
| 9 | Endpoint `/api/events/{cell_id}` | `main.py` | ✓ |

### Nivel 2 — Coherencia UX (P1) — COMPLETED ✓

| # | Corrección | Archivos | Estado |
|---|------------|----------|--------|
| 10 | Remover scenario selectors duplicados | `NarrativeTimeline.tsx`, `ScenarioComparison.tsx` | ✓ |
| 11 | Merge secciones duplicadas DecisionCenter | `DecisionCenter.tsx` | ✓ |
| 12 | Reordenar DecisionCenter: Score→Story→Drivers→Impact→Actions→Events→Contingency | `DecisionCenter.tsx` | ✓ |
| 13 | Conectar TimelineBar a projected layers | `useLayers.ts`, `TimelineBar.tsx` | ✓ |
| 14 | Endpoint `/api/layers/projected` | `main.py` | ✓ |
| 15 | Endpoint `/api/trends` | `main.py` | ✓ |
| 16 | Endpoint `/api/action/execute` | `main.py` | ✓ |
| 17 | Endpoint `/api/financial` | `main.py` | ✓ |
| 18 | Endpoint `/api/report/{cell_id}` | `main.py` | ✓ |
| 19 | Endpoint `/api/explain/{cell_id}` | `main.py` | ✓ |
| 20 | Endpoint `/api/compare` | `main.py` | ✓ |
| 21 | Endpoint `/api/cell/{cellId}` | `main.py` | ✓ |
| 22 | Endpoint `/api/stats` | `main.py` | ✓ |
| 23 | Fix CSS orphaned block (missing `.closeBtn` selector) | `Sidebar.module.css` | ✓ |

### Nivel 2.5 — i18n & UX Polish (P1) — IN PROGRESS → COMPLETED ✓

### Nivel 3 — Calidad Visual (P2) — PENDING

| # | Corrección | Archivos | Prioridad |
|---|------------|----------|-----------|
| 23 | Hover tooltip en Globe con risk score + cluster | `deckgl.ts` | P2 |
| 24 | Highlight ring en celda seleccionada del Globe | `deckgl.ts` | P2 |
| 25 | Loading skeletons en todos los componentes | Varios | P2 |
| 26 | Empty states consistentes | Varios | P2 |
| 27 | SVG icons reemplazan emojis en ActionBar | `ActionBar.tsx` | P2 |

### Nivel 4 — Nuevas Capacidades (P3) — PENDING

| # | Feature | Prioridad |
|---|---------|-----------|
| 28 | Alerts feed real (GDACS/USGS/NOAA) | P3 |
| 29 | Modelo actuarial completo en `/api/economic` | P3 |
| 30 | WebSocket real para alerts push | P3 |
| 31 | Multi-tenant projects/portfolios | P3 |

---

## Convenciones (vigentes)

- CSS Modules (`*.module.css`)
- `var(--color-*)` desde `global.css`
- Sidebar: 350px, DecisionCenter: 320px
- z-index: Topbar 1000, Sidebar 900, DecisionCenter 900, CommandBar 2000
- Paleta Nexus: teal `#01696F`, dark bg `#061840`, ink `#0D1B2A`
- Importar types desde `../../types`
- Importar store desde `../../store`
- Usar `fetchJSON` desde `../../utils/fetchJSON` para API calls
- NO modificar archivos de otros agentes
- NO eliminar componentes existentes

---

## Integration Check

Cada cambio debe pasar:
1. `npx tsc --noEmit` — 0 errores
2. `npx vite build` — build exitoso
3. `cd .. && python -c "from main import app; print('OK')"` — backend importable
4. Verificar imports cross-agent
5. Reportar issues de dependencias

---

## Deployment (Docker + Render Free)

Stack: FastAPI (Python) backend + React/Vite frontend served as static files from same origin.

### Local Docker
```bash
docker compose up --build
# App available at http://localhost:8000
```

Files: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `requirements.prod.txt`

- Multi-stage build: Node 20 builds frontend, Python 3.12-slim runs FastAPI
- Frontend dist (`georisk-frontend/dist/`) copied into container as `./frontend/dist/`
- `main.py` mounts `./frontend/dist` as static (SPA fallback `/` = `index.html`)
- `./data` volume mounted for SQLite persistence in dev

### Render Free Deploy
```bash
# Push repo to GitHub, connect to Render dashboard
# Or use Render CLI: render deploy
```

File: `render.yaml`
- Plan: free
- Detects `Dockerfile` automatically
- `PORT` env var injected by Render
- `requirements.prod.txt` contains lean production deps only

### Key Deployment Notes
- `requirements.txt` (ML stack) != `requirements.prod.txt` (web app only)
- SQLite data is ephemeral on Render free tier -- consider Supabase PostgreSQL for persistence
- Frontend proxy in `vite.config.ts` is dev-only; in production, same-origin serves API + static files
