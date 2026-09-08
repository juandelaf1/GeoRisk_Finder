# GeoRisk V3 — Evidence Map

## Verification Levels

- **VERIFIED IN CODE**: Capability exists in source code
- **VERIFIED BY TEST**: Has automated test coverage
- **DOCUMENTED ONLY**: Described in docs but not in code
- **INFERRED**: Reasonable assumption based on related code
- **UNKNOWN**: Cannot determine from available information

---

## Capabilities

### Core Geospatial
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| H3 hexagonal grid | VERIFIED IN CODE + BY TEST | test_api.py::TestLayers | adapters.py, deckgl.ts |
| 3D Globe (deck.gl) | VERIFIED IN CODE | — | deckgl.ts |
| CARTO basemap tiles | VERIFIED IN CODE | — | deckgl.ts |
| Layer toggling | VERIFIED IN CODE | — | LayerPanel.tsx |
| Cell selection | VERIFIED IN CODE | — | deckgl.ts, store |
| Fly-to animation | VERIFIED IN CODE | — | deckgl.ts |
| Hover tooltip | VERIFIED IN CODE | — | deckgl.ts |
| Highlight ring | VERIFIED IN CODE | — | deckgl.ts |

### Risk Analysis
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| PCA risk scoring | VERIFIED IN CODE + BY TEST | test_api.py | adapters.py |
| K-Means clustering | VERIFIED IN CODE | test_clustering.py | clustering.py |
| DBSCAN clustering | VERIFIED IN CODE | test_clustering.py | clustering.py |
| Risk ranking | VERIFIED IN CODE + BY TEST | test_api.py::TestRanking | main.py |
| Cell detail | VERIFIED IN CODE + BY TEST | test_api.py::TestCellEndpoints | main.py |
| Risk explanation | VERIFIED IN CODE + BY TEST | test_api.py::TestCellEndpoints | main.py |
| Scenario comparison | VERIFIED IN CODE | — | ScenarioComparison.tsx |
| Narrative timeline | VERIFIED IN CODE | — | NarrativeTimeline.tsx |

### Hazard Data
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| Earthquake data (USGS) | VERIFIED IN CODE + BY TEST | test_api.py | adapters.py |
| Cyclone data (IBTrACS) | VERIFIED IN CODE + BY TEST | test_api.py | adapters.py |
| Volcano data (GVP) | VERIFIED IN CODE + BY TEST | test_api.py | adapters.py |
| Nearby events | VERIFIED IN CODE + BY TEST | test_api.py::TestCellEndpoints | main.py |

### Climate Projections
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| SSP scenarios (4) | VERIFIED IN CODE + BY TEST | test_api.py::TestFinancial | main.py |
| Projected layers | VERIFIED IN CODE | — | main.py, useLayers.ts |
| Year slider | VERIFIED IN CODE | — | TimelineBar.tsx |

### Economic/Financial
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| Actuarial model | VERIFIED IN CODE + BY TEST | test_api.py::TestCellEndpoints | main.py |
| BCR calculation | VERIFIED IN CODE | — | main.py |
| Financial indicators | VERIFIED IN CODE + BY TEST | test_api.py::TestFinancial | main.py |

### Real-time
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| GDACS alerts | VERIFIED IN CODE + BY TEST | test_api.py::TestAlerts | main.py |
| USGS alerts | VERIFIED IN CODE | — | main.py |
| WebSocket push | VERIFIED IN CODE | — | main.py |
| Alerts polling (30s) | VERIFIED IN CODE | — | useAlerts.ts |

### Authentication
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| Login (demo) | VERIFIED IN CODE + BY TEST | test_api.py::TestAuth | main.py |
| Register (demo) | VERIFIED IN CODE + BY TEST | test_api.py::TestAuth | main.py |
| Token verification | VERIFIED IN CODE + BY TEST | test_api.py::TestAuth | main.py |
| JWT expiry | NOT IMPLEMENTED | — | — |

### Multi-tenant
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| Project CRUD | VERIFIED IN CODE + BY TEST | test_api.py::TestProjects | main.py |
| Portfolio summary | VERIFIED IN CODE + BY TEST | test_api.py::TestProjects | main.py |
| Data isolation | NOT IMPLEMENTED (in-memory) | — | — |

### UI/UX
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| i18n (ES/EN) | VERIFIED IN CODE | components.test | translations.ts |
| Loading skeletons | VERIFIED IN CODE + BY TEST | components.test | Skeleton.tsx |
| Empty states | VERIFIED IN CODE + BY TEST | components.test | Skeleton.tsx |
| SVG icons | VERIFIED IN CODE | — | actionIcons.tsx |
| Cmd+K search | VERIFIED IN CODE | — | CommandBar.tsx |
| Responsive CSS | VERIFIED IN CODE | — | global.css |
| Toast notifications | VERIFIED IN CODE | — | Toast.tsx |

### Infrastructure
| Capability | Evidence | Test | File |
|-----------|----------|------|------|
| Docker multi-stage | VERIFIED IN CODE | — | Dockerfile |
| docker-compose | VERIFIED IN CODE | — | docker-compose.yml |
| Render deploy | VERIFIED IN CODE | — | render.yaml |
| GitHub Actions CI | VERIFIED IN CODE | — | .github/workflows/ci.yml |
