import * as Clipboard from 'expo-clipboard';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type WebsitePreviewEditorProps = {
  value: string;
  onChange: (value: string) => void;
  dirty: boolean;
};

export function WebsitePreviewEditor({ value, onChange, dirty }: WebsitePreviewEditorProps) {
  const theme = useTheme();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      {dirty && (
        <View style={[styles.dirtyBanner, { backgroundColor: theme.accentMuted }]}>
          <ThemedText type="small" style={{ color: theme.accent, fontWeight: '600' }}>
            Unsaved changes — tap Apply to update preview
          </ThemedText>
        </View>
      )}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled>
        <TextInput
          multiline
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.codePanelBackground,
              borderColor: theme.codeBorder,
            },
          ]}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.two,
    paddingBottom: Spacing.four,
  },
  dirtyBanner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
  },
  input: {
    flex: 1,
    minHeight: 320,
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
  },
});

export async function copyHtmlToClipboard(html: string) {
  await Clipboard.setStringAsync(html);
}
