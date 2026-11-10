# GeoRisk Finder — Technical Case Study

## Problem
Natural hazards are often analyzed in isolation, while real exposure can involve overlapping threats and uneven spatial patterns. The project aims to integrate multi-hazard signals on a common geospatial grid and communicate risk profiles and scenario-based impact exploration in an interpretable way.

## Decisions
- **Spatial unification with H3:** aggregate heterogeneous hazard/event data onto a hexagonal grid (H3, res 3 in processed artifacts) for comparable spatial analysis.
- **Multi-source ingestion and processing:** combine datasets such as USGS earthquakes, cyclone/volcanic/IGN-related records (as available in the project pipeline) into processed features and labels.
- **Unsupervised profiling:** use dimensionality reduction and clustering (e.g. PCA + K-Means/DBSCAN, as documented) to identify macro risk profiles and atypical cells.
- **Scenario-oriented impact exploration:** present financial/decision views (including BCR-style outputs) as **model/scenario results** (e.g. Excel/model-driven), not observed losses.
- **Interactive communication:** Streamlit-based dashboards/views and geospatial visualizations to explore risk patterns, cases, and scenario comparisons.

## Trade-offs
- **Global consistency vs local precision:** H3 aggregation enables comparability but abstracts local detail and depends on source quality/granularity.
- **Interpretability vs complexity:** clustering/profiles aid exploration but require careful interpretation and validation; labels are analytical constructs, not ground truth.
- **Scenario usefulness vs evidential certainty:** financial/ROI outputs support planning discussions but must not be framed as observed outcomes or guaranteed returns.
- **Artifact availability vs pipeline completeness:** reproducibility depends on having required processed datasets/models/assets present and consistent with notebook/pipeline steps.

## Evidence
- **Processed artifacts (repo-verified, as documented in README):** grid/features/labels and cleaned hazard datasets with reported row counts (e.g. ~41k H3 cells; dataset sizes noted in project docs/README at verification time).
- **Codebase and notebooks:** ingestion/feature engineering/preprocessing/clustering/visualization modules and ordered notebooks describing the analytical flow.
- **Application surfaces:** Streamlit multi-page app and visualization components for risk exploration and scenario/impact views.
- **Tests/tooling:** pytest suite and project tooling/config present in repository (coverage/depth vary by area).

## Limits & learnings
- **Limits:** collaborative academic/demo context; some previously cited figures may not be verifiable in current processed artifacts and must be stated carefully; financial metrics are model outputs (not observed). Results depend on data coverage, preprocessing choices, and modeling assumptions.
- **Learnings:** explicit data verification notes, clear separation between observed data and modeled scenarios, and reproducible feature/label artifacts improve credibility in geospatial risk analytics projects.
