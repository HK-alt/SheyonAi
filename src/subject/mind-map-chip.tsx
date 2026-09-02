import { ComposerChip } from '@/components/chat/composer/composer-chip';

type MindMapChipProps = {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  floating?: boolean;
};

export function MindMapChip({ active, onToggle, disabled }: MindMapChipProps) {
  return (
    <ComposerChip
      label="Mind map"
      icon={{
        ios: 'point.3.connected.trianglepath.filled',
        android: 'account_tree',
        web: 'account_tree',
      }}
      iconColor="#34D399"
      active={active}
      disabled={disabled}
      onPress={onToggle}
    />
  );
}
