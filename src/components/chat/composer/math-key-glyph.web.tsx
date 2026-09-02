import { createElement } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { tryRenderKatex } from '@/lib/katex-render';

import 'katex/dist/katex.min.css';

type MathKeyGlyphProps = {
  label: string;
  preview?: string;
  color: string;
};

export function MathKeyGlyph({ label, preview, color }: MathKeyGlyphProps) {
  const latex = preview && /[\\^_{]/.test(preview) ? preview : '';
  const result = latex ? tryRenderKatex(latex, false) : { ok: false as const, source: '' };

  if (!result.ok) {
    return (
      <ThemedText style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    );
  }

  const html = `<style>
    .katex,.katex *,.katex-html,.base,.mord,.mrel,.mbin,.mop,.minner{
      color:${color}!important;
      fill:${color}!important;
    }
    .katex{font-size:1.08em;}
  </style>${result.html}`;

  return createElement('span', {
    className: 'math-key-glyph',
    style: {
      color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      lineHeight: 1,
      overflow: 'hidden',
    },
    dangerouslySetInnerHTML: { __html: html },
  });
}

const styles = StyleSheet.create({
  label: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: Fonts.serif,
  },
});
