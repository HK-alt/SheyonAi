import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MindMapActions } from '@/subject/mind-map-actions';
import { MindMapViewer } from '@/subject/mind-map-viewer';
import type { MindElixirData } from '@/subject/mind-map-types';

type MindMapExpandedPanelProps = {
  data: MindElixirData;
  onNodeSelect?: (topic: string) => void;
};

/** Inline expanded mind map between chat header and composer. */
export function MindMapExpandedPanel({ data, onNodeSelect }: MindMapExpandedPanelProps) {
  const theme = useTheme();

  return (
    <View style={[styles.panel, { backgroundColor: theme.background }]}>
      <View style={[styles.subHeader, { borderBottomColor: theme.headerBorder }]}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {data.nodeData.topic}
        </ThemedText>
      </View>
      <View style={styles.viewerWrap}>
        <MindMapViewer
          data={data}
          variant="fullscreen"
          showToolbar
          onNodeSelect={onNodeSelect}
        />
      </View>
      <View style={[styles.actions, { borderTopColor: theme.headerBorder }]}>
        <MindMapActions data={data} />
      </View>
    </View>
  );
}

/** @deprecated Use MindMapExpandedPanel — kept as alias for existing imports. */
export const MindMapModal = MindMapExpandedPanel;

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
  },
  subHeader: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  viewerWrap: {
    flex: 1,
    minHeight: 0,
  },
  actions: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
