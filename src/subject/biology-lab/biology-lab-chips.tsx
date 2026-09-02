import { ComposerChip } from '@/components/chat/composer/composer-chip';
import type { BiologyMode } from '@/types/chat';

const GRAPH_COLOR = '#2563EB';
const DIAGRAM_COLOR = '#7C3AED';
const SIM_COLOR = '#0EA5E9';
const ANATOMY_COLOR = '#059669';

type BiologyLabChipsProps = {
  activeMode: BiologyMode;
  onSelect: (mode: BiologyMode) => void;
  disabled?: boolean;
};

/** Always keeps one Biology Lab mode selected so generation matches the chip. */
export function BiologyLabChips({ activeMode, onSelect, disabled }: BiologyLabChipsProps) {
  return (
    <>
      <ComposerChip
        label="Graph"
        icon={{ ios: 'chart.xyaxis.line', android: 'show_chart', web: 'show_chart' }}
        iconColor={GRAPH_COLOR}
        active={activeMode === 'graph'}
        disabled={disabled}
        onPress={() => onSelect('graph')}
      />
      <ComposerChip
        label="Diagram"
        icon={{ ios: 'pencil.and.outline', android: 'architecture', web: 'architecture' }}
        iconColor={DIAGRAM_COLOR}
        active={activeMode === 'diagram'}
        disabled={disabled}
        onPress={() => onSelect('diagram')}
      />
      <ComposerChip
        label="Lab"
        icon={{ ios: 'play.circle.fill', android: 'science', web: 'science' }}
        iconColor={SIM_COLOR}
        active={activeMode === 'sim'}
        disabled={disabled}
        onPress={() => onSelect('sim')}
      />
      <ComposerChip
        label="Anatomy 3D"
        icon={{ ios: 'cube.fill', android: 'view_in_ar', web: 'view_in_ar' }}
        iconColor={ANATOMY_COLOR}
        active={activeMode === 'anatomy'}
        disabled={disabled}
        onPress={() => onSelect('anatomy')}
      />
    </>
  );
}
