/**
 * Professional presentation design system — multiple named themes shared by
 * the in-chat slide viewer and the .pptx builder so preview ≈ download.
 */

export type PresentationThemeId =
  | 'academic'
  | 'science'
  | 'business'
  | 'history'
  | 'tech'
  | 'creative';

export type SlideThemeTokens = {
  id: PresentationThemeId;
  label: string;
  /** Short description used in the AI prompt so the model picks the right look. */
  description: string;
  colorPrimary: string;
  colorAccent: string;
  colorGold: string;
  colorBackground: string;
  colorSurface: string;
  colorSectionBg: string;
  colorClosingBg: string;
  colorText: string;
  colorTextSecondary: string;
  colorTextLight: string;
  colorTextMuted: string;
  colorTopLine: string;
  colorFooterBg: string;
  colorFooterText: string;
};

export const PRESENTATION_THEMES: Record<PresentationThemeId, SlideThemeTokens> = {
  academic: {
    id: 'academic',
    label: 'Academic',
    description:
      'Deep ink navy + teal + warm gold. Best for general courses, textbooks, exams, and formal classroom teaching.',
    colorPrimary: '#0F1C3F',
    colorAccent: '#0D9488',
    colorGold: '#C4A35A',
    colorBackground: '#F7F8FC',
    colorSurface: '#EEF1FB',
    colorSectionBg: '#0D9488',
    colorClosingBg: '#0F1C3F',
    colorText: '#111827',
    colorTextSecondary: '#4B5563',
    colorTextLight: '#FFFFFF',
    colorTextMuted: '#94A3B8',
    colorTopLine: '#0D9488',
    colorFooterBg: '#0F1C3F',
    colorFooterText: '#94A3B8',
  },
  science: {
    id: 'science',
    label: 'Science',
    description:
      'Forest teal + emerald + cyan. Best for biology, chemistry, physics, medicine, lab topics, and STEM units.',
    colorPrimary: '#064E3B',
    colorAccent: '#059669',
    colorGold: '#22D3EE',
    colorBackground: '#F0FDF9',
    colorSurface: '#D1FAE5',
    colorSectionBg: '#059669',
    colorClosingBg: '#064E3B',
    colorText: '#064E3B',
    colorTextSecondary: '#047857',
    colorTextLight: '#FFFFFF',
    colorTextMuted: '#6EE7B7',
    colorTopLine: '#059669',
    colorFooterBg: '#064E3B',
    colorFooterText: '#A7F3D0',
  },
  business: {
    id: 'business',
    label: 'Business',
    description:
      'Charcoal slate + indigo + amber. Best for economics, entrepreneurship, career skills, finance, and professional talks.',
    colorPrimary: '#1E293B',
    colorAccent: '#4F46E5',
    colorGold: '#D97706',
    colorBackground: '#F8FAFC',
    colorSurface: '#E0E7FF',
    colorSectionBg: '#4F46E5',
    colorClosingBg: '#1E293B',
    colorText: '#0F172A',
    colorTextSecondary: '#475569',
    colorTextLight: '#FFFFFF',
    colorTextMuted: '#94A3B8',
    colorTopLine: '#4F46E5',
    colorFooterBg: '#1E293B',
    colorFooterText: '#94A3B8',
  },
  history: {
    id: 'history',
    label: 'History',
    description:
      'Burgundy + sand + brass. Best for history, literature, humanities, philosophy, and cultural studies.',
    colorPrimary: '#4C1D1D',
    colorAccent: '#9F1239',
    colorGold: '#B45309',
    colorBackground: '#FFFBEB',
    colorSurface: '#FEF3C7',
    colorSectionBg: '#9F1239',
    colorClosingBg: '#4C1D1D',
    colorText: '#3F1A1A',
    colorTextSecondary: '#7C2D12',
    colorTextLight: '#FFFFFF',
    colorTextMuted: '#D6A07A',
    colorTopLine: '#9F1239',
    colorFooterBg: '#4C1D1D',
    colorFooterText: '#D6A07A',
  },
  tech: {
    id: 'tech',
    label: 'Tech',
    description:
      'Near-black + electric blue + violet. Best for computer science, AI, coding, engineering, and digital topics.',
    colorPrimary: '#0B1220',
    colorAccent: '#2563EB',
    colorGold: '#8B5CF6',
    colorBackground: '#F1F5F9',
    colorSurface: '#DBEAFE',
    colorSectionBg: '#2563EB',
    colorClosingBg: '#0B1220',
    colorText: '#0F172A',
    colorTextSecondary: '#334155',
    colorTextLight: '#FFFFFF',
    colorTextMuted: '#64748B',
    colorTopLine: '#2563EB',
    colorFooterBg: '#0B1220',
    colorFooterText: '#94A3B8',
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    description:
      'Plum + coral + cream. Best for arts, design, music, creative writing, and expressive subjects.',
    colorPrimary: '#4A1942',
    colorAccent: '#DB2777',
    colorGold: '#F59E0B',
    colorBackground: '#FFF7FB',
    colorSurface: '#FCE7F3',
    colorSectionBg: '#DB2777',
    colorClosingBg: '#4A1942',
    colorText: '#3B0A2E',
    colorTextSecondary: '#9D174D',
    colorTextLight: '#FFFFFF',
    colorTextMuted: '#F9A8D4',
    colorTopLine: '#DB2777',
    colorFooterBg: '#4A1942',
    colorFooterText: '#F9A8D4',
  },
};

export const PRESENTATION_THEME_IDS: PresentationThemeId[] = [
  'academic',
  'science',
  'business',
  'history',
  'tech',
  'creative',
];

/** Prompt block describing every theme so the model can choose intentionally. */
export function buildThemePromptBlock(): string {
  const lines = PRESENTATION_THEME_IDS.map((id) => {
    const t = PRESENTATION_THEMES[id];
    return `- "${id}" (${t.label}): ${t.description}`;
  });
  return `THEME RULES:
- You MUST set "theme" to exactly one of: ${PRESENTATION_THEME_IDS.map((id) => `"${id}"`).join(', ')}.
- Choose the theme that best matches the topic and audience — do not default to "academic" when another fit is clearer.
- Theme options:
${lines.join('\n')}`;
}

/** Resolve a deck's theme string to concrete colour tokens (falls back to academic). */
export function resolveTheme(themeName?: string | null): SlideThemeTokens {
  const key = (themeName ?? '').trim().toLowerCase() as PresentationThemeId;
  if (key && key in PRESENTATION_THEMES) {
    return PRESENTATION_THEMES[key];
  }
  return PRESENTATION_THEMES.academic;
}

/** Strip # from a hex colour for pptxgenjs. */
export function pptxColor(hex: string): string {
  return hex.replace(/^#/, '').toUpperCase();
}
