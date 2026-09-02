export const FIELD_SCENE_IDS = [
  'orbit',
  'gravity_well',
  'electric_dipole',
  'uniform_e_field',
  'magnetic_bar',
  'charged_particle',
  'kepler',
  'projectile_motion',
] as const;

export type FieldSceneId = (typeof FIELD_SCENE_IDS)[number];

export type FieldCatalogEntry = {
  id: FieldSceneId;
  title: string;
  closestNote?: string;
  attribution: string;
};

const ATTR = 'Procedural teaching scene — not a lab measurement';

export const FIELD_CATALOG: Record<FieldSceneId, FieldCatalogEntry> = {
  orbit: {
    id: 'orbit',
    title: 'Orbital motion',
    attribution: ATTR,
  },
  gravity_well: {
    id: 'gravity_well',
    title: 'Gravity well',
    attribution: ATTR,
  },
  electric_dipole: {
    id: 'electric_dipole',
    title: 'Electric dipole',
    attribution: ATTR,
  },
  uniform_e_field: {
    id: 'uniform_e_field',
    title: 'Uniform electric field',
    attribution: ATTR,
  },
  magnetic_bar: {
    id: 'magnetic_bar',
    title: 'Bar magnet field',
    attribution: ATTR,
  },
  charged_particle: {
    id: 'charged_particle',
    title: 'Charged particle in a field',
    attribution: ATTR,
  },
  kepler: {
    id: 'kepler',
    title: 'Kepler orbit',
    attribution: ATTR,
    closestNote: 'Closest bundled orbital model for multi-body or comet requests.',
  },
  projectile_motion: {
    id: 'projectile_motion',
    title: 'Projectile trajectory',
    attribution: ATTR,
    closestNote: '3D parabolic path with velocity vector — closest match for ballistic motion requests.',
  },
};

export function isFieldSceneId(value: string): value is FieldSceneId {
  return (FIELD_SCENE_IDS as readonly string[]).includes(value);
}

export function getFieldCatalogEntry(id: FieldSceneId): FieldCatalogEntry {
  return FIELD_CATALOG[id];
}

const ALIASES: Record<string, FieldSceneId> = {
  planet: 'orbit',
  planetary: 'orbit',
  satellite: 'orbit',
  moon: 'orbit',
  gravity: 'gravity_well',
  well: 'gravity_well',
  gravitational: 'gravity_well',
  dipole: 'electric_dipole',
  'e-field': 'uniform_e_field',
  electric: 'uniform_e_field',
  'electric-field': 'uniform_e_field',
  magnetic: 'magnetic_bar',
  magnet: 'magnetic_bar',
  'b-field': 'magnetic_bar',
  particle: 'charged_particle',
  lorentz: 'charged_particle',
  ellipse: 'kepler',
  elliptical: 'kepler',
  comet: 'kepler',
  projectile: 'projectile_motion',
  ballistic: 'projectile_motion',
  trajectory: 'projectile_motion',
  parabola: 'projectile_motion',
  height: 'projectile_motion',
};

export function resolveFieldSceneId(requested: string): FieldSceneId {
  const key = requested.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  if (isFieldSceneId(key)) return key;
  if (ALIASES[key]) return ALIASES[key];
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) return id;
  }
  return 'orbit';
}
