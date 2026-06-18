import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, TextInput, Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { supabase } from '../../src/lib/supabase';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';
import { useLock } from '../../src/contexts/LockContext';

export default function AccountScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { colors, isDark, toggleTheme }             = useTheme();

  const [editingName,   setEditingName]   = useState(false);
  const [editingAiName, setEditingAiName] = useState(false);
  const [newName,       setNewName]       = useState(profile?.display_name ?? '');
  const [newAiName,     setNewAiName]     = useState(profile?.ai_name ?? 'Medha');
  const [saving,        setSaving]        = useState(false);
  const { isLockEnabled, hasPin, setLockEnabled } = useLock();
  const [sendingReset, setSendingReset] = useState(false);

  // ── Dynamic styles using theme colors ──────────────────────────────────────
  const C = colors;

  const saveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await supabase.from('profiles')
      .update({ display_name: newName.trim() })
      .eq('id', user!.id);
    await refreshProfile();
    setSaving(false);
    setEditingName(false);
  };

  const saveAiName = async () => {
    if (!newAiName.trim()) return;
    setSaving(true);
    await supabase.from('profiles')
      .update({ ai_name: newAiName.trim() || 'Medha' })
      .eq('id', user!.id);
    await refreshProfile();
    setSaving(false);
    setEditingAiName(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:    'Log out',
          style:   'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all diary entries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text:    'Delete permanently',
          style:   'destructive',
          onPress: async () => {
            await supabase.from('profiles')
              .update({ display_name: 'Deleted User' })
              .eq('id', user!.id);
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleForgotPassword = async () => {
  if (!user?.email) return;
  Alert.alert(
    'Reset password',
    `Send a reset link to ${user.email}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send link',
        onPress: async () => {
          setSendingReset(true);
          const { error } = await supabase.auth.resetPasswordForEmail(
            user.email!,
            { redirectTo: 'medhadiary://reset-password' }
          );
          setSendingReset(false);
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            Alert.alert(
              '✅ Email sent',
              `Check ${user.email} for a password reset link.`
            );
          }
        },
      },
    ]
  );
};

  // ── Joined date ────────────────────────────────────────────────────────────
  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={[s.headerTitle, { color: C.textPrimary }]}>Account</Text>
        </View>

        {/* ── Profile card ── */}
        <View style={[s.profileCard, { backgroundColor: C.surface, borderColor: C.primary + '40' }]}>
          {/* Avatar circle */}
          <View style={[s.avatarCircle, { backgroundColor: C.primaryFaint, borderColor: C.primary }]}>
            <Text style={[s.avatarText, { color: C.primary }]}>
              {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>

          <Text style={[s.profileName, { color: C.textPrimary }]}>
            {profile?.display_name ?? 'Your name'}
          </Text>
          <Text style={[s.profileEmail, { color: C.textMuted }]}>
            {user?.email}
          </Text>

          {/* Stats row */}
          <View style={[s.statsRow, { borderTopColor: C.border }]}>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: C.primary }]}>
                {profile?.total_entries ?? 0}
              </Text>
              <Text style={[s.statLabel, { color: C.textMuted }]}>entries</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: C.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: C.primary }]}>
                {profile?.ai_name ?? 'Medha'}
              </Text>
              <Text style={[s.statLabel, { color: C.textMuted }]}>companion</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: C.border }]} />
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: C.primary }]} numberOfLines={1}>
                {joinedDate.split(' ')[2]}
              </Text>
              <Text style={[s.statLabel, { color: C.textMuted }]}>joined</Text>
            </View>
          </View>
        </View>

        {/* ── Settings sections ── */}

        {/* Profile settings */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>PROFILE</Text>

          {/* Display name */}
          <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
              <Ionicons name="person-outline" size={16} color={C.primary} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: C.textMuted }]}>Your name</Text>
              {editingName ? (
                <View style={s.editRow}>
                  <TextInput
                    style={[s.editInput, { color: C.textPrimary, borderColor: C.primary }]}
                    value={newName}
                    onChangeText={setNewName}
                    autoFocus
                    placeholder="Your name"
                    placeholderTextColor={C.textMuted}
                  />
                  <TouchableOpacity onPress={saveName} disabled={saving}>
                    {saving
                      ? <ActivityIndicator size="small" color={C.primary} />
                      : <Ionicons name="checkmark" size={20} color={C.primary} />
                    }
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingName(false)}>
                    <Ionicons name="close" size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[s.rowValue, { color: C.textPrimary }]}>
                  {profile?.display_name ?? '—'}
                </Text>
              )}
            </View>
            {!editingName && (
              <TouchableOpacity onPress={() => { setNewName(profile?.display_name ?? ''); setEditingName(true); }}>
                <Ionicons name="pencil-outline" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* AI companion name */}
          <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
              <Ionicons name="hardware-chip-outline" size={16} color={C.primary} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: C.textMuted }]}>Companion name</Text>
              {editingAiName ? (
                <View style={s.editRow}>
                  <TextInput
                    style={[s.editInput, { color: C.textPrimary, borderColor: C.primary }]}
                    value={newAiName}
                    onChangeText={setNewAiName}
                    autoFocus
                    placeholder="e.g. Medha, Sage, Dost"
                    placeholderTextColor={C.textMuted}
                  />
                  <TouchableOpacity onPress={saveAiName} disabled={saving}>
                    {saving
                      ? <ActivityIndicator size="small" color={C.primary} />
                      : <Ionicons name="checkmark" size={20} color={C.primary} />
                    }
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingAiName(false)}>
                    <Ionicons name="close" size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={[s.rowValue, { color: C.textPrimary }]}>
                  {profile?.ai_name ?? 'Medha'}
                </Text>
              )}
            </View>
            {!editingAiName && (
              <TouchableOpacity onPress={() => { setNewAiName(profile?.ai_name ?? 'Medha'); setEditingAiName(true); }}>
                <Ionicons name="pencil-outline" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Joined date */}
          <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
              <Ionicons name="calendar-outline" size={16} color={C.primary} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: C.textMuted }]}>Member since</Text>
              <Text style={[s.rowValue, { color: C.textPrimary }]}>{joinedDate}</Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>APPEARANCE</Text>

          <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={16}
                color={C.primary}
              />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: C.textMuted }]}>Theme</Text>
              <Text style={[s.rowValue, { color: C.textPrimary }]}>
                {isDark ? 'Dark mode' : 'Light mode'}
              </Text>
            </View>
            <Switch
              value={!isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#3D3D3A', true: C.primary + '80' }}
              thumbColor={C.primary}
            />
          </View>
        </View>




        {/* ── Privacy / Lock ── */}
<View style={s.section}>
  <Text style={[s.sectionTitle, { color: C.textMuted }]}>PRIVACY</Text>

  {/* App Lock toggle */}
  <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}>
    <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
      <Ionicons name="lock-closed-outline" size={16} color={C.primary} />
    </View>
    <View style={s.rowBody}>
      <Text style={[s.rowValue, { color: C.textPrimary }]}>App lock</Text>
      <Text style={[s.rowLabel, { color: C.textMuted }]}>
        Require PIN to open Medha
      </Text>
    </View>
    <Switch
      value={isLockEnabled}
      onValueChange={async (val) => {
        if (val && !hasPin) {
          router.push('/set-pin');
        } else {
          await setLockEnabled(val);
        }
      }}
      trackColor={{ false: '#3D3D3A', true: C.primary + '80' }}
      thumbColor={C.primary}
    />
  </View>

  {/* Change PIN — only shown when lock is enabled */}
  {isLockEnabled && (
    <TouchableOpacity
      style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={() => router.push('/set-pin')}
      activeOpacity={0.7}
    >
      <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
        <Ionicons name="keypad-outline" size={16} color={C.primary} />
      </View>
      <View style={s.rowBody}>
        <Text style={[s.rowValue, { color: C.textPrimary }]}>Change PIN</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
    </TouchableOpacity>
  )}

  {/* Forgot password */}
  <TouchableOpacity
    style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}
    onPress={handleForgotPassword}
    activeOpacity={0.7}
  >
    <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
      <Ionicons name="mail-outline" size={16} color={C.primary} />
    </View>
    <View style={s.rowBody}>
      <Text style={[s.rowValue, { color: C.textPrimary }]}>Reset password</Text>
      <Text style={[s.rowLabel, { color: C.textMuted }]}>
        Send reset link to your email
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
  </TouchableOpacity>
</View>

        {/* Support */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>SUPPORT</Text>

          <TouchableOpacity
            style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}
            activeOpacity={0.7}
          >
            <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
              <Ionicons name="shield-outline" size={16} color={C.primary} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowValue, { color: C.textPrimary }]}>Privacy policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}
            activeOpacity={0.7}
          >
            <View style={[s.rowIcon, { backgroundColor: C.primaryFaint }]}>
              <Ionicons name="document-text-outline" size={16} color={C.primary} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowValue, { color: C.textPrimary }]}>Terms of service</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>ACCOUNT</Text>

          <TouchableOpacity
            style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[s.rowIcon, { backgroundColor: C.error + '20' }]}>
              <Ionicons name="log-out-outline" size={16} color={C.error} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowValue, { color: C.error }]}>Log out</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, { backgroundColor: C.surface, borderColor: C.error + '30' }]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <View style={[s.rowIcon, { backgroundColor: C.error + '20' }]}>
              <Ionicons name="trash-outline" size={16} color={C.error} />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowValue, { color: C.error }]}>Delete account</Text>
              <Text style={[s.rowLabel, { color: C.textMuted }]}>
                Permanently removes all your data
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App version */}
        <Text style={[s.version, { color: C.textMuted }]}>
          Medha v1.0.0 · Made with ♥
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.sm,
    paddingBottom:     SPACING.md,
  },
  headerTitle: {
    fontSize:   FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Profile card
  profileCard: {
    marginHorizontal: SPACING.md,
    borderRadius:     BORDER_RADIUS.lg,
    padding:          SPACING.lg,
    alignItems:       'center',
    borderWidth:      1.5,
    marginBottom:     SPACING.lg,
  },
  avatarCircle: {
    width:           80,
    height:          80,
    borderRadius:    BORDER_RADIUS.full,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    marginBottom:    SPACING.sm,
  },
  avatarText: {
    fontSize:   36,
    fontWeight: FONT_WEIGHT.bold,
  },
  profileName: {
    fontSize:   FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize:     FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems:    'center',
    width:         '100%',
    paddingTop:    SPACING.md,
    borderTopWidth: 1,
  },
  statItem: {
    flex:       1,
    alignItems: 'center',
    gap:        2,
  },
  statNum: {
    fontSize:   FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
  },
  statDivider: {
    width:  1,
    height: 28,
  },

  // Settings rows
  section: {
    marginHorizontal: SPACING.md,
    marginBottom:     SPACING.lg,
    gap:              6,
  },
  sectionTitle: {
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    letterSpacing: 0.8,
    marginBottom:  2,
  },
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.sm,
    padding:           SPACING.md,
    borderRadius:      BORDER_RADIUS.md,
    borderWidth:       1,
  },
  rowIcon: {
    width:           32,
    height:          32,
    borderRadius:    BORDER_RADIUS.sm,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  rowBody:  { flex: 1 },
  rowLabel: { fontSize: FONT_SIZE.xs, marginBottom: 1 },
  rowValue: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },

  // Edit input
  editRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
  },
  editInput: {
    flex:          1,
    borderBottomWidth: 1,
    paddingVertical:   4,
    fontSize:      FONT_SIZE.md,
  },

  version: {
    textAlign: 'center',
    fontSize:  FONT_SIZE.xs,
    marginTop: SPACING.sm,
  },
});