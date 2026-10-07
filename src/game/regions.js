// Official academic unit names; internal region IDs stay stable for existing saves.
export const regions = [
  { id: 'village', name: 'Academic Preparatory Program', subtitle: 'A small beginning. A wide horizon.', color: '#f4bd62', x: 0, z: 12, unitId: 'app' },
  { id: 'engineering', name: 'Department of Engineering', subtitle: 'Build what carries us forward.', color: '#eab56f', x: 38, z: -24, unitId: 'engineering' },
  { id: 'computing', name: 'Department of Computing and Informatics', subtitle: 'Every mystery has a pattern.', color: '#83cedb', x: 60, z: 21, unitId: 'computing' },
  { id: 'business', name: 'Department of Business Administration', subtitle: 'Ideas meet opportunity.', color: '#f0bb82', x: 31, z: 63, unitId: 'business' },
  { id: 'english', name: 'Department of English', subtitle: 'Listen. Every leaf has a story.', color: '#d79ccc', x: -24, z: 57, unitId: 'english' },
  { id: 'medical', name: 'Department of Medical & Health Sciences', subtitle: 'Observe closely. Care deeply.', color: '#95cdb3', x: -61, z: 24, unitId: 'medical' },
  { id: 'social', name: 'Department of Social Sciences and Law', subtitle: 'Understand the world together.', color: '#aeb1de', x: -58, z: -28, unitId: 'social' },
  { id: 'mathematics', name: 'Department of Mathematics and Natural Sciences', subtitle: 'Follow the light of discovery.', color: '#98bbec', x: -26, z: -64, unitId: 'mathematics' },
  { id: 'dentistry', name: 'College of Dentistry', subtitle: 'Precision in the service of care.', color: '#ead8b4', x: 18, z: -62, unitId: 'dentistry' },
  { id: 'pharmacy', name: 'College of Pharmacy', subtitle: 'Grow a question. Find an answer.', color: '#bcbae1', x: 58, z: -55, unitId: 'pharmacy' },
];

export const regionById = Object.fromEntries(regions.map(region => [region.id, region]));
