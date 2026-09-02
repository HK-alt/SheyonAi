import { ComposerChip, type ComposerChipIcon } from '@/components/chat/composer/composer-chip';

const EQUATION_ICON: ComposerChipIcon = {
  ios: 'function',
  android: 'functions',
  web: 'functions',
};

const SOLVE_ICON: ComposerChipIcon = {
  ios: 'checkmark.circle.fill',
  android: 'check_circle',
  web: 'check_circle',
};

type MathModeChipsProps = {
  equationOpen: boolean;
  onToggleEquation: () => void;
  solveActive: boolean;
  onToggleSolve: () => void;
  disabled?: boolean;
};

export function MathModeChips({
  equationOpen,
  onToggleEquation,
  solveActive,
  onToggleSolve,
  disabled,
}: MathModeChipsProps) {
  return (
    <>
      <ComposerChip
        label="Equation"
        icon={EQUATION_ICON}
        iconColor="#2563EB"
        active={equationOpen}
        disabled={disabled}
        onPress={onToggleEquation}
      />
      <ComposerChip
        label="Solve"
        icon={SOLVE_ICON}
        iconColor="#22C55E"
        active={solveActive}
        disabled={disabled}
        onPress={onToggleSolve}
      />
    </>
  );
}
