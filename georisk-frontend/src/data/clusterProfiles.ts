import type { ClusterProfile } from '../types';

export const CLUSTER_PROFILES: Record<number, ClusterProfile> = {
  0: {
    id: 0,
    name: 'Compound Extreme Risk',
    nameShort: 'CER',
    icon: '🔴',
    color: '#DC2626',
    description:
      'Regions facing compounded threats from seismic activity, tropical cyclones, and volcanic hazards simultaneously. These areas experience the highest frequency and intensity of multiple hazard types, with significant overlap and cascading effects.',
    businessInterpretation:
      'Extreme operational risk with potential for simultaneous disruption across supply chains, asset portfolios, and workforce safety. Insurance premiums are prohibitively high, and business continuity requires multi-hazard contingency planning.',
    humanitarianInterpretation:
      'Populations in these zones face chronic displacement, food insecurity, and compounded trauma from repeated disasters. Humanitarian access is frequently compromised, and recovery cycles never complete before the next event.',
    riskLevel: 'Critical',
  },
  1: {
    id: 1,
    name: 'Seismic Corridor',
    nameShort: 'SC',
    icon: '🌋',
    color: '#EA580C',
    description:
      'Concentrated along tectonic plate boundaries, these regions experience high earthquake frequency and intensity. Secondary hazards include tsunamis, landslides, and soil liquefaction.',
    businessInterpretation:
      'Critical risk to physical assets and infrastructure. Seismic retrofitting costs are high but necessary. Business interruption insurance is essential, and real-time monitoring systems are recommended.',
    humanitarianInterpretation:
      'Communities face sudden-onset disasters with high mortality potential. Building codes and early warning systems are life-saving investments. Displacement after major events can last years.',
    riskLevel: 'High',
  },
  2: {
    id: 2,
    name: 'Cyclone Belt',
    nameShort: 'CB',
    icon: '🌀',
    color: '#2563EB',
    description:
      'Coastal and island regions within tropical cyclone formation zones. These areas face seasonal high-wind events, storm surges, and extreme precipitation leading to widespread flooding.',
    businessInterpretation:
      'Seasonal operational disruption with predictable but severe impact windows. Supply chain routing requires seasonal adjustment. Asset insurance is available but expensive in high-frequency zones.',
    humanitarianInterpretation:
      'Predictable seasonal hazards allow for proactive evacuation and preparedness. However, repeated displacement erodes community resilience. Storm surge zones face the highest mortality risk.',
    riskLevel: 'High',
  },
  3: {
    id: 3,
    name: 'Volcanic Arc',
    nameShort: 'VA',
    icon: '⛰️',
    color: '#7C3AED',
    description:
      'Regions along subduction zones with active or dormant volcanoes. Hazards include pyroclastic flows, lahars, ashfall, and volcanic gas emissions with potential for long-term climate effects.',
    businessInterpretation:
      'Localized but severe risk to agriculture, aviation, and tourism. Ashfall disrupts air travel regionally. Long-term exclusion zones may affect land values and community relocation planning.',
    humanitarianInterpretation:
      'Eruptions can be forecast with moderate lead time, enabling evacuation. However, lahars and pyroclastic flows leave little warning. Agricultural recovery after ashfall takes multiple seasons.',
    riskLevel: 'Moderate',
  },
  4: {
    id: 4,
    name: 'Low Exposure',
    nameShort: 'LE',
    icon: '🟢',
    color: '#16A34A',
    description:
      'Regions with minimal natural hazard exposure. These areas experience low frequency and intensity of seismic, cyclonic, and volcanic events, making them relatively safe for habitation and investment.',
    businessInterpretation:
      'Low operational risk from natural hazards. Insurance costs are minimal, and business continuity planning can focus on non-geophysical risks. Stable environment for long-term investment.',
    humanitarianInterpretation:
      'Populations face minimal natural disaster threat. Humanitarian resources in these regions focus on development and capacity building rather than emergency response.',
    riskLevel: 'Low',
  },
};

export function getClusterProfile(
  clusterId: number | undefined | null
): ClusterProfile {
  return clusterId !== undefined && clusterId !== null && CLUSTER_PROFILES[clusterId]
    ? CLUSTER_PROFILES[clusterId]
    : CLUSTER_PROFILES[4];
}
