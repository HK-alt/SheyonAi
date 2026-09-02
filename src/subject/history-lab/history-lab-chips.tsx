import { ComposerChip } from '@/components/chat/composer/composer-chip';
import type { HistoryMode } from '@/types/chat';

const TIMELINE_COLOR = '#B45309';
const DIAGRAM_COLOR = '#7C3AED';
const SIM_COLOR = '#EA580C';
const MAP_COLOR = '#0D9488';

type HistoryLabChipsProps = {
  activeMode: HistoryMode;
  onSelect: (mode: HistoryMode) => void;
  disabled?: boolean;
};

/** Always keeps one History Lab mode selected so generation matches the chip. */
export function HistoryLabChips({ activeMode, onSelect, disabled }: HistoryLabChipsProps) {
  return (
    <>
      <ComposerChip
        label="Timeline"
        icon={{ ios: 'calendar', android: 'timeline', web: 'timeline' }}
        iconColor={TIMELINE_COLOR}
        active={activeMode === 'timeline'}
        disabled={disabled}
        onPress={() => onSelect('timeline')}
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
