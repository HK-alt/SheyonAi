import { ComposerChip } from '@/components/chat/composer/composer-chip';
import type { DzongkhaMode } from '@/types/chat';

const LIBRARY_COLOR = '#CA8A04';
const VOCAB_COLOR = '#DB2777';
const DIAGRAM_COLOR = '#7C3AED';
const SIM_COLOR = '#2563EB';
const MAP_COLOR = '#0D9488';

type DzongkhaLabChipsProps = {
  activeMode: DzongkhaMode;
  onSelect: (mode: DzongkhaMode) => void;
  disabled?: boolean;
};

/** Always keeps one Dzongkha mode selected (Library = RAG; others = HTML labs). */
export function DzongkhaLabChips({ activeMode, onSelect, disabled }: DzongkhaLabChipsProps) {
  return (
    <>
      <ComposerChip
        label="Library"
        icon={{ ios: 'books.vertical.fill', android: 'menu_book', web: 'menu_book' }}
        iconColor={LIBRARY_COLOR}
        active={activeMode === 'library'}
        disabled={disabled}
        onPress={() => onSelect('library')}
      />
      <ComposerChip
        label="Vocab"
        icon={{ ios: 'character.textbox', android: 'spellcheck', web: 'spellcheck' }}
        iconColor={VOCAB_COLOR}
        active={activeMode === 'vocab'}
        disabled={disabled}
        onPress={() => onSelect('vocab')}
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
