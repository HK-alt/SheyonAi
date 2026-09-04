import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AdminPage } from '@/components/admin/admin-page';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { LEARNING_LEVELS, type LearningLevel } from '@/lib/learning-level';
import { supabase } from '@/lib/supabase';

// ---- Types ---------------------------------------------------------------

type AppConfig = {
  maintenance_mode: boolean;
  default_learning_level: LearningLevel;
  feature_flags: {
    rag_enabled: boolean;
    vision_enabled: boolean;
  };
};

const DEFAULT_CONFIG: AppConfig = {
  maintenance_mode: false,
  default_learning_level: 'general',
  feature_flags: { rag_enabled: true, vision_enabled: true },
};

// ---- Data layer ----------------------------------------------------------

async function loadConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.rpc('admin_get_config');
  if (error) throw error;
  const raw = data as Record<string, unknown>;
  return {
    maintenance_mode: Boolean(raw['maintenance_mode'] ?? false),
    default_learning_level: (raw['default_learning_level'] as LearningLevel) ?? 'general',
    feature_flags: {
      rag_enabled: Boolean((raw['feature_flags'] as any)?.rag_enabled ?? true),
      vision_enabled: Boolean((raw['feature_flags'] as any)?.vision_enabled ?? true),
    },
  };
}

async function saveConfigKey(key: string, value: unknown) {
  const { error } = await supabase.rpc('admin_set_config', {
    p_key: key,
    p_value: value as any,
  });
  if (error) throw error;
}

// ---- Sub-components -------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <ThemedText style={sectionStyles.header} themeColor="textSecondary">
      {title.toUpperCase()}
    </ThemedText>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
  },
});

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        rowStyles.row,
        { borderColor: theme.headerBorder, backgroundColor: theme.composerBackground },
      ]}>
      <View style={rowStyles.text}>
        <ThemedText style={rowStyles.label}>{label}</ThemedText>
        {description ? (
          <ThemedText style={rowStyles.desc} themeColor="textSecondary">
            {description}
          </ThemedText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontWeight: '600' },
  desc: { fontSize: 12, lineHeight: 17 },
});

// ---- Main screen ---------------------------------------------------------

export default function AdminSettingsScreen() {
  const theme = useTheme();
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await loadConfig();
      setConfig(cfg);
    } catch (e: any) {
      console.error('Settings load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setSetting(key: string, value: unknown, localUpdater: () => void) {
    setSaving(key);
    try {
      await saveConfigKey(key, value);
      localUpdater();
    } catch (e: any) {
      if (Platform.OS === 'web') {
        alert('Save failed: ' + e.message);
      } else {
        Alert.alert('Error', 'Save failed: ' + e.message);
      }
    } finally {
      setSaving(null);
    }
  }

  async function toggleMaintenance(val: boolean) {
    await setSetting('maintenance_mode', val, () =>
      setConfig((c) => ({ ...c, maintenance_mode: val })),
    );
  }

  async function toggleFeatureFlag(flag: 'rag_enabled' | 'vision_enabled', val: boolean) {
    const newFlags = { ...config.feature_flags, [flag]: val };
    await setSetting('feature_flags', newFlags, () =>
      setConfig((c) => ({ ...c, feature_flags: newFlags })),
    );
  }

  async function setLearningLevel(level: LearningLevel) {
    await setSetting('default_learning_level', level, () =>
      setConfig((c) => ({ ...c, default_learning_level: level })),
    );
  }

  return (
    <AdminPage title="Settings" subtitle="System-wide configuration">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { maxWidth: 680, alignSelf: 'center', width: '100%' },
        ]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary" style={{ marginTop: 8 }}>
              Loading settings…
            </ThemedText>
          </View>
        ) : (
          <>
            {/* Maintenance mode */}
            <SectionHeader title="Platform" />
            <SettingRow
              label="Maintenance mode"
              description="When on, the app shows a maintenance banner. Admins can still sign in.">
              {saving === 'maintenance_mode' ? (
                <ActivityIndicator />
              ) : (
                <Switch
                  value={config.maintenance_mode}
                  onValueChange={toggleMaintenance}
                  trackColor={{ true: theme.accent }}
                />
              )}
            </SettingRow>

            {/* Feature flags */}
            <SectionHeader title="Feature Flags" />
            <SettingRow
              label="RAG (document Q&A)"
              description="Enable users to upload and query documents.">
              {saving === 'feature_flags' ? (
                <ActivityIndicator />
              ) : (
                <Switch
                  value={config.feature_flags.rag_enabled}
                  onValueChange={(v) => toggleFeatureFlag('rag_enabled', v)}
                  trackColor={{ true: theme.accent }}
                />
              )}
            </SettingRow>
            <SettingRow
              label="Vision (image understanding)"
              description="Allow image attachments in chat conversations.">
              {saving === 'feature_flags' ? (
                <ActivityIndicator />
              ) : (
                <Switch
                  value={config.feature_flags.vision_enabled}
                  onValueChange={(v) => toggleFeatureFlag('vision_enabled', v)}
                  trackColor={{ true: theme.accent }}
                />
              )}
            </SettingRow>

            {/* Default learning level */}
            <SectionHeader title="Default Learning Level" />
            <ThemedText style={styles.levelHint} themeColor="textSecondary">
              Applied for users who have not selected their own level.
            </ThemedText>
            {LEARNING_LEVELS.map((level) => (
              <Pressable
                key={level.id}
                onPress={() => setLearningLevel(level.id)}
                style={({ pressed }) => [
                  levelStyles.row,
                  {
                    borderColor:
                      config.default_learning_level === level.id
                        ? theme.accent
                        : theme.headerBorder,
                    backgroundColor:
                      config.default_learning_level === level.id
                        ? theme.accentMuted ?? theme.backgroundElement
                        : theme.composerBackground,
                  },
                  pressed && { opacity: 0.7 },
                ]}>
                <View style={levelStyles.content}>
                  <ThemedText style={levelStyles.label}>{level.label}</ThemedText>
                  <ThemedText style={levelStyles.caption} themeColor="textSecondary">
                    {level.caption}
                  </ThemedText>
                </View>
                {config.default_learning_level === level.id && (
                  saving === 'default_learning_level' ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <SymbolView
                      name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                      size={18}
                      tintColor={theme.accent}
                    />
                  )
                )}
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 48,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  levelHint: {
    fontSize: 12,
    marginBottom: 8,
  },
});

const levelStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 8,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  content: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12 },
});
