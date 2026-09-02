import { ComposerChip } from '@/components/chat/composer/composer-chip';
import type { PhysicsMode } from '@/types/chat';

const GRAPH_COLOR = '#2563EB';
const DIAGRAM_COLOR = '#7C3AED';
const SIM_COLOR = '#0EA5E9';
const FIELD_COLOR = '#D97706';

type PhysicsLabChipsProps = {
  activeMode: PhysicsMode;
  onSelect: (mode: PhysicsMode) => void;
  disabled?: boolean;
};

/** Always keeps one Physics Lab mode selected so generation matches the chip. */
export function PhysicsLabChips({ activeMode, onSelect, disabled }: PhysicsLabChipsProps) {
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
        label="Field 3D"
        icon={{ ios: 'globe', android: 'public', web: 'public' }}
        iconColor={FIELD_COLOR}
        active={activeMode === 'field'}
        disabled={disabled}
        onPress={() => onSelect('field')}
      />
    </>
  );
}
