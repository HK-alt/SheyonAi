import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { format } from 'date-fns';

import { AdminPage } from '@/components/admin/admin-page';
import { StatsCard } from '@/components/admin/stats-card';
import {
  AdminBarChart,
  AdminLineChart,
  ChartCard,
} from '@/components/admin/charts';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { downloadCsv } from '@/lib/admin-csv';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────

interface DayPoint {
  day: string;
  total: number;
}

interface AnalyticsData {
  messageCounts: DayPoint[];
  totalMessages: number;
  avgPerDay: number;
  peakDay: DayPoint | null;
  totalConversations: number;
  totalDocuments: number;
  totalChunks: number;
  ragMessageCount: number;
}

// ── Data loading ──────────────────────────────────────────────────────────

async function fetchAnalytics(days = 30): Promise<AnalyticsData> {
  const [msgCounts, convsRes, docsRes, chunksRes, ragRes] = await Promise.all([
    supabase.rpc('admin_message_counts', { days_back: days }),
    supabase.from('conversations').select('id', { count: 'exact', head: true }),
    supabase.from('documents').select('id', { count: 'exact', head: true }),
    supabase.from('chunks').select('id', { count: 'exact', head: true }),
    supabase.from('rag_messages').select('id', { count: 'exact', head: true }),
  ]);

  const points: DayPoint[] = (msgCounts.data ?? []).map((r: any) => ({
    day: r.day as string,
    total: Number(r.total),
  }));

  const totalMessages = points.reduce((s, p) => s + p.total, 0);
  const avgPerDay = points.length > 0 ? Math.round(totalMessages / points.length) : 0;
  const peakDay = points.reduce<DayPoint | null>(
    (best, p) => (!best || p.total > best.total ? p : best),
    null,
  );

  return {
    messageCounts: points,
    totalMessages,
    avgPerDay,
    peakDay,
    totalConversations: convsRes.count ?? 0,
    totalDocuments: docsRes.count ?? 0,
    totalChunks: chunksRes.count ?? 0,
    ragMessageCount: ragRes.count ?? 0,
  };
}

// ── Range segment control ─────────────────────────────────────────────────

function SegmentControl({
  options,
  selected,
  onSelect,
}: {
  options: number[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        segStyles.wrap,
        { backgroundColor: theme.backgroundElement, borderColor: theme.composerBorder },
      ]}>
      {options.map((v) => (
        <Pressable
          key={v}
          onPress={() => onSelect(v)}
          style={[
            segStyles.seg,
            selected === v && {
              backgroundColor: theme.composerBackground,
              ...Platform.select({ web: { boxShadow: '0 1px 3px rgba(0,0,0,0.10)' } }),
            },
          ]}>
          <ThemedText
            style={[
              segStyles.label,
              { color: selected === v ? theme.text : theme.textSecondary },
              selected === v && segStyles.labelActive,
            ]}>
            {v}d
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    gap: 2,
  },
  seg: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  label: { fontSize: 12, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
});

// ── Main screen ───────────────────────────────────────────────────────────

const RANGES = [7, 14, 30, 90];

export default function AdminAnalyticsScreen() {
  const theme = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState(30);

  const load = useCallback(async (days: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const d = await fetchAnalytics(days);
      setData(d);
    } catch (e) {
      console.error('Analytics error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  async function handleExport() {
    if (!data) return;
    const rows = data.messageCounts.map((d) => ({ date: d.day, messages: d.total }));
    await downloadCsv(`sheyon-analytics-${range}d`, rows);
  }

  // Chart data
  const barLabels = (data?.messageCounts ?? []).map((d) => {
    try {
      return format(new Date(d.day), 'MMM d');
    } catch {
      return d.day.slice(5);
    }
  });
  const barDatasets = [
    {
      label: 'Messages',
      data: (data?.messageCounts ?? []).map((p) => p.total),
      color: theme.accent,
    },
  ];

  // 7-day rolling average for the line overlay
  const rollingData = (data?.messageCounts ?? []).map((_, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1);
    return Math.round(window.reduce((s, p) => s + p.total, 0) / window.length);
  });
  const lineDatasets = [
    {
      label: '7-day avg',
      data: rollingData,
      color: '#D97706',
    },
  ];

  const rangeControl = (
    <SegmentControl options={RANGES} selected={range} onSelect={setRange} />
  );

  return (
    <AdminPage title="Analytics" subtitle="Usage and engagement" actions={rangeControl}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(range, true)} />
        }>
        {loading && !data ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <ThemedText style={styles.loadingText} themeColor="textSecondary">
              Loading analytics…
            </ThemedText>
          </View>
        ) : (
          <>
            {/* KPI row 1 */}
            <View style={[styles.kpiRow, Platform.OS === 'web' && styles.kpiRowWide]}>
              <StatsCard
                symbol={{ ios: 'text.bubble.fill', android: 'message', web: 'message' }}
                label={`Messages (${range}d)`}
                value={data?.totalMessages ?? 0}
                sub={`avg ${data?.avgPerDay ?? 0} / day`}
              />
              <StatsCard
                symbol={{ ios: 'bubble.left.fill', android: 'chat', web: 'chat' }}
                label="Conversations"
                value={data?.totalConversations ?? 0}
              />
              <StatsCard
                symbol={{ ios: 'doc.fill', android: 'description', web: 'description' }}
                label="Documents"
                value={data?.totalDocuments ?? 0}
                sub={`${data?.totalChunks ?? 0} chunks`}
              />
              <StatsCard
                symbol={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                label="RAG Messages"
                value={data?.ragMessageCount ?? 0}
              />
            </View>

            {/* Peak day */}
            {data?.peakDay ? (
              <View
                style={[
                  styles.peakRow,
                  {
                    borderColor: theme.headerBorder,
                    backgroundColor: theme.composerBackground,
                  },
                ]}>
                <ThemedText style={styles.peakLabel} themeColor="textSecondary">
                  Peak day
                </ThemedText>
                <ThemedText style={styles.peakValue}>
                  {data.peakDay.day} — {data.peakDay.total.toLocaleString()} messages
                </ThemedText>
              </View>
            ) : null}

            {/* Bar chart: daily messages */}
            <ChartCard
              title={`Daily messages — last ${range} days`}
              subtitle={`${data?.totalMessages.toLocaleString() ?? 0} total`}
              actions={
                <Pressable
                  onPress={handleExport}
                  style={({ pressed }) => [
                    styles.exportBtn,
                    {
                      borderColor: theme.headerBorder,
                      backgroundColor: theme.composerBackground,
                    },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <ThemedText style={[styles.exportText, { color: theme.textSecondary }]}>
                    Export CSV
                  </ThemedText>
                </Pressable>
              }>
              <AdminBarChart
                labels={barLabels}
                datasets={barDatasets}
                height={260}
              />
            </ChartCard>

            {/* Line chart: 7-day rolling average */}
            {range >= 14 && (
              <ChartCard
                title="7-day rolling average"
                subtitle="Smoothed message trend">
                <AdminLineChart
                  labels={barLabels}
                  datasets={lineDatasets}
                  height={200}
                />
              </ChartCard>
            )}
          </>
        )}
      </ScrollView>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 12,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 48,
  },
  kpiRow: {
    flexDirection: 'column',
    gap: 8,
  },
  kpiRowWide: {
    flexDirection: 'row',
  },
  peakRow: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  peakLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  peakValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  exportBtn: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  exportText: {
    fontSize: 12,
    fontWeight: '500',
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
});
