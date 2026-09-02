import { useRouter } from 'expo-router';

import { ComposerChip } from '@/components/chat/composer/composer-chip';
import type { SubjectChipsMode } from '@/subject/types';

type PersonalTutorChipProps = {
  mode?: SubjectChipsMode;
  active?: boolean;
  disabled?: boolean;
  floating?: boolean;
};

export function PersonalTutorChip({
  mode = 'launcher',
  active,
  disabled,
}: PersonalTutorChipProps) {
  const router = useRouter();

  if (mode === 'hidden') return null;

  const handlePress = () => {
    const href = { pathname: '/subject/[id]', params: { id: 'personal' } } as const;
    if (mode === 'launcher') {
      router.push(href);
      return;
    }
    if (!active) {
      router.replace(href);
    }
  };

  return (
    <ComposerChip
      label="Personal Tutor"
      icon={{ ios: 'graduationcap.fill', android: 'school', web: 'school' }}
      iconColor="#FF8A4C"
      active={active}
      disabled={disabled || (mode === 'workspace' && active)}
      onPress={handlePress}
    />
  );
}
