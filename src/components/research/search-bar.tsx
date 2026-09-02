import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { RESEARCH_SOURCES, researchSourceMeta, tintColor } from '@/components/research/source-meta';
import { ThemedText } from '@/components/themed-text';
import { TypingPlaceholderOverlay } from '@/components/typing-placeholder-overlay';
import { useTheme } from '@/hooks/use-theme';
import type { ResearchSource } from '@/types/research';

const TYPING_PHRASES = [
  'how vaccines work',
  'black holes',
  'photosynthesis',
  'diabetes treatment',
  'CRISPR gene editing',
  'climate change',
];

type SearchBarProps = {
  query: string;
  onChangeQuery: (value: string) => void;
  source: ResearchSource;
  onChangeSource: (source: ResearchSource) => void;
  onSubmit: () => void;
  loading?: boolean;
};

export function ResearchSearchBar({
  query,
  onChangeQuery,
  source,
  onChangeSource,
  onSubmit,
  loading,
}: SearchBarProps) {
  const theme = useTheme();
  const isWeb = Platform.OS === 'web';
  const selected = researchSourceMeta(source);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const canSearch = query.trim().length > 0 && !loading;
  const lifted = focused || hovered;
  const showTyping = query.length === 0 && !focused;

  return (
    <View style={styles.wrap} accessibilityRole="search">
      <Pressable
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.field,
          isWeb && styles.fieldWeb,
          {
            backgroundColor: theme.composerBackground,
            borderColor: lifted ? tintColor(selected.color, 0.55) : theme.composerBorder,
          },
          lifted && isWeb && styles.fieldLifted,
        ]}>
        <View style={[styles.iconSlot, { backgroundColor: tintColor(selected.color, 0.12) }]}>
          {loading ? (
            <ActivityIndicator size="small" color={selected.color} />
          ) : (
            <SymbolView
              name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={18}
              tintColor={selected.color}
              weight="medium"
            />
          )}
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            onSubmitEditing={onSubmit}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={focused ? 'Type a topic or paper title' : ''}
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            blurOnSubmit
            autoCapitalize="none"
            autoCorrect
            editable={!loading}
            style={[styles.input, isWeb && styles.inputWeb, { color: theme.text }]}
          />
          <TypingPlaceholderOverlay
            visible={showTyping}
            prefix="Search"
            phrases={TYPING_PHRASES}
            color={selected.color}
            align="center"
          />
        </View>

        {query.length > 0 ? (
          <Pressable
            onPress={() => onChangeQuery('')}
            hitSlop={8}
            accessibilityLabel="Clear search"
            style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={14}
              tintColor={theme.textSecondary}
              weight="medium"
            />
          </Pressable>
        ) : null}

        <View style={[styles.divider, { backgroundColor: theme.composerBorder }]} />

        <Pressable
          onPress={onSubmit}
          disabled={!canSearch}
          accessibilityLabel="Search"
          style={({ pressed }) => [
            styles.iconSearch,
            { backgroundColor: canSearch ? selected.color : theme.backgroundElement },
            pressed && canSearch && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
            size={16}
            tintColor={canSearch ? '#FFFFFF' : theme.textSecondary}
            weight="semibold"
          />
        </Pressable>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={[styles.tabs, isWeb && styles.tabsCenter]}
        keyboardShouldPersistTaps="handled">
        {RESEARCH_SOURCES.map((item) => {
          const active = source === item.id;
          const label =
            item.id === 'all' ? 'All' : item.id === 'semanticscholar' ? 'Scholar' : item.label;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${item.label}. ${item.hint}`}
              onPress={() => onChangeSource(item.id)}
              style={({ pressed, hovered: tabHovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.tab,
                active && styles.tabActive,
                {
                  backgroundColor: active
                    ? tintColor(item.color, 0.16)
                    : tabHovered
                      ? tintColor(item.color, 0.1)
                      : tintColor(item.color, 0.05),
                  borderColor: active ? tintColor(item.color, 0.55) : tintColor(item.color, 0.22),
                },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.tabIcon, { backgroundColor: tintColor(item.color, 0.22) }]}>
                <SymbolView name={item.icon} size={12} tintColor={item.color} weight="semibold" />
              </View>
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: item.color, fontWeight: active ? '800' : '600' },
                ]}
                numberOfLines={1}>
                {label}
              </ThemedText>
              {active ? (
                <SymbolView
                  name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                  size={14}
                  tintColor={item.color}
                  weight="bold"
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <ThemedText style={[styles.hint, { color: selected.color }]} numberOfLines={2}>
        Selected: {selected.id === 'all' ? 'All libraries' : selected.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderRadius: 24,
    paddingLeft: 6,
    paddingRight: 6,
    minHeight: 50,
  },
  fieldWeb: {
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(32, 33, 36, 0.08)',
        transitionProperty: 'box-shadow, border-color',
        transitionDuration: '150ms',
      },
    }),
  },
  fieldLifted: {
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(32, 33, 36, 0.12)',
      },
    }),
  },
  iconSlot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    height: 44,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  inputWeb: {
    ...Platform.select({
      web: {
        outlineStyle: 'none' as unknown as undefined,
        fontSize: 16,
      },
    }),
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginHorizontal: 4,
  },
  iconSearch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  tabsScroll: {
    width: '100%',
    flexGrow: 0,
    alignSelf: 'stretch',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  tabsCenter: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 10,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  tabActive: {
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  tabIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  pressed: {
    opacity: 0.75,
  },
});
