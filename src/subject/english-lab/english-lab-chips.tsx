import { ComposerChip } from '@/components/chat/composer/composer-chip';
import type { EnglishMode } from '@/types/chat';

const ESSAY_COLOR = '#DB2777';
const DIAGRAM_COLOR = '#7C3AED';
const SIM_COLOR = '#2563EB';
const MAP_COLOR = '#0D9488';

type EnglishLabChipsProps = {
  activeMode: EnglishMode;
  onSelect: (mode: EnglishMode) => void;
  disabled?: boolean;
};

/** Always keeps one English Lab mode selected so generation matches the chip. */
export function EnglishLabChips({ activeMode, onSelect, disabled }: EnglishLabChipsProps) {
  return (
    <>
      <ComposerChip
        label="Essay"
        icon={{ ios: 'pencil.line', android: 'edit_note', web: 'edit_note' }}
        iconColor={ESSAY_COLOR}
        active={activeMode === 'essay'}
        disabled={disabled}
        onPress={() => onSelect('essay')}
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
        icon={{ ios: 'checkmark.circle.fill', android: 'quiz', web: 'quiz' }}
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
