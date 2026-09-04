import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { AppRole } from '@/types/database';

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  role: AppRole;
  is_disabled: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

const ROLES: AppRole[] = ['admin', 'teacher', 'student'];

type RoleFilter = 'all' | AppRole;
type StatusFilter = 'all' | 'active' | 'disabled';
type SortKey = 'name' | 'joined' | 'last_sign_in' | 'role';

const ROLE_PALETTE: Record<AppRole, { bg: string; border: string; text: string }> = {
  admin: { bg: 'rgba(185,28,28,0.08)', border: 'rgba(185,28,28,0.22)', text: '#991B1B' },
  teacher: { bg: 'rgba(146,64,14,0.08)', border: 'rgba(146,64,14,0.22)', text: '#92400E' },
  student: { bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.22)', text: '#166534' },
};

function RoleBadge({ role }: { role: AppRole }) {
  const p = ROLE_PALETTE[role];
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: p.bg, borderColor: p.border }]}>
      <ThemedText style={[badgeStyles.text, { color: p.text }]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </ThemedText>
    </View>
  );
}

function StatusBadge({ disabled }: { disabled: boolean }) {
  return (
    <View
      style={[
        badgeStyles.wrap,
        disabled
          ? { backgroundColor: 'rgba(185,28,28,0.08)', borderColor: 'rgba(185,28,28,0.22)' }
          : { backgroundColor: 'rgba(21,128,61,0.08)', borderColor: 'rgba(21,128,61,0.22)' },
      ]}>
      <View
        style={[
          badgeStyles.dot,
          { backgroundColor: disabled ? '#B91C1C' : '#16A34A' },
        ]}
      />
      <ThemedText
        style={[badgeStyles.text, { color: disabled ? '#991B1B' : '#166534' }]}>
        {disabled ? 'Disabled' : 'Active'}
      </ThemedText>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelative(iso?: string): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function avatarColor(seed: string): string {
  const colors = ['#1E3A5F', '#3B4F6B', '#4A5568', '#2C5282', '#2D3748', '#4A6741'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length]!;
}

// ---------------------------------------------------------------------------
// Summary strip
// ---------------------------------------------------------------------------

function SummaryStrip({ users }: { users: AdminUser[] }) {
  const theme = useTheme();
  const counts = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'admin').length;
    const teachers = users.filter((u) => u.role === 'teacher').length;
    const students = users.filter((u) => u.role === 'student').length;
    const disabled = users.filter((u) => u.is_disabled).length;
    const active = total - disabled;
    return { total, admins, teachers, students, disabled, active };
  }, [users]);

  const cards = [
    { label: 'Total', value: counts.total, accent: theme.accent },
    { label: 'Active', value: counts.active, accent: '#16A34A' },
    { label: 'Admins', value: counts.admins, accent: '#B91C1C' },
    { label: 'Teachers', value: counts.teachers, accent: '#D97706' },
    { label: 'Students', value: counts.students, accent: '#2563EB' },
    { label: 'Disabled', value: counts.disabled, accent: '#6B7280' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={summaryStyles.row}>
      {cards.map((c) => (
        <View
          key={c.label}
          style={[
            summaryStyles.card,
            {
              backgroundColor: theme.composerBackground,
              borderColor: theme.headerBorder,
            },
          ]}>
          <ThemedText style={[summaryStyles.value, { color: c.accent }]}>
            {c.value}
          </ThemedText>
          <ThemedText style={summaryStyles.label} themeColor="textSecondary">
            {c.label}
          </ThemedText>
        </View>
      ))}
    </ScrollView>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    gap: 8,
    paddingBottom: 4,
  },
  card: {
    minWidth: 88,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  active,
  onPress,
  count,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.chip,
        {
          backgroundColor: active ? theme.accent : theme.composerBackground,
          borderColor: active ? theme.accent : theme.headerBorder,
        },
        pressed && { opacity: 0.75 },
      ]}>
      <ThemedText
        style={[
          chipStyles.label,
          { color: active ? '#fff' : theme.textSecondary },
          active && { fontWeight: '700' },
        ]}>
        {label}
      </ThemedText>
      {count !== undefined && (
        <View
          style={[
            chipStyles.count,
            { backgroundColor: active ? 'rgba(255,255,255,0.22)' : theme.backgroundElement },
          ]}>
          <ThemedText
            style={[
              chipStyles.countText,
              { color: active ? '#fff' : theme.textSecondary },
            ]}>
            {count}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  count: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// User detail drawer
// ---------------------------------------------------------------------------

function UserDetailModal({
  user,
  onClose,
  onRoleChange,
  onToggleDisabled,
}: {
  user: AdminUser;
  onClose: () => void;
  onRoleChange: (userId: string, role: AppRole) => Promise<void>;
  onToggleDisabled: (userId: string, disabled: boolean) => Promise<void>;
}) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const initials = (user.full_name ?? user.email).slice(0, 2).toUpperCase();
  const color = avatarColor(user.email);

  async function changeRole(role: AppRole) {
    if (role === user.role) return;
    setBusy(true);
    try {
      await onRoleChange(user.id, role);
    } finally {
      setBusy(false);
    }
  }

  async function toggle() {
    setBusy(true);
    try {
      await onToggleDisabled(user.id, !user.is_disabled);
    } finally {
      setBusy(false);
    }
  }

  async function copyEmail() {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(user.email);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[detailStyles.root, { backgroundColor: theme.background }]}>
        <View style={[detailStyles.header, { borderBottomColor: theme.headerBorder }]}>
          <ThemedText style={detailStyles.headerTitle}>Member details</ThemedText>
          <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
              size={22}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={detailStyles.body}>
          <View style={detailStyles.profile}>
            <View style={[detailStyles.avatarLg, { backgroundColor: color }]}>
              <ThemedText style={detailStyles.avatarLgText}>{initials}</ThemedText>
            </View>
            <ThemedText style={detailStyles.name}>
              {user.full_name ?? user.email.split('@')[0]}
            </ThemedText>
            <Pressable onPress={copyEmail} style={detailStyles.emailRow}>
              <ThemedText style={detailStyles.email} themeColor="textSecondary">
                {user.email}
              </ThemedText>
              <SymbolView
                name={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
                size={12}
                tintColor={theme.textSecondary}
              />
            </Pressable>
            <View style={detailStyles.badgeRow}>
              <RoleBadge role={user.role} />
              <StatusBadge disabled={user.is_disabled} />
            </View>
          </View>

          <View
            style={[
              detailStyles.card,
              { backgroundColor: theme.composerBackground, borderColor: theme.headerBorder },
            ]}>
            <MetaRow label="User ID" value={user.id.slice(0, 8) + '…'} mono />
            <MetaRow label="Joined" value={formatDate(user.created_at)} />
            <MetaRow label="Last sign-in" value={formatRelative(user.last_sign_in_at)} />
            <MetaRow
              label="Last sign-in (exact)"
              value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '—'}
            />
          </View>

          <ThemedText style={detailStyles.section} themeColor="textSecondary">
            CHANGE ROLE
          </ThemedText>
          <View style={detailStyles.roleGrid}>
            {ROLES.map((r) => (
              <Pressable
                key={r}
                disabled={busy}
                onPress={() => changeRole(r)}
                style={({ pressed }) => [
                  detailStyles.roleBtn,
                  {
                    borderColor: user.role === r ? theme.accent : theme.headerBorder,
                    backgroundColor:
                      user.role === r
                        ? (theme as any).accentMuted ?? theme.backgroundElement
                        : theme.composerBackground,
                  },
                  pressed && { opacity: 0.7 },
                ]}>
                <RoleBadge role={r} />
                {user.role === r && (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={14}
                    tintColor={theme.accent}
                  />
                )}
              </Pressable>
            ))}
          </View>

          <ThemedText style={detailStyles.section} themeColor="textSecondary">
            ACCOUNT STATUS
          </ThemedText>
          <Pressable
            disabled={busy}
            onPress={toggle}
            style={({ pressed }) => [
              detailStyles.statusBtn,
              {
                backgroundColor: user.is_disabled
                  ? 'rgba(22,163,74,0.1)'
                  : 'rgba(185,28,28,0.08)',
                borderColor: user.is_disabled
                  ? 'rgba(22,163,74,0.35)'
                  : 'rgba(185,28,28,0.3)',
              },
              (pressed || busy) && { opacity: 0.7 },
            ]}>
            {busy ? (
              <ActivityIndicator />
            ) : (
              <>
                <SymbolView
                  name={
                    user.is_disabled
                      ? { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }
                      : { ios: 'nosign', android: 'block', web: 'block' }
                  }
                  size={16}
                  tintColor={user.is_disabled ? '#166534' : '#B91C1C'}
                />
                <ThemedText
                  style={[
                    detailStyles.statusBtnText,
                    { color: user.is_disabled ? '#166534' : '#B91C1C' },
                  ]}>
                  {user.is_disabled ? 'Enable account' : 'Disable account'}
                </ThemedText>
              </>
            )}
          </Pressable>
          <ThemedText style={detailStyles.hint} themeColor="textSecondary">
            {user.is_disabled
              ? 'Enabling restores sign-in access immediately.'
              : 'Disabled users are signed out and cannot use the app until re-enabled.'}
          </ThemedText>
        </ScrollView>
      </View>
    </Modal>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={detailStyles.metaRow}>
      <ThemedText style={detailStyles.metaLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText
        style={[detailStyles.metaValue, mono && { fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}
        numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 48, gap: 4 },
  profile: { alignItems: 'center', gap: 8, marginBottom: 20 },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarLgText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  email: { fontSize: 13 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  metaLabel: { fontSize: 12, fontWeight: '500' },
  metaValue: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  section: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  roleGrid: { gap: 8 },
  roleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 13,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  statusBtnText: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 },
});

// ---------------------------------------------------------------------------
// Table row
// ---------------------------------------------------------------------------

function UserRow({
  user,
  selected,
  onSelect,
  onOpen,
  onRoleChange,
  onToggleDisabled,
  isWide,
}: {
  user: AdminUser;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onRoleChange: (userId: string, role: AppRole) => Promise<void>;
  onToggleDisabled: (userId: string, disabled: boolean) => Promise<void>;
  isWide: boolean;
}) {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const initials = (user.full_name ?? user.email).slice(0, 2).toUpperCase();
  const color = avatarColor(user.email);

  async function handleRole(role: AppRole) {
    setMenuOpen(false);
    if (role === user.role) return;
    setBusy(true);
    try {
      await onRoleChange(user.id, role);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle() {
    setBusy(true);
    try {
      await onToggleDisabled(user.id, !user.is_disabled);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.headerBorder,
          backgroundColor: selected ? theme.backgroundElement : 'transparent',
        },
        user.is_disabled && { opacity: 0.65 },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      {/* Checkbox */}
      <Pressable
        onPress={(e) => {
          e?.stopPropagation?.();
          onSelect();
        }}
        hitSlop={6}
        style={[
          styles.checkbox,
          {
            borderColor: selected ? theme.accent : theme.headerBorder,
            backgroundColor: selected ? theme.accent : 'transparent',
          },
        ]}>
        {selected && (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={10}
            tintColor="#fff"
          />
        )}
      </Pressable>

      {/* Avatar + identity */}
      <View style={[styles.identity, isWide && { flex: 2.2 }]}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {user.full_name ?? user.email.split('@')[0]}
          </ThemedText>
          <ThemedText style={styles.emailText} themeColor="textSecondary" numberOfLines={1}>
            {user.email}
          </ThemedText>
        </View>
      </View>

      {/* Role */}
      {isWide && (
        <View style={[styles.col, { flex: 0.9 }]}>
          <RoleBadge role={user.role} />
        </View>
      )}

      {/* Status */}
      {isWide && (
        <View style={[styles.col, { flex: 0.85 }]}>
          <StatusBadge disabled={user.is_disabled} />
        </View>
      )}

      {/* Joined */}
      {isWide && (
        <View style={[styles.col, { flex: 0.9 }]}>
          <ThemedText style={styles.colText} themeColor="textSecondary">
            {formatDate(user.created_at)}
          </ThemedText>
        </View>
      )}

      {/* Last active */}
      {isWide && (
        <View style={[styles.col, { flex: 0.9 }]}>
          <ThemedText style={styles.colText} themeColor="textSecondary">
            {formatRelative(user.last_sign_in_at)}
          </ThemedText>
        </View>
      )}

      {/* Mobile badges */}
      {!isWide && (
        <View style={styles.mobileBadges}>
          <RoleBadge role={user.role} />
          <StatusBadge disabled={user.is_disabled} />
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions} onStartShouldSetResponder={() => true}>
        {busy ? (
          <ActivityIndicator size="small" />
        ) : (
          <>
            <Pressable
              onPress={() => setMenuOpen((v) => !v)}
              style={({ pressed }) => [
                styles.iconBtn,
                { borderColor: theme.headerBorder, backgroundColor: theme.composerBackground },
                pressed && { opacity: 0.7 },
              ]}>
              <SymbolView
                name={{ ios: 'person.badge.key', android: 'manage_accounts', web: 'manage_accounts' }}
                size={13}
                tintColor={theme.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={handleToggle}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  borderColor: user.is_disabled
                    ? 'rgba(22,163,74,0.35)'
                    : 'rgba(185,28,28,0.3)',
                  backgroundColor: user.is_disabled
                    ? 'rgba(22,163,74,0.08)'
                    : 'rgba(185,28,28,0.06)',
                },
                pressed && { opacity: 0.7 },
              ]}>
              <SymbolView
                name={
                  user.is_disabled
                    ? { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }
                    : { ios: 'nosign', android: 'block', web: 'block' }
                }
                size={13}
                tintColor={user.is_disabled ? '#166534' : '#B91C1C'}
              />
            </Pressable>
          </>
        )}

        {menuOpen && (
          <View
            style={[
              styles.menu,
              {
                backgroundColor: theme.composerBackground,
                borderColor: theme.composerBorder,
              },
            ]}>
            <ThemedText style={styles.menuLabel} themeColor="textSecondary">
              Set role
            </ThemedText>
            {ROLES.map((r) => (
              <Pressable
                key={r}
                onPress={() => handleRole(r)}
                style={({ pressed }) => [
                  styles.menuItem,
                  r === user.role && { backgroundColor: theme.backgroundElement },
                  pressed && { opacity: 0.7 },
                ]}>
                <RoleBadge role={r} />
                {r === user.role && (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={12}
                    tintColor={theme.textSecondary}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main table
// ---------------------------------------------------------------------------

interface UserTableProps {
  users: AdminUser[];
  loading: boolean;
  onRoleChange: (userId: string, role: AppRole) => Promise<void>;
  onToggleDisabled: (userId: string, disabled: boolean) => Promise<void>;
  onRefresh?: () => void;
  onExport?: () => void;
  onBulkDisable?: (userIds: string[], disabled: boolean) => Promise<void>;
  onBulkRole?: (userIds: string[], role: AppRole) => Promise<void>;
}

export function UserTable({
  users,
  loading,
  onRoleChange,
  onToggleDisabled,
  onRefresh,
  onExport,
  onBulkDisable,
  onBulkRole,
}: UserTableProps) {
  const theme = useTheme();
  const isWide = Platform.OS === 'web';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('joined');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const roleCounts = useMemo(
    () => ({
      all: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      teacher: users.filter((u) => u.role === 'teacher').length,
      student: users.filter((u) => u.role === 'student').length,
    }),
    [users],
  );

  const filtered = useMemo(() => {
    let list = users;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? '').toLowerCase().includes(q),
      );
    }
    if (roleFilter !== 'all') list = list.filter((u) => u.role === roleFilter);
    if (statusFilter === 'active') list = list.filter((u) => !u.is_disabled);
    if (statusFilter === 'disabled') list = list.filter((u) => u.is_disabled);

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        const an = (a.full_name ?? a.email).toLowerCase();
        const bn = (b.full_name ?? b.email).toLowerCase();
        cmp = an.localeCompare(bn);
      } else if (sortKey === 'joined') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortKey === 'last_sign_in') {
        const at = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
        const bt = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
        cmp = at - bt;
      } else if (sortKey === 'role') {
        cmp = a.role.localeCompare(b.role);
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [users, search, roleFilter, statusFilter, sortKey, sortAsc]);

  // Keep detail panel in sync with latest user data
  const detailLive = detailUser
    ? users.find((u) => u.id === detailUser.id) ?? detailUser
    : null;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((u) => u.id)));
    }
  }

  function cycleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'role');
    }
  }

  async function runBulkDisable(disabled: boolean) {
    if (!onBulkDisable || selected.size === 0) return;
    setBulkBusy(true);
    try {
      await onBulkDisable([...selected], disabled);
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  async function runBulkRole(role: AppRole) {
    if (!onBulkRole || selected.size === 0) return;
    setBulkBusy(true);
    try {
      await onBulkRole([...selected], role);
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  const SortHeader = ({ label, keyName, flex }: { label: string; keyName: SortKey; flex: number }) => (
    <Pressable
      onPress={() => cycleSort(keyName)}
      style={[styles.th, { flex }, Platform.select({ web: { cursor: 'pointer' } })]}>
      <ThemedText style={styles.thText} themeColor="textSecondary">
        {label}
      </ThemedText>
      {sortKey === keyName && (
        <SymbolView
          name={
            sortAsc
              ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
              : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
          }
          size={10}
          tintColor={theme.textSecondary}
        />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <SummaryStrip users={users} />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View
          style={[
            styles.searchBar,
            { borderColor: theme.composerBorder, backgroundColor: theme.composerBackground },
          ]}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={14}
            tintColor={theme.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search name or email…"
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <SymbolView
                name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                size={14}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          )}
        </View>

        {onExport && (
          <Pressable
            onPress={onExport}
            style={({ pressed }) => [
              styles.toolBtn,
              { borderColor: theme.headerBorder, backgroundColor: theme.composerBackground },
              pressed && { opacity: 0.7 },
            ]}>
            <SymbolView
              name={{ ios: 'arrow.down.circle', android: 'download', web: 'download' }}
              size={14}
              tintColor={theme.textSecondary}
            />
            {isWide && (
              <ThemedText style={[styles.toolBtnText, { color: theme.textSecondary }]}>
                Export
              </ThemedText>
            )}
          </Pressable>
        )}

        {onRefresh && (
          <Pressable
            onPress={onRefresh}
            style={({ pressed }) => [
              styles.toolBtn,
              { borderColor: theme.headerBorder, backgroundColor: theme.composerBackground },
              pressed && { opacity: 0.7 },
            ]}>
            <SymbolView
              name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
              size={14}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}>
        <FilterChip
          label="All"
          active={roleFilter === 'all'}
          count={roleCounts.all}
          onPress={() => setRoleFilter('all')}
        />
        <FilterChip
          label="Admins"
          active={roleFilter === 'admin'}
          count={roleCounts.admin}
          onPress={() => setRoleFilter('admin')}
        />
        <FilterChip
          label="Teachers"
          active={roleFilter === 'teacher'}
          count={roleCounts.teacher}
          onPress={() => setRoleFilter('teacher')}
        />
        <FilterChip
          label="Students"
          active={roleFilter === 'student'}
          count={roleCounts.student}
          onPress={() => setRoleFilter('student')}
        />
        <View style={[styles.filterDivider, { backgroundColor: theme.headerBorder }]} />
        <FilterChip
          label="Active"
          active={statusFilter === 'active'}
          onPress={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
        />
        <FilterChip
          label="Disabled"
          active={statusFilter === 'disabled'}
          onPress={() => setStatusFilter(statusFilter === 'disabled' ? 'all' : 'disabled')}
        />
      </ScrollView>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <View
          style={[
            styles.bulkBar,
            { backgroundColor: theme.accent, borderColor: theme.accent },
          ]}>
          <ThemedText style={styles.bulkText}>
            {selected.size} selected
          </ThemedText>
          <View style={styles.bulkActions}>
            {bulkBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                {onBulkRole &&
                  ROLES.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => runBulkRole(r)}
                      style={({ pressed }) => [
                        styles.bulkBtn,
                        pressed && { opacity: 0.7 },
                      ]}>
                      <ThemedText style={styles.bulkBtnText}>
                        → {r.charAt(0).toUpperCase() + r.slice(1)}
                      </ThemedText>
                    </Pressable>
                  ))}
                {onBulkDisable && (
                  <>
                    <Pressable
                      onPress={() => runBulkDisable(true)}
                      style={({ pressed }) => [styles.bulkBtn, pressed && { opacity: 0.7 }]}>
                      <ThemedText style={styles.bulkBtnText}>Disable</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => runBulkDisable(false)}
                      style={({ pressed }) => [styles.bulkBtn, pressed && { opacity: 0.7 }]}>
                      <ThemedText style={styles.bulkBtnText}>Enable</ThemedText>
                    </Pressable>
                  </>
                )}
                <Pressable
                  onPress={() => setSelected(new Set())}
                  style={({ pressed }) => [styles.bulkBtn, pressed && { opacity: 0.7 }]}>
                  <ThemedText style={styles.bulkBtnText}>Clear</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      {/* Column headers (web) */}
      {isWide && !loading && (
        <View style={[styles.headerRow, { borderBottomColor: theme.headerBorder }]}>
          <Pressable onPress={toggleSelectAll} style={styles.checkbox}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor:
                    selected.size === filtered.length && filtered.length > 0
                      ? theme.accent
                      : theme.headerBorder,
                  backgroundColor:
                    selected.size === filtered.length && filtered.length > 0
                      ? theme.accent
                      : 'transparent',
                },
              ]}>
              {selected.size === filtered.length && filtered.length > 0 && (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={10}
                  tintColor="#fff"
                />
              )}
            </View>
          </Pressable>
          <SortHeader label="Member" keyName="name" flex={2.2} />
          <SortHeader label="Role" keyName="role" flex={0.9} />
          <View style={[styles.th, { flex: 0.85 }]}>
            <ThemedText style={styles.thText} themeColor="textSecondary">
              Status
            </ThemedText>
          </View>
          <SortHeader label="Joined" keyName="joined" flex={0.9} />
          <SortHeader label="Last active" keyName="last_sign_in" flex={0.9} />
          <View style={[styles.th, { width: 72, flex: 0 }]}>
            <ThemedText style={styles.thText} themeColor="textSecondary">
              Actions
            </ThemedText>
          </View>
        </View>
      )}

      {/* Result count */}
      {!loading && (
        <ThemedText style={styles.resultCount} themeColor="textSecondary">
          Showing {filtered.length} of {users.length} member{users.length !== 1 ? 's' : ''}
        </ThemedText>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <ThemedText style={styles.loadingText} themeColor="textSecondary">
            Loading users…
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              selected={selected.has(item.id)}
              onSelect={() => toggleSelect(item.id)}
              onOpen={() => setDetailUser(item)}
              onRoleChange={onRoleChange}
              onToggleDisabled={onToggleDisabled}
              isWide={isWide}
            />
          )}
          onRefresh={onRefresh}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.center}>
              <SymbolView
                name={{ ios: 'person.slash', android: 'person_off', web: 'person_off' }}
                size={28}
                tintColor={theme.textSecondary}
                style={{ opacity: 0.4 }}
              />
              <ThemedText themeColor="textSecondary" style={{ marginTop: 8 }}>
                No users match your filters
              </ThemedText>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        />
      )}

      {detailLive && (
        <UserDetailModal
          user={detailLive}
          onClose={() => setDetailUser(null)}
          onRoleChange={onRoleChange}
          onToggleDisabled={onToggleDisabled}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filters: {
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  filterDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 4,
  },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bulkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bulkActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  bulkBtn: {
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  bulkBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resultCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  identityText: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
  },
  emailText: {
    fontSize: 11,
  },
  col: {
    justifyContent: 'center',
  },
  colText: {
    fontSize: 12,
  },
  mobileBadges: {
    gap: 4,
    alignItems: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'relative',
    width: 72,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  menu: {
    position: 'absolute',
    top: 34,
    right: 0,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
    padding: 6,
    zIndex: 100,
    minWidth: 130,
    ...Platform.select({
      web: { boxShadow: '0 6px 20px rgba(0,0,0,0.12)' },
    }),
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 5,
    padding: 6,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
});
