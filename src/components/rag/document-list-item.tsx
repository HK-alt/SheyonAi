import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, IconButton, List, Text } from 'react-native-paper';

import { useTheme } from '@/hooks/use-theme';
import type { DocumentRecord } from '@/types/rag';

type Props = {
  document: DocumentRecord;
  onDelete: (id: string) => Promise<void>;
  selected?: boolean;
  onToggleSelect?: () => void;
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DocumentListItem({ document, onDelete, selected = true, onToggleSelect }: Props) {
  const theme = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete document',
      `Remove "${document.filename}" and all its embeddings? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await onDelete(document.id);
            } catch {
              Alert.alert('Error', 'Failed to delete document. Please try again.');
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  const isUrl = document.source_type === 'url';
  const ext = isUrl ? 'URL' : (document.filename.split('.').pop()?.toUpperCase() ?? 'FILE');
  const subtitle = [formatDate(document.created_at), formatBytes(document.file_size)]
    .filter(Boolean)
    .join(' · ');

  return (
    <List.Item
      title={document.filename}
      description={subtitle}
      titleStyle={[styles.title, { color: selected ? theme.text : theme.textSecondary }]}
      descriptionStyle={[styles.description, { color: theme.textSecondary }]}
      style={[
        styles.item,
        { backgroundColor: theme.background, opacity: selected ? 1 : 0.55 },
      ]}
      onPress={onToggleSelect}
      left={() => (
        <View style={styles.leftRow}>
          {onToggleSelect && (
            <Pressable
              onPress={onToggleSelect}
              style={[
                styles.checkbox,
                {
                  borderColor: selected ? theme.accent : theme.composerBorder,
                  backgroundColor: selected ? theme.accent : 'transparent',
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
            >
              {selected && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          )}
          <View style={[styles.badge, { backgroundColor: theme.accentMuted }]}>
            <Text style={[styles.badgeText, { color: theme.accent }]}>{ext}</Text>
          </View>
        </View>
      )}
      right={() =>
        isDeleting ? (
          <ActivityIndicator size="small" color={theme.accent} style={styles.deleteBtn} />
        ) : (
          <IconButton
            icon="trash-can-outline"
            iconColor={theme.destructive}
            size={20}
            onPress={handleDelete}
            style={styles.deleteBtn}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 4,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deleteBtn: {
    alignSelf: 'center',
    margin: 0,
  },
});
