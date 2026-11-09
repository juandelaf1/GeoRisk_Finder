# GeoRisk Finder 🌍
> **Plataforma de Inteligencia Geoespacial para la Evaluación de Riesgos Compuestos y Decisiones de Inversión en Resiliencia Climática**

![GeoRisk Finder](streamlit_app/assets/logo_georisk.png)

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg?style=flat&logo=python)
![Scikit-Learn](https://img.shields.io/badge/Machine_Learning-Scikit--Learn-F7931E?style=flat&logo=scikit-learn)
![Streamlit](https://img.shields.io/badge/Dashboard-Streamlit-FF4B4B?style=flat&logo=streamlit)
![Uber H3](https://img.shields.io/badge/Spatial_Grid-Uber_H3-black.svg?style=flat)
![Licencia](https://img.shields.io/badge/License-Academic_/_Open-green.svg)

---

## 📌 Resumen Ejecutivo

Las catástrofes naturales generan pérdidas globales superiores a los **$300.000 millones anuales**. Los modelos tradicionales suelen evaluar los riesgos (terremotos, huracanes, erupciones) de forma aislada, ignorando las **zonas de riesgo compuesto** donde múltiples amenazas coinciden en el tiempo y espacio.

**GeoRisk Finder** utiliza aprendizaje no supervisado (*clustering*) sobre una cuadrícula hexagonal espacial (**Uber H3**) para integrar eventos históricos multi-peligro (sismos, ciclones, volcanes, registros España/IGN según dataset). El sistema categoriza celdas en perfiles de riesgo y explora el **Retorno de Inversión (ROI)** de Sistemas de Alerta Temprana (EWS) mediante un **modelo de escenarios** (no resultados observados).

> **Verificación de datos (E4, 2026-11-08, `data/processed`):** `grid_features*.csv`/`cluster_labels.csv` = **41.162 filas** (celdas H3 res 3); `usgs_earthquakes_clean.csv` = **308.977** filas; `ciclones_clean.csv` = **646.984**; `espana_clean.csv` = **203.211**; `volcanes_clean.csv` = **278**; `casos_estudio.csv` = **4** (~1,16M filas en estos limpios). Cifras mayores citadas previamente (p.ej. “130M/79M/46M eventos”, “4.5M celdas”) **no se verifican** en los artefactos procesados del repo. Las métricas financieras (p.ej. BCR) provienen del modelo/Excel de escenarios (`streamlit_app/assets/Modelo_Catastrofes_Alerta_Temprana.xlsx`), no de pérdidas observadas.

---

## 💼 Casos de Uso e Impacto de Negocio

* 🏢 **Sector Asegurador y Reaseguro:** Optimización de primas y modelado de riesgo multinivel en carteras de activos expuestos.
* 🏛️ **Organismos Internacionales (UNDRR, Banco Mundial):** Priorización de fondos de adaptación climática en regiones de alta vulnerabilidad financiera.
* 🌐 **Gobiernos y Planificación Urbana:** Identificación de áreas críticas para el despliegue de infraestructura de respuesta rápida y alertas tempranas.

---

## 🌟 Características Clave del Producto

* 🗺️ **Grid Hexagonal Global (Uber H3 Res 3):** discretización homogénea del planeta. Los artefactos procesados incluyen **~41.162 celdas** (`grid_features*.csv`, E4; coherente con el grid global res 3).
* 🌪️ **Integración Multi-Peligro:** ingesta y normalización de registros USGS (sismos), IBTrACS/NOAA (ciclones), volcanes e IGN (catálogo histórico), según datasets disponibles.
* 🤖 **Reducción de Dimensionalidad y Clustering:** pipeline PCA (85% varianza retenida) + K-Means (4 perfiles macro de riesgo) + DBSCAN (detección de celdas atípicas).
* 📊 **Dashboard de Impacto Financiero (Streamlit):** simulación de escenarios (Conservador, Base, Optimista) con cálculo del Ratio Beneficio-Coste (**BCR, resultado de modelo/Excel, no observado**).
* 🌐 **Mapa de Riesgo Global 3D:** Visualizador en globo terráqueo con capas dinámicas de amenaza, buscador de ciudades e incidentes en vivo (GDACS).
* 🏢 **Panel Aseguradora:** Simulador de prima relativa por zona geográfica basado en perfiles de riesgo (K-Means/DBSCAN).
* 🆘 **Ayuda Humanitaria:** Índice compuesto de prioridad por país combinando severidad física, vulnerabilidad económica y población.

---

## 🏗️ Arquitectura del Sistema

### Flujo de Datos & Ejecución
```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           GEORISK FINDER - END-TO-END PIPELINE                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

  [ FUENTES EXTERNAS ]          [ INGESTA & LIMPIEZA ]          [ GRID H3 & FEATURES ]         [ ML & CLUSTERING ]         [ PRODUCTO (Multi-página) ]
  ───────────────────          ─────────────────────────        ───────────────────────        ─────────────────────        ─────────────────────────
  ┌──────────────┐             ┌────────────────────┐           ┌────────────────────┐          ┌─────────────────┐         ┌────────────────────────┐
  │ USGS API     │────────────▶│ src/usgs_          │──────────▶│ src/features/      │─────────▶│ src/             │────────▶│ streamlit_app/main.py  │
  │ (Sismos M≥4.5│             │ earthquakes.py     │  raw CSV  │ grid.py            │  grid_   │ preprocessing.py │  model  │ ├── modelo_financiero  │
  │  1900-2026)  │             │ 01_eda_sismos.ipynb│           │ engineering.py     │ features │ 04_preprocesa-  │         │ ├── mapa_global.py     │
  └──────────────┘             └────────────────────┘           │ 03_grid_y_featu-   │ .csv     │ miento_pca.ipynb│         │ ├── panel_aseguradora  │
        │                                                      │ res.ipynb          │          │ src/clustering. │         │ └── ayuda_humanitaria  │
        │                                                      └────────────────────┘          │ py              │         └────────────────────────┘
        │                                                                     │               └─────────────────┘                       │
  ┌──────────────┐             ┌────────────────────┐                │                     │                                          ▼
  │ IBTrACS      │────────────▶│ 02_eda_ciclones_   │────────────────┘                     │                              ┌────────────────────────┐
  │ (Ciclones    │             │ volcanes.ipynb     │                                  ┌─────────────────┐               │ georisk_globe/         │
  │  1970-2025)  │             │ src/features/      │                                  │ MLflow Tracking │               │ (Componentes frontend  │
  └──────────────┘             │ ingestion.py       │                                  │ (Experimentos,  │               │  para mapa 3D)         │
        │                      └────────────────────┘                                  │  Métricas,      │               └────────────────────────┘
        │                                                                               │  Artefactos,    │
  ┌──────────────┐             ┌────────────────────┐           ┌────────────────────┐  │  Model Registry)│
  │ NOAA/NCEI    │────────────▶│ (Volcanes, IGN)    │──────────▶│ src/h3_aggregator. │◀─┘                 │
  │ (Volcanes    │             │                    │           │ py (merge multi-   │                    │
  │  Históricos) │             └────────────────────┘           │ hazard por H3)   │                    │
  └──────────────┘                                              └────────────────────┘                    │
                                                                                                        ▼
                                                                                               ┌────────────┐
                                                                                               │ outputs/   │
                                                                                               │ figures/   │
                                                                                               │ (PNG, HTML)│
                                                                                               └────────────┘
```

### Estructura de Carpetas
```text
GeoRisk_Finder/
├── data/
│   ├── raw/                      # Datos originales (NO versionar >50MB)
│   │   └── ibtracs_sample.csv
│   └── processed/                # Datasets procesados (conteos verificados E4, 2026-11-08)
│       ├── usgs_earthquakes_clean.csv   # 308.977 filas
│       ├── ciclones_clean.csv           # 646.984 filas
│       ├── volcanes_clean.csv           # 278 filas
│       ├── espana_clean.csv             # 203.211 filas (IGN)
│       ├── grid_features.csv            # 41.162 celdas (H3 res 3)
│       ├── cluster_labels.csv           # 41.162 etiquetas K-Means + DBSCAN
│       ├── interpretacion_clusters.csv  # Perfil riesgo por cluster
│       └── casos_estudio.csv            # 10 casos validados geo
├── notebooks/                    # 7 notebooks en orden de ejecución
│   ├── 01_eda_sismos.ipynb           → Ingesta/EDA USGS (David)
│   ├── 02_eda_ciclones_volcanes.ipynb → Ingesta/EDA IBTrACS/NOAA/IGN (Vanessa)
│   ├── 03_grid_y_features.ipynb      → Grid H3 + Feature Engineering (Joel/Juan)
│   ├── 04_preprocesamiento_pca.ipynb → Pipeline Preproc + PCA + joblib (Juan/Anas)
│   ├── 05_modelado_clustering.ipynb  → K-Means + DBSCAN (María Isabel/Anas)
│   ├── 06_evaluacion_estabilidad.ipynb → Bootstrap stability (Anas/Joel)
│   └── 07_interpretacion_casos_estudio.ipynb → Labels semánticos + casos (María Isabel)
├── src/                          # Código reutilizable (importado desde notebooks)
│   ├── config.py                 # Config central (schema, PCA, H3)
│   ├── data_loader.py            # Carga unificada + fallback sintético
│   ├── usgs_earthquakes.py       # Ingesta completa USGS (API, yearly, dedup)
│   ├── h3_aggregator.py          # Merge multi-hazard por H3 genérico
│   ├── features/
│   │   ├── grid.py               # Grid global H3 res=3 + asignación eventos→celdas
│   │   ├── engineering.py        # Features sísmicas/ciclónicas/volcánicas por celda
│   │   └── ingestion.py          # Carga fuentes externas normalizadas
│   ├── preprocessing.py          # Pipeline sklearn: Log1p → OneHot → Scaler → PCA
│   ├── clustering.py             # K-Means (elbow/silhouette) + DBSCAN (k-dist)
│   └── visualization.py          # Gráficos pro: Matplotlib/Plotly/Folium
├── streamlit_app/                # App unificada multi-página (st.navigation)
│   ├── main.py                   # Entry point del dashboard
│   ├── pages/
│   │   ├── modelo_financiero.py  # Dashboard financiero EWS
│   │   ├── mapa_global.py        # Mapa de riesgo global 3D
│   │   ├── panel_aseguradora.py  # Simulador de prima relativa
│   │   └── ayuda_humanitaria.py  # Priorización ayuda humanitaria
│   ├── theme.py                  # Sistema de diseño compartido
│   ├── data_utils.py             # Utilidades de carga de datos
│   ├── requirements.txt
│   └── assets/
│       ├── Modelo_Catastrofes_Alerta_Temprana.xlsx  # 6 hojas modelo financiero
│       ├── Resumen_Ejecutivo_Catastrofes_EWS.pdf
│       ├── Analisis_Sesgos_Modelo_Catastrofes.pdf
│       ├── logo_georisk.png
│       └── favicon.png
├── georisk_globe/                # Componentes frontend para mapa 3D
│   ├── message_sender/
│   └── layer_panel/
├── outputs/figures/              # Gráficos exportados para presentación
├── tests/                        # Pytest suite (data, preproc, clustering, viz)
└── requirements.txt
```

### MLflow Tracking
```bash
# Iniciar servidor MLflow (opcional, para tracking de experimentos)
mlflow ui --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns

# Los notebooks 04, 05, 06 logean automáticamente:
#   - Parámetros (K, eps, n_components, threshold varianza)
#   - Métricas (inertia, silhouette, Jaccard bootstrap, ARI)
#   - Artefactos (pipeline_riesgo.joblib, figuras PCA, cluster maps)
#   - Modelos registrados (KMeans, DBSCAN, Pipeline completo)
```

* **Clusters de Riesgo Compuesto:** identificación de perfiles (K-Means) y anomalías (DBSCAN) sobre el grid H3 procesado; confirmar interpretación vigente en `cluster_labels.csv`/`interpretacion_clusters.csv` y notebooks.
* **Concentración de impacto / BCR:** las afirmaciones cuantitativas previas (p.ej. “12% celdas → 70% impacto”, “BCR 6:1 demostrado”) **no se verifican** como hechos observados en los artefactos del repo; el BCR es un **resultado de simulación/modelo** (Excel de escenarios). Citar solo métricas verificadas o explícitamente como hipótesis/modelo.

---

## ⚙️ Estructura del Repositorio

```
GeoRisk_Finder/
├── data/                         # Datasets procesados y muestras de trabajo
├── notebooks/                    # Pipeline analítico ordenado (01 EDA → 07 Casos Estudio)
├── src/                          # Código modular reutilizable (Ingesta, H3, PCA, Clustering)
├── streamlit_app/                # App unificada multi-página (modelo_financiero, mapa_global, panel_aseguradora, ayuda_humanitaria)
├── georisk_globe/                # Componentes frontend para mapa 3D interactivo
├── outputs/figures/              # Gráficos y mapas exportados
├── tests/                        # Suite de pruebas unitarias (Pytest)
└── requirements.txt              # Dependencias del proyecto
```

---

## 🚀 Guía Rápida de Inicio

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/jowel2701/GeoRisk_Finder.git
cd GeoRisk_Finder

python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

pip install -r requirements.txt
```

### 2. Ejecutar la App Unificada (Streamlit)
```bash
streamlit run streamlit_app/main.py
```

### 3. Ejecutar los Tests
```bash
pytest tests/ -v
```

---

## 👥 Créditos del Proyecto

Proyecto desarrollado por un equipo multidisciplinar de Data Science & BI:

| Miembro | Rol |
|---------|-----|
| **María Isabel** | Product Owner & Business Impact |
| **Joel** | Scrum Master & Spatial Engineering (H3) |
| **David** | Seismic Hazard Lead & ML Engineering |
| **Vanessa** | Atmospheric Hazards Lead & 3D Globe Demo |
| **Juan** | Data Pipeline Architect & Preprocessing Lead |
| **Anas** | Clustering & Model Stability Lead |

---

## 📄 Licencia y Fuentes de Datos

**Licencia:** Uso académico y de demostración.

**Fuentes de datos:**
- **USGS** (United States Geological Survey) — Catálogo sísmico global
- **IBTrACS / NOAA** — Trayectorias ciclónicas históricas
- **IGN** (Instituto Geográfico Nacional de España) — Catálogo sísmico regional
- **NOAA/NCEI** — Base de datos de erupciones volcánicas significativas
- **Aon, Swiss Re, EM-DAT, WMO/UNDRR, World Bank** — Datos financieros y macroeconómicos para el modelo de impacto
