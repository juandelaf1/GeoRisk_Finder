# Análisis Estratégico — Plataformas Benchmark

> Documento de referencia para decisiones de producto.
> Analizadas: ClimateAI, Jupiter Intelligence, Palantir Foundry, Tomorrow.io, ArcGIS, Bloomberg Terminal, Datadog, Uber Movement.
> Julio 2026.

---

## PRINCIPIOS POR PLATAFORMA

### ClimateAI → El riesgo se explica, no se muestra
**Problema que resuelve:** Procura de alimentos sabiendo con 6 meses de anticipación qué regiones tendrán estrés hídrico.
**Por qué vuelven:** Las predicciones son accionables — mueven inventario, ajustan contratos, informan I+D.
**Cómo deciden:** No dan un score. Dan narrativa causal: "este cultivo en esta ubicación tendrá estrés hídrico porque las temperaturas superficiales del mar indican…"
**Patrón UX:** Explicación sobre visualización. Incertidumbre como ventaja.
**Lección:** Los usuarios no quieren un score. Quieren entender por qué existe el riesgo.

### Jupiter Intelligence → El riesgo es futuro, no histórico
**Problema que resuelve:** Bancos y aseguradoras necesitan saber el riesgo físico de un activo en 2050, no en 2020.
**Por qué vuelven:** Proyecciones financieras auditables (MRM-ready) que puedes defender en un consejo.
**Cómo deciden:** Traducen cada hazard en impacto en P&L. 22,000 métricas por ubicación, 5 escenarios IPCC, pasos de 5 años hasta 2100.
**Patrón UX:** Simulation mode + financial translation layer. Adaptation Hub con ROI por medida.
**Lección:** Las organizaciones toman decisiones sobre el futuro, no sobre el pasado.

### Palantir Foundry → El sistema no muestra datos, muestra acciones
**Problema que resuelve:** Analistas militares/de inteligencia necesitan decidir, no explorar datos.
**Por qué vuelven:** Cada objeto tiene acciones (verbos). El flujo de trabajo está diseñado alrededor de decisiones.
**Cómo deciden:** Ontología = nombres + verbos del negocio. El diseño empieza por "qué decisiones tomará el usuario".
**Patrón UX:** Mínima información necesaria para decidir, nada más. Jerarquía F-shaped. Whitespace 30-40%.
**Lección:** Los mejores sistemas no muestran información. Muestran qué hacer con ella.

### Tomorrow.io → Segundos para entender una crisis
**Problema que resuelve:** Aerolíneas, minería, gobiernos necesitan saber si una tormenta afectará sus operaciones HOY.
**Por qué vuelven:** Alertas automatizadas con protocolos: "si viento > 80 km/h → cerrar operaciones".
**Cómo deciden:** Gale (AI generativa) sintetiza datos en recomendaciones. Timeline interactivo de eventos. Probabilistic forecasting con 51 escenarios.
**Patrón UX:** Señalamiento (signaling) sobre recomendación directa — el usuario necesita drill-down para confiar.
**Lección:** Un usuario debe entender una situación crítica en segundos.

### ArcGIS → La complejidad aparece gradualmente
**Problema que resuelve:** Cualquier organización necesita organizar, descubrir y compartir información geoespacial.
**Por qué vuelven:** Es la plataforma estándar — interoperabilidad, escalabilidad, ecosistema.
**Cómo deciden:** Progressive disclosure en capas: shell → panel → block → content. El mapa es el centro.
**Patrón UX:** Layout patterns predecibles. Responsive design integrado. Accesibilidad nativa.
**Lección:** La complejidad debe aparecer gradualmente. Nunca toda a la vez.

### Bloomberg Terminal → Densidad sin caos
**Problema que resuelve:** 350,000 decisores financieros necesitan entender el estado del mercado en segundos.
**Por qué vuelven:** Consistencia absoluta — llevan 40 años con el mismo teclado. Cada tecla hace lo mismo siempre.
**Cómo deciden:** Jerarquía visual impecable. Lo importante es grande, lo contextual es pequeño. Ocultan complejidad.
**Patrón UX:** KPIs ejecutivos primero. Consistencia > innovación. Información ejecutable.
**Lección:** Los responsables quieren entender el sistema en menos de un minuto.

### Datadog → Cada indicador es un entry point
**Problema que resuelve:** Equipos de infraestructura necesitan encontrar la causa raíz de un incidente en minutos.
**Por qué vuelven:** Navegación global → detalle → causa raíz sin callejones sin salida.
**Cómo deciden:** Story-centric UX: los datos se organizan automáticamente en categorías narrativas. Cmd+K como navegación universal.
**Patrón UX:** Quick nav pattern en toda la plataforma. Cero dead ends. Contextualización automática.
**Lección:** Todo indicador debe permitir profundizar hasta encontrar la causa raíz.

### Uber Movement → La agregación revela patrones
**Problema que resuelve:** Ciudades necesitan entender patrones de movilidad sin violar privacidad individual.
**Por qué vuelven:** Datos agregados que antes no existían — comparación entre distritos, horas, estaciones.
**Cómo deciden:** Agregación espacial en zonas de tráfico. El valor está en la comparación, no en el absoluto.
**Patrón UX:** De ciudad a distrito a calle — la información se adapta a la escala.
**Lección:** La geografía debe ayudar a descubrir patrones, no solo mostrar ubicaciones.

---

## PATRONES TRANSVERSALES

### De UX
- **Progressive disclosure** — ClimateAI, ArcGIS, Datadog: capas de complejidad
- **Story-first** — Datadog, ClimateAI: datos organizados en narrativas
- **Command palette** — Datadog (Cmd+K), Bloomberg, Tomorrow.io
- **Zero dead ends** — Datadog, Bloomberg: desde cualquier insight a la causa raíz
- **Contextual actions** — Palantir, Tomorrow.io: cada objeto tiene acciones

### De visualización
- **Map as center** — ArcGIS, ClimateAI, Uber Movement: el mapa es el canvas
- **KPI row first** — Bloomberg, Datadog, ExecutiveDashboard
- **Timeline as narrative** — Jupiter, Tomorrow.io: el tiempo organiza la historia
- **Comparison as insight** — Jupiter (Adaptation Hub), Bloomberg, Uber Movement

### De producto
- **Decision-oriented design** — Palantir, Jupiter: cada pantalla responde una decisión
- **Future-first projections** — Jupiter, ClimateAI: todo se proyecta
- **Financial translation** — Jupiter, Bloomberg: riesgo físico → $$$ siempre
- **Confidence signaling** — ClimateAI, Tomorrow.io: incertidumbre visible

### De toma de decisiones
- **Signal vs noise** — Tomorrow.io: solo lo que requiere acción hoy
- **Recommend + drill-down** — Todas: recomendación + datos fuente
- **Scenarios** — Jupiter: "si pasa X, entonces Y"
- **Time pressure** — Tomorrow.io, ContingencyMeasures: ventana de acción

---

## MATRIZ DE EVALUACIÓN — GeoRisk Finder (Actualizada Julio 2026)

| Principio | Status | Implementación |
|-----------|--------|----------------|
| Todo riesgo se explica | ✓ COMPLETO | RiskStory + NarrativeTimeline con escenarios IPCC |
| Todo riesgo es futuro | ✓ COMPLETO | TimelineBar 2024-2100 + ScenarioComparison + proyecciones reales |
| Sistema muestra acciones | ✓ COMPLETO | ActionBar con 5 acciones: export, monitor, compare, alert, business case |
| Complejidad gradual | ✓ COMPLETO | DecisionCenter colapsable + EventExplorer con drill-down |
| Segundos para crisis | ✓ COMPLETO | ActiveAlertsOverlay en Globe + WebSocket push + severidad visual |
| Zero dead ends | ✓ COMPLETO | EventExplorer + hazard bars clickeables + risk → methodology |
| Financial translation | ✓ COMPLETO | FinancialImpactStatement + endpoint real con datos cluster/grid |
| Comparación central | ✓ COMPLETO | GeoComparator + ActionBar "Compare" + ScenarioComparison |

---

## PRIORIDAD PARA Phase 2

1. **Financial Translation Layer** — convierte GeoRisk en herramienta de negocio
2. **Story-Centric UX** — diferencia radical vs otros dashboards
3. **Acciones Operacionales** — cierra el loop decisión → acción
4. **Escenarios y Proyecciones** — conecta TimelineBar a datos reales
5. **Zero Dead Ends** — elimina frustración, aumenta confianza
6. **ExecutiveDashboard 30s** — la vista que un ministro necesita
