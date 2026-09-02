import type { PhysicsMode } from '@/types/chat';

const GRAPH_PATTERNS =
  /\b(plot|graph|chart|curve|vs\.?\s*time|height\s+vs|v[-–]t|i[-–]v|x[-–]t|y[-–]t|energy\s+vs|show\s+an?\s+(?:graph|plot|chart))\b/i;

const SIM_PATTERNS =
  /\b(simulate|simulation|interactive|slider|damping|play\/pause|play\s+and\s+pause|lab\s+sim|run\s+a?\s+sim)\b/i;

const DIAGRAM_PATTERNS =
  /\b(diagram|draw|free[- ]body|fbd|circuit|ray\s+optics|ray\s+diagram|svg|schematic|wiring)\b/i;

const FIELD_PATTERNS =
  /\b(3d|three[- ]d|orbit|orbital|gravity\s+well|e[- ]?field|electric\s+field|magnetic|b[- ]?field|kepler|dipole|field\s+3d|trajectory\s+in\s+space|charged\s+particle)\b/i;

const PROJECTILE_3D_PATTERNS =
  /\b(3d\s+projectile|projectile\s+trajectory|ballistic\s+trajectory|parabolic\s+path)\b/i;

const PROJECTILE_GRAPH_PATTERNS =
  /\b(projectile|ballistic|height\s+vs\s+time|range\s+vs)\b/i;

/**
 * Infer Physics Lab mode from natural-language prompt when the user has not
 * manually selected a chip this session.
 */
export function inferPhysicsModeFromPrompt(text: string): PhysicsMode | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (PROJECTILE_3D_PATTERNS.test(trimmed) || (FIELD_PATTERNS.test(trimmed) && !GRAPH_PATTERNS.test(trimmed))) {
    if (PROJECTILE_3D_PATTERNS.test(trimmed)) return 'field';
    if (/\b(3d|orbit|field|magnetic|electric|kepler|gravity\s+well|dipole)\b/i.test(trimmed)) {
      return 'field';
    }
  }

  if (DIAGRAM_PATTERNS.test(trimmed) && !GRAPH_PATTERNS.test(trimmed) && !SIM_PATTERNS.test(trimmed)) {
    return 'diagram';
  }

  if (SIM_PATTERNS.test(trimmed) && !GRAPH_PATTERNS.test(trimmed)) {
    return 'sim';
  }

  if (GRAPH_PATTERNS.test(trimmed)) {
    return 'graph';
  }

  if (PROJECTILE_GRAPH_PATTERNS.test(trimmed) && /\b(plot|graph|height|time|vs)\b/i.test(trimmed)) {
    return 'graph';
  }

  if (PROJECTILE_GRAPH_PATTERNS.test(trimmed) && /\b(simulate|simulation|slider)\b/i.test(trimmed)) {
    return 'sim';
  }

  if (PROJECTILE_GRAPH_PATTERNS.test(trimmed) && /\b(3d|trajectory)\b/i.test(trimmed)) {
    return 'field';
  }

  return null;
}
