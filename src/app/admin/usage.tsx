import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AdminPage } from '@/components/admin/admin-page';
import { StatsCard } from '@/components/admin/stats-card';
import {
  AdminDoughnutChart,
  AdminHBarChart,
  ChartCard,
  CHART_COLORS,
  type DoughnutDataset,
} from '@/components/admin/charts';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { downloadCsv } from '@/lib/admin-csv';
import { estimateCostUsd, formatTokens, formatUsd } from '@/lib/admin-token-pricing';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────

type ModelRow = {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  calls: number;
};

type UserRow = {
  email: string;
  prompt_tokens: number;
  completion_tokens: number;
  calls: number;
};

type UsageSummary = {
  total_prompt_tokens: number;
  total_completion_tokens: number;
  by_model: ModelRow[];
  top_users: UserRow[];
};

const RANGES = [7, 14, 30, 90] as const;
type Range = (typeof RANGES)[number];

// ── Data loading ──────────────────────────────────────────────────────────

async function loadUsage(daysBack: Range): Promise<UsageSummary> {
  const { data, error } = await supabase.rpc('admin_usage_summary', {
    days_back: daysBack,
  });
  if (error) throw error;
  const raw = data as unknown as {
    total_prompt_tokens: number;
    total_completion_tokens: number;
    by_model: ModelRow[];
    top_users: UserRow[];
  };
  return {
    total_prompt_tokens: raw.total_prompt_tokens ?? 0,
    total_completion_tokens: raw.total_completion_tokens ?? 0,
    by_model: raw.by_model ?? [],
    top_users: raw.top_users ?? [],
  };
}

// ── Sub-components ────────────────────────────────────────────────────────

function RangeSelector({
  range,
  onChange,
}: {
  range: Range;
  onChange: (r: Range) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        rsStyles.wrap,
        { backgroundColor: theme.backgroundElement, borderColor: theme.composerBorder },
      ]}>
      {RANGES.map((r) => (
        <Pressable
          key={r}
          onPress={() => onChange(r)}
          style={[
            rsStyles.seg,
            r === range && {
              backgroundColor: theme.composerBackground,
              ...Platform.select({ web: { boxShadow: '0 1px 3px rgba(0,0,0,0.10)' } }),
            },
          ]}>
          <ThemedText
            style={[
              rsStyles.label,
              { color: r === range ? theme.text : theme.textSecondary },
              r === range && rsStyles.labelActive,
            ]}>
            {r}d
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const rsStyles = StyleSheet.create({
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

export default function AdminUsageScreen() {
  const theme = useTheme();
  const [range, setRange] = useState<Range>(30);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (r: Range) => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadUsage(r);
        setSummary(data);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load usage data');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(range);
  }, [load, range]);

  // Total cost across all models
  const totalCost =
    summary?.by_model.reduce(
      (acc, row) =>
        acc + estimateCostUsd(row.model, row.prompt_tokens, row.completion_tokens),
      0,
    ) ?? 0;

  // Doughnut: token share by model
  const modelDoughnut: DoughnutDataset[] = (summary?.by_model ?? []).map((row, i) => ({
    label: row.model.replace('deepseek-', ''),
    value: row.prompt_tokens + row.completion_tokens,
    color: CHART_COLORS[i % CHART_COLORS.length]!,
  }));

  // H-bar: top users by total tokens
  const hbarLabels = (summary?.top_users ?? []).map((u) => {
    const [local] = u.email.split('@');
    return local ?? u.email;
  });
  const hbarDatasets = [
    {
      label: 'Total tokens',
      data: (summary?.top_users ?? []).map(
        (u) => u.prompt_tokens + u.completion_tokens,
      ),
      color: theme.accent,
    },
  ];

  // Cost table rows
  const costRows = (summary?.by_model ?? []).map((row) => ({
    model: row.model,
    prompt_tokens: row.prompt_tokens,
    completion_tokens: row.completion_tokens,
    calls: row.calls,
    est_usd: estimateCostUsd(row.model, row.prompt_tokens, row.completion_tokens),
  }));

  async function handleExport() {
    if (!summary) return;
    await downloadCsv(
      `sheyon-usage-${range}d`,
      costRows.map((r) => ({ ...r, est_usd: r.est_usd.toFixed(4) })),
    );
  }

  const isWide = Platform.OS === 'web';

  return (
    <AdminPage
      title="Usage"
      subtitle={`Last ${range} days`}
      actions={
        <View style={headerStyles.row}>
          <RangeSelector range={range} onChange={setRange} />
          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [
              headerStyles.exportBtn,
              {
                borderColor: theme.headerBorder,
                backgroundColor: theme.composerBackground,
              },
              pressed && { opacity: 0.7 },
            ]}>
            <SymbolView
              name={{ ios: 'arrow.down.circle', android: 'download', web: 'download' }}
              size={14}
              tintColor={theme.textSecondary}
            />
            <ThemedText style={[headerStyles.exportText, { color: theme.textSecondary }]}>
              Export
            </ThemedText>
          </Pressable>
        </View>
      }>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { maxWidth: 1100, alignSelf: 'center', width: '100%' },
        ]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ThemedText themeColor="textSecondary">{error}</ThemedText>
          </View>
        ) : summary ? (
          <>
            {/* KPI cards */}
            <View style={[styles.kpiRow, isWide && styles.kpiRowWide]}>
              <StatsCard
                symbol={{ ios: 'text.bubble', android: 'chat', web: 'chat' }}
                label="Prompt tokens"
                value={formatTokens(summary.total_prompt_tokens)}
              />
              <StatsCard
                symbol={{
                  ios: 'bubble.left.fill',
                  android: 'mark_chat_read',
                  web: 'mark_chat_read',
                }}
                label="Completion tokens"
                value={formatTokens(summary.total_completion_tokens)}
              />
              <StatsCard
                symbol={{
                  ios: 'dollarsign.circle',
                  android: 'attach_money',
                  web: 'attach_money',
                }}
                label="Est. cost"
                value={formatUsd(totalCost)}
                sub="Approximate"
              />
              <StatsCard
                symbol={{ ios: 'bolt.fill', android: 'electric_bolt', web: 'electric_bolt' }}
                label="Total calls"
                value={summary.by_model.reduce((s, r) => s + r.calls, 0)}
              />
            </View>

            {/* Charts: Doughnut + HBar side by side on wide */}
            {(modelDoughnut.length > 0 || hbarLabels.length > 0) && (
              <View style={[styles.chartRow, isWide && styles.chartRowWide]}>
                {modelDoughnut.length > 0 && (
                  <View style={styles.chartCell}>
                    <ChartCard
                      title="Token share by model"
                      subtitle={`${summary.by_model.length} model${summary.by_model.length !== 1 ? 's' : ''}`}>
                      <AdminDoughnutChart
                        segments={modelDoughnut}
                        height={260}
                        showLegend
                        centerLabel={formatTokens(
                          summary.total_prompt_tokens + summary.total_completion_tokens,
                        )}
                      />
                    </ChartCard>
                  </View>
                )}

                {hbarLabels.length > 0 && (
                  <View style={styles.chartCell}>
                    <ChartCard
                      title="Top users by token usage"
                      subtitle="Prompt + completion tokens">
                      <AdminHBarChart
                        labels={hbarLabels}
                        datasets={hbarDatasets}
                        height={Math.max(200, hbarLabels.length * 34 + 40)}
                        yUnit="tokens"
                      />
                    </ChartCard>
                  </View>
                )}
              </View>
            )}

            {/* Cost breakdown table */}
            {costRows.length > 0 && (
              <ChartCard title="Cost breakdown by model">
                <View
                  style={[
                    tableStyles.table,
                    { borderColor: theme.headerBorder },
                  ]}>
                  {/* Header */}
                  <View
                    style={[
                      tableStyles.headerRow,
                      { borderBottomColor: theme.headerBorder, backgroundColor: theme.backgroundElement },
                    ]}>
                    <ThemedText style={[tableStyles.th, { flex: 2 }]} themeColor="textSecondary">
                      Model
                    </ThemedText>
                    <ThemedText style={tableStyles.th} themeColor="textSecondary">
                      Prompt
                    </ThemedText>
                    <ThemedText style={tableStyles.th} themeColor="textSecondary">
                      Completion
                    </ThemedText>
                    <ThemedText style={tableStyles.th} themeColor="textSecondary">
                      Calls
                    </ThemedText>
                    <ThemedText style={tableStyles.th} themeColor="textSecondary">
                      Est. Cost
                    </ThemedText>
                  </View>
                  {costRows.map((row) => (
                    <View
                      key={row.model}
                      style={[tableStyles.row, { borderBottomColor: theme.headerBorder }]}>
                      <ThemedText style={[tableStyles.td, tableStyles.modelCell, { flex: 2 }]}>
                        {row.model}
                      </ThemedText>
                      <ThemedText style={tableStyles.td}>
                        {formatTokens(row.prompt_tokens)}
                      </ThemedText>
                      <ThemedText style={tableStyles.td}>
                        {formatTokens(row.completion_tokens)}
                      </ThemedText>
                      <ThemedText style={tableStyles.td}>{row.calls}</ThemedText>
                      <ThemedText style={[tableStyles.td, { fontWeight: '600' }]}>
                        {formatUsd(row.est_usd)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ChartCard>
            )}

            {summary.by_model.length === 0 && (
              <View style={styles.center}>
                <ThemedText themeColor="textSecondary">
                  No usage data for this period.
                </ThemedText>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </AdminPage>
  );
}

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  exportText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 14,
  },
  kpiRow: {
    flexDirection: 'column',
    gap: 10,
  },
  kpiRowWide: {
    flexDirection: 'row',
  },
  chartRow: {
    flexDirection: 'column',
    gap: 12,
  },
  chartRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  chartCell: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    paddingVertical: 48,
    alignItems: 'center',
  },
});

const tableStyles = StyleSheet.create({
  table: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  th: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  td: {
    flex: 1,
    fontSize: 13,
  },
  modelCell: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
});
