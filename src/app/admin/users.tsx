import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AdminPage } from '@/components/admin/admin-page';
import { UserTable, type AdminUser } from '@/components/admin/user-table';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { downloadCsv } from '@/lib/admin-csv';
import { supabase } from '@/lib/supabase';
import type { AppRole } from '@/types/database';

async function loadUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  if (!data) return [];

  return data.map((r) => ({
    id: r.user_id,
    email: r.email ?? `user-${r.user_id.slice(0, 8)}@sheyonai.app`,
    full_name: r.full_name ?? undefined,
    role: r.role as AppRole,
    is_disabled: r.is_disabled ?? false,
    created_at: r.created_at,
    last_sign_in_at: r.last_sign_in_at ?? undefined,
  }));
}

async function changeRole(userId: string, role: AppRole) {
  const { error } = await supabase.rpc('update_user_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
}

async function setDisabled(userId: string, disabled: boolean) {
  const { error } = await supabase.rpc('admin_set_user_disabled', {
    p_user_id: userId,
    p_disabled: disabled,
  });
  if (error) throw error;
}

function notifyError(title: string, message: string) {
  if (Platform.OS === 'web') {
    alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function AdminUsersScreen() {
  const theme = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadUsers();
      setUsers(data);
    } catch (e: any) {
      console.error('Users load error:', e);
      notifyError('Failed to load users', e.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRoleChange(userId: string, role: AppRole) {
    try {
      await changeRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (e: any) {
      notifyError('Role change failed', e.message ?? 'Unknown error');
    }
  }

  async function handleToggleDisabled(userId: string, disabled: boolean) {
    try {
      await setDisabled(userId, disabled);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_disabled: disabled } : u)));
    } catch (e: any) {
      notifyError('Status update failed', e.message ?? 'Unknown error');
    }
  }

  async function handleBulkDisable(userIds: string[], disabled: boolean) {
    const results = await Promise.allSettled(
      userIds.map((id) => setDisabled(id, disabled)),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    const okIds = userIds.filter((_, i) => results[i]?.status === 'fulfilled');
    setUsers((prev) =>
      prev.map((u) => (okIds.includes(u.id) ? { ...u, is_disabled: disabled } : u)),
    );
    if (failed > 0) {
      notifyError('Bulk update', `${failed} of ${userIds.length} failed`);
    }
  }

  async function handleBulkRole(userIds: string[], role: AppRole) {
    const results = await Promise.allSettled(userIds.map((id) => changeRole(id, role)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    const okIds = userIds.filter((_, i) => results[i]?.status === 'fulfilled');
    setUsers((prev) =>
      prev.map((u) => (okIds.includes(u.id) ? { ...u, role } : u)),
    );
    if (failed > 0) {
      notifyError('Bulk role change', `${failed} of ${userIds.length} failed`);
    }
  }

  async function handleExport() {
    const rows = users.map((u) => ({
      email: u.email,
      full_name: u.full_name ?? '',
      role: u.role,
      status: u.is_disabled ? 'disabled' : 'active',
      joined: u.created_at,
      last_sign_in: u.last_sign_in_at ?? '',
    }));
    await downloadCsv('sheyon-users', rows);
  }

  const activeCount = users.filter((u) => !u.is_disabled).length;

  return (
    <AdminPage
      title="Users"
      subtitle={
        loading
          ? undefined
          : `${users.length} member${users.length !== 1 ? 's' : ''} · ${activeCount} active`
      }
      actions={
        <View style={headerStyles.actions}>
          <Pressable
            onPress={load}
            style={({ pressed }) => [
              headerStyles.btn,
              { borderColor: theme.headerBorder, backgroundColor: theme.composerBackground },
              pressed && { opacity: 0.7 },
            ]}>
            <SymbolView
              name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
              size={14}
              tintColor={theme.textSecondary}
            />
            <ThemedText style={[headerStyles.btnText, { color: theme.textSecondary }]}>
              Refresh
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [
              headerStyles.btn,
              { borderColor: theme.headerBorder, backgroundColor: theme.composerBackground },
              pressed && { opacity: 0.7 },
            ]}>
            <SymbolView
              name={{ ios: 'arrow.down.circle', android: 'download', web: 'download' }}
              size={14}
              tintColor={theme.textSecondary}
            />
            <ThemedText style={[headerStyles.btnText, { color: theme.textSecondary }]}>
              Export CSV
            </ThemedText>
          </Pressable>
        </View>
      }>
      <View style={styles.body}>
        <UserTable
          users={users}
          loading={loading}
          onRoleChange={handleRoleChange}
          onToggleDisabled={handleToggleDisabled}
          onBulkDisable={handleBulkDisable}
          onBulkRole={handleBulkRole}
          onRefresh={load}
          onExport={handleExport}
        />
      </View>
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
});

const headerStyles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    ...Platform.select({ web: { cursor: 'pointer' } }),
  },
  btnText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
