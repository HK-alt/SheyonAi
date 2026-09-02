import { ComposerChip } from '@/components/chat/composer/composer-chip';
import type { ChemistryMode } from '../../types/chat';

const GRAPH_COLOR = '#2563EB';
const DIAGRAM_COLOR = '#7C3AED';
const SIM_COLOR = '#0EA5E9';
const MOLECULE_COLOR = '#D97706';

type ChemistryLabChipsProps = {
  activeMode: ChemistryMode;
  onSelect: (mode: ChemistryMode) => void;
  disabled?: boolean;
};

/** Always keeps one Chemistry Lab mode selected so generation matches the chip. */
export function ChemistryLabChips({ activeMode, onSelect, disabled }: ChemistryLabChipsProps) {
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
        icon={{ ios: 'flask.fill', android: 'labs', web: 'labs' }}
        iconColor={SIM_COLOR}
        active={activeMode === 'sim'}
        disabled={disabled}
        onPress={() => onSelect('sim')}
      />
      <ComposerChip
        label="Molecule 3D"
        icon={{ ios: 'atom', android: 'science', web: 'science' }}
        iconColor={MOLECULE_COLOR}
        active={activeMode === 'molecule'}
        disabled={disabled}
        onPress={() => onSelect('molecule')}
      />
    </>
  );
}
