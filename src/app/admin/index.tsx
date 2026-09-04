import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { format } from 'date-fns';

import { AdminPage } from '@/components/admin/admin-page';
import { StatsCard } from '@/components/admin/stats-card';
import {
  AdminDoughnutChart,
  AdminLineChart,
  ChartCard,
  ROLE_COLORS,
  type DoughnutDataset,
} from '@/components/admin/charts';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────

interface DashStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalDocuments: number;
  adminCount: number;
  teacherCount: number;
  studentCount: number;
  messagesToday: number;
  recentDays: { day: string; total: number }[];
}

type ActivityEvent = {
  event_type: string;
  label: string;
  detail: string;
  occurred_at: string;
};

// ── Data fetching ─────────────────────────────────────────────────────────

async function fetchStats(): Promise<DashStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [rolesRes, convsRes, msgsRes, docsRes, todayMsgsRes, recentRes] =
    await Promise.all([
      supabase.from('user_roles').select('role'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString()),
      supabase.rpc('admin_message_counts', { days_back: 14 }),
    ]);

  const roles = rolesRes.data ?? [];
  const adminCount = roles.filter((r) => r.role === 'admin').length;
  const teacherCount = roles.filter((r) => r.role === 'teacher').length;
  const studentCount = roles.filter((r) => r.role === 'student').length;

  return {
    totalUsers: roles.length,
    totalConversations: convsRes.count ?? 0,
    totalMessages: msgsRes.count ?? 0,
    totalDocuments: docsRes.count ?? 0,
    adminCount,
    teacherCount,
    studentCount,
    messagesToday: todayMsgsRes.count ?? 0,
    recentDays: (recentRes.data ?? []).map((r: any) => ({
      day: r.day as string,
      total: Number(r.total),
    })),
  };
}

// ── Activity feed ─────────────────────────────────────────────────────────

function activityIcon(eventType: string): object {
  if (eventType === 'message') return { ios: 'bubble.left.fill', android: 'chat', web: 'chat' };
  if (eventType === 'upload') return { ios: 'arrow.up.circle.fill', android: 'upload', web: 'upload' };
  return { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' };
}

function activityColor(eventType: string): string {
  if (eventType === 'message') return '#2563EB';
  if (eventType === 'upload') return '#D97706';
  return '#16A34A';
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const theme = useTheme();
  if (events.length === 0) {
    return (
      <ThemedText style={styles.emptyText} themeColor="textSecondary">
        No recent activity
      </ThemedText>
    );
  }
  return (
    <View style={{ gap: 0 }}>
      {events.map((ev, i) => {
        const when = new Date(ev.occurred_at);
        const diff = Date.now() - when.getTime();
        const mins = Math.floor(diff / 60000);
        const timeAgo =
          mins < 60
            ? `${mins}m ago`
            : mins < 1440
            ? `${Math.floor(mins / 60)}h ago`
            : when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const color = activityColor(ev.event_type);
        return (
          <View
            key={i}
            style={[activityStyles.row, { borderBottomColor: theme.headerBorder }]}>
            <View
              style={[
                activityStyles.dot,
                { backgroundColor: color + '22', borderColor: color + '55' },
              ]}>
              <SymbolView
                name={activityIcon(ev.event_type) as any}
                size={11}
                tintColor={color}
              />
            </View>
            <View style={activityStyles.info}>
              <ThemedText style={activityStyles.label} numberOfLines={1}>
                {ev.label}
              </ThemedText>
              {ev.detail ? (
                <ThemedText
                  style={activityStyles.detail}
                  themeColor="textSecondary"
                  numberOfLines={1}>
                  {ev.detail}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText style={activityStyles.time} themeColor="textSecondary">
              {timeAgo}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const activityStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 1 },
  label: { fontSize: 12, fontWeight: '600' },
  detail: { fontSize: 11 },
  time: { fontSize: 11, flexShrink: 0 },
});

// ── Section label ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText style={styles.sectionLabel} themeColor="textSecondary">
      {children}
    </ThemedText>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const theme = useTheme();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [data, actRes] = await Promise.all([
        fetchStats(),
        supabase.rpc('admin_recent_activity', { p_limit: 20 }),
      ]);
      setStats(data);
      setActivity((actRes.data ?? []) as ActivityEvent[]);
    } catch (e) {
      console.error('Admin dashboard error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isWide = Platform.OS === 'web';

  // Line chart data (messages last 14 days)
  const lineLabels = (stats?.recentDays ?? []).map((d) => {
    try {
      return format(new Date(d.day), 'MMM d');
    } catch {
      return d.day.slice(5);
    }
  });
  const lineDatasets = [
    {
      label: 'Messages',
      data: (stats?.recentDays ?? []).map((d) => d.total),
      color: theme.accent,
    },
  ];

  // Doughnut segments (role mix)
  const roleDoughnut: DoughnutDataset[] = [
    { label: 'Students', value: stats?.studentCount ?? 0, color: ROLE_COLORS.student },
    { label: 'Teachers', value: stats?.teacherCount ?? 0, color: ROLE_COLORS.teacher },
    { label: 'Admins', value: stats?.adminCount ?? 0, color: ROLE_COLORS.admin },
  ];

  const totalUsersStr = stats ? String(stats.totalUsers) : '';

  return (
    <AdminPage title="Overview" subtitle="Platform health at a glance">
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }>
        {loading && !stats ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <ThemedText style={styles.loadingText} themeColor="textSecondary">
              Loading…
            </ThemedText>
          </View>
        ) : (
          <>
            {/* KPI cards */}
            <SectionLabel>USERS</SectionLabel>
            <View style={[styles.row, isWide && styles.rowWide]}>
              <StatsCard
                symbol={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
                label="Total Users"
                value={stats?.totalUsers ?? 0}
                sub={`${stats?.adminCount ?? 0} admin · ${stats?.teacherCount ?? 0} teacher · ${stats?.studentCount ?? 0} student`}
              />
              <StatsCard
                symbol={{ ios: 'bubble.left.fill', android: 'chat', web: 'chat' }}
                label="Conversations"
                value={stats?.totalConversations ?? 0}
              />
            </View>

            <SectionLabel>ACTIVITY</SectionLabel>
            <View style={[styles.row, isWide && styles.rowWide]}>
              <StatsCard
                symbol={{ ios: 'text.bubble.fill', android: 'message', web: 'message' }}
                label="Total Messages"
                value={stats?.totalMessages ?? 0}
                sub={`${stats?.messagesToday ?? 0} today`}
                positive={(stats?.messagesToday ?? 0) > 0}
              />
              <StatsCard
                symbol={{ ios: 'doc.fill', android: 'description', web: 'description' }}
                label="Documents"
                value={stats?.totalDocuments ?? 0}
              />
            </View>

            {/* Charts: Line + Doughnut side by side on wide */}
            <SectionLabel>CHARTS</SectionLabel>
            <View style={[styles.row, isWide && styles.rowWide]}>
              <View style={styles.chartCell}>
                <ChartCard title="Message activity" subtitle="Last 14 days">
                  <AdminLineChart
                    labels={lineLabels}
                    datasets={lineDatasets}
                    height={220}
                  />
                </ChartCard>
              </View>

              <View style={styles.chartCell}>
                <ChartCard
                  title="User role mix"
                  subtitle={`${stats?.totalUsers ?? 0} total`}>
                  <AdminDoughnutChart
                    segments={roleDoughnut}
                    height={220}
                    showLegend
                    centerLabel={totalUsersStr}
                  />
                </ChartCard>
              </View>
            </View>

            {/* Activity feed */}
            <SectionLabel>RECENT ACTIVITY</SectionLabel>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.composerBackground,
                  borderColor: theme.headerBorder,
                },
              ]}>
              <ActivityFeed events={activity} />
            </View>
          </>
        )}
      </ScrollView>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 10,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'column',
    gap: 10,
  },
  rowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chartCell: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' } }),
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 24,
    textAlign: 'center',
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
