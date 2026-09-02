import { ComposerChip } from '@/components/chat/composer/composer-chip';
import type { GeographyMode } from '@/types/chat';

const GRAPH_COLOR = '#2563EB';
const DIAGRAM_COLOR = '#7C3AED';
const SIM_COLOR = '#0EA5E9';
const MAP_COLOR = '#0D9488';

type GeographyLabChipsProps = {
  activeMode: GeographyMode;
  onSelect: (mode: GeographyMode) => void;
  disabled?: boolean;
};

/** Always keeps one Geography Lab mode selected so generation matches the chip. */
export function GeographyLabChips({ activeMode, onSelect, disabled }: GeographyLabChipsProps) {
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
        label="Map"
        icon={{ ios: 'map.fill', android: 'map', web: 'map' }}
        iconColor={MAP_COLOR}
        active={activeMode === 'map'}
        disabled={disabled}
        onPress={() => onSelect('map')}
      />
    </>
  );
}
