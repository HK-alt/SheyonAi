import { useState } from 'react';

import { ComposerChip } from '@/components/chat/composer/composer-chip';
import { getSubjectAccentColor, getSubjectChipIcon, getSubjectConfig } from '@/subject/config';
import { SubjectSheet } from '@/subject/subject-sheet';
import type { Subject } from '@/subject/subjects';
import type { SubjectChipsMode } from '@/subject/types';

type SubjectChipsProps = {
  mode: SubjectChipsMode;
  activeSubject?: Subject | null;
  disabled?: boolean;
  floating?: boolean;
};

export function SubjectChips({ mode, activeSubject, disabled }: SubjectChipsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (mode === 'hidden') return null;

  const activeConfig = activeSubject ? getSubjectConfig(activeSubject) : null;
  const label = mode === 'workspace' && activeConfig ? activeConfig.label : 'Subject';
  const isActive = mode === 'workspace' && !!activeSubject;
  const icon = isActive ? getSubjectChipIcon(activeSubject) : getSubjectChipIcon(null);
  const iconColor = isActive
    ? (getSubjectAccentColor(activeSubject) ?? '#5B7CFA')
    : '#5B7CFA';

  return (
    <>
      <ComposerChip
        label={label}
        icon={icon}
        iconColor={iconColor}
        active={isActive}
        disabled={disabled}
        onPress={() => setSheetOpen(true)}
      />
      <SubjectSheet
        visible={sheetOpen}
        mode={mode}
        activeSubject={activeSubject}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
