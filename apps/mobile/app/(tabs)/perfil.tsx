import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth';
import { useSupabase } from '@/lib/supabase/provider';
import { ROLE_LABELS } from '@rl/utils';

interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
}

function MenuItem({ icon, label, value, onPress, danger, rightElement }: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon as any} size={18} color={danger ? '#EF4444' : '#1e3a5f'} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {rightElement}
        {onPress && !rightElement && (
          <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user, role, clearAuth } = useAuthStore();
  const { supabase } = useSupabase();
  const [offlineMode, setOfflineMode] = useState(false);
  const [bigFont, setBigFont] = useState(false);

  async function handleLogout() {
    Alert.alert(
      'Sair',
      'Deseja encerrar a sessão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            clearAuth();
            router.replace('/login');
          },
        },
      ]
    );
  }

  const initials = user?.full_name
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? '??';

  const roleLabel = role ? ROLE_LABELS[role] : 'Padrão';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.profileCard}>
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <Text style={styles.profileName}>{user?.full_name ?? 'Usuário'}</Text>
        <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
        </View>
      </View>

      {/* Settings */}
      <Section title="Preferências">
        <MenuItem
          icon="moon-outline"
          label="Modo offline por padrão"
          rightElement={
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ true: '#1e3a5f' }}
              thumbColor="#fff"
            />
          }
        />
        <MenuItem
          icon="text-outline"
          label="Fonte grande na apresentação"
          rightElement={
            <Switch
              value={bigFont}
              onValueChange={setBigFont}
              trackColor={{ true: '#1e3a5f' }}
              thumbColor="#fff"
            />
          }
        />
      </Section>

      <Section title="Conta">
        <MenuItem
          icon="person-outline"
          label="Editar perfil"
          onPress={() => Alert.alert('Em breve', 'Esta funcionalidade estará disponível em breve.')}
        />
        <MenuItem
          icon="lock-closed-outline"
          label="Alterar senha"
          onPress={() => Alert.alert('Em breve', 'Esta funcionalidade estará disponível em breve.')}
        />
      </Section>

      <Section title="Armazenamento offline">
        <MenuItem
          icon="download-outline"
          label="Repertórios salvos"
          value="Ver todos"
          onPress={() => router.push('/(tabs)/repertorios')}
        />
        <MenuItem
          icon="trash-outline"
          label="Limpar cache offline"
          danger
          onPress={() => Alert.alert(
            'Limpar cache',
            'Isso removerá todos os repertórios salvos offline. Continuar?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Limpar', style: 'destructive', onPress: () => {} },
            ]
          )}
        />
      </Section>

      <Section title="Sobre">
        <MenuItem icon="information-circle-outline" label="Versão" value="1.0.0" />
        <MenuItem
          icon="globe-outline"
          label="Política de privacidade"
          onPress={() => {}}
        />
      </Section>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 20,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  profileName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  roleBadgeText: { fontSize: 12, color: '#1e3a5f', fontWeight: '600' },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconDanger: { backgroundColor: '#FEF2F2' },
  menuLabel: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  menuLabelDanger: { color: '#EF4444' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { fontSize: 13, color: '#6B7280' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});
