import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  TREE_VIZ_MODE_LABELS,
  TREE_VIZ_MODE_SUBTITLES,
  TREE_VIZ_MODES,
  type TreeVizMode,
} from '@/subject/tree-viz';

type ToolsSheetProps = {
  visible: boolean;
  onClose: () => void;
  documentsActive: boolean;
  onToggleDocuments: () => void;
  treeVizMode: TreeVizMode | null;
  onSelectTreeViz: (mode: TreeVizMode) => void;
  presentationActive: boolean;
  onTogglePresentation: () => void;
  /** When false, hide tree viz (subject workspaces) */
  showTreeViz?: boolean;
  onOpenResearch?: () => void;
  disabled?: boolean;
};

type ToolRowProps = {
  label: string;
  subtitle?: string;
  icon: { ios: string; android: string; web: string };
  iconColor: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/** Prefer widely available SF / Material glyphs on native. */
const TREE_VIZ_ICONS: Record<TreeVizMode, { ios: string; android: string; web: string }> = {
  tidy: { ios: 'list.bullet', android: 'account_tree', web: 'account_tree' },
  treemap: { ios: 'square.grid.3x3.fill', android: 'grid_view', web: 'grid_view' },
  cluster: { ios: 'point.3.connected.trianglepath.filled', android: 'hub', web: 'hub' },
  tangled: { ios: 'arrow.triangle.branch', android: 'timeline', web: 'timeline' },
  force: { ios: 'circle.grid.2x2.fill', android: 'bubble_chart', web: 'bubble_chart' },
};

const TREE_VIZ_COLORS: Record<TreeVizMode, string> = {
  tidy: '#0F766E',
  treemap: '#1D4ED8',
  cluster: '#B45309',
  tangled: '#0369A1',
  force: '#BE123C',
};

function ToolRow({ label, subtitle, icon, iconColor, active, disabled, onPress }: ToolRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: active ? iconColor : theme.composerBorder,
          backgroundColor: active ? `${iconColor}14` : 'transparent',
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View style={[styles.iconWell, { backgroundColor: `${iconColor}22` }]}>
        <SymbolView name={icon as never} size={18} tintColor={iconColor} weight="medium" />
      </View>
      <View style={styles.optionText}>
        <ThemedText style={[styles.optionLabel, active && { color: iconColor }]} numberOfLines={1}>
          {label}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {active ? (
        <ThemedText style={[styles.activeMark, { color: iconColor }]}>✓</ThemedText>
      ) : null}
    </Pressable>
  );
}

export function ToolsSheet({
  visible,
  onClose,
  documentsActive,
  onToggleDocuments,
  treeVizMode,
  onSelectTreeViz,
  presentationActive,
  onTogglePresentation,
  showTreeViz = true,
  onOpenResearch,
  disabled,
}: ToolsSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const sheetMaxHeight = Math.round(windowHeight * (isWeb ? 0.85 : 0.78));
  const scrollMaxHeight = Math.max(220, sheetMaxHeight - 140 - Math.max(insets.bottom, Spacing.three));

  function handleDocuments() {
    onToggleDocuments();
    onClose();
  }

  function handleResearch() {
    onClose();
    onOpenResearch?.();
  }

  function handleTreeViz(mode: TreeVizMode) {
    onSelectTreeViz(mode);
    onClose();
  }

  function handlePresentation() {
    onTogglePresentation();
    onClose();
  }

  const toolList = (
    <>
      <ToolRow
        label="Documents"
        subtitle="Ask over your uploaded files"
        icon={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
        iconColor="#5B7CFA"
        active={documentsActive}
        disabled={disabled}
        onPress={handleDocuments}
      />

      {onOpenResearch ? (
        <ToolRow
          label="Research"
          subtitle="Search the web, then ask AI"
          icon={{ ios: 'globe', android: 'public', web: 'public' }}
          iconColor="#0D9488"
          disabled={disabled}
          onPress={handleResearch}
        />
      ) : null}

      <ToolRow
        label="Slides"
        subtitle="Generate a professional slide deck"
        icon={{ ios: 'play.rectangle.fill', android: 'slideshow', web: 'slideshow' }}
        iconColor="#7C3AED"
        active={presentationActive}
        disabled={disabled}
        onPress={handlePresentation}
      />

      {showTreeViz ? (
        <>
          <ThemedText type="smallBold" style={styles.section}>
            Visualizations
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionHint}>
            Describe a topic, then send
          </ThemedText>

          {TREE_VIZ_MODES.map((mode) => (
            <ToolRow
              key={mode}
              label={TREE_VIZ_MODE_LABELS[mode]}
              subtitle={TREE_VIZ_MODE_SUBTITLES[mode]}
              icon={TREE_VIZ_ICONS[mode]}
              iconColor={TREE_VIZ_COLORS[mode]}
              active={treeVizMode === mode}
              disabled={disabled}
              onPress={() => handleTreeViz(mode)}
            />
          ))}
        </>
      ) : null}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent={!isWeb}
      {...(isWeb
        ? ({
            style: { zIndex: 10000 },
          } as object)
        : null)}>
      <View style={[styles.backdrop, isWeb && styles.backdropWeb]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss tools" />
        <View
          style={[
            styles.sheet,
            isWeb && styles.sheetWeb,
            {
              backgroundColor: theme.backgroundElement,
              ...(isWeb ? { maxHeight: sheetMaxHeight } : null),
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}
          onStartShouldSetResponder={() => true}>
          {!isWeb ? (
            <View style={[styles.handle, { backgroundColor: theme.composerBorder }]} />
          ) : null}

          <ThemedText type="smallBold" style={styles.title}>
            Tools
          </ThemedText>

          {isWeb ? (
            <ScrollView
              style={{ maxHeight: scrollMaxHeight }}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              bounces={false}>
              {toolList}
            </ScrollView>
          ) : (
            <View style={styles.listContent}>{toolList}</View>
          )}

          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  backdropWeb: {
    ...Platform.select({
      web: {
        position: 'fixed' as unknown as 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        justifyContent: 'center',
        paddingBottom: Spacing.three,
      },
    }),
  },
  sheet: {
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    width: '100%',
  },
  sheetWeb: {
    maxWidth: 480,
    alignSelf: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 16px 48px rgba(15, 23, 42, 0.18)',
      },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.one,
  },
  title: {
    marginBottom: Spacing.one,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  section: {
    marginTop: Spacing.one,
  },
  sectionHint: {
    marginTop: -Spacing.one,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.two,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeMark: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 0,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
