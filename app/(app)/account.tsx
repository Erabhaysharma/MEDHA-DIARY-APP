import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert, TextInput,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth }  from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { supabase }  from '../../src/lib/supabase';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';
import { useLock } from '../../src/contexts/LockContext';

export default function AccountScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { colors, isDark, toggleTheme }             = useTheme();
  const { isLockEnabled, hasPin, setLockEnabled }   = useLock();
  const C = colors;

  const [editingName,   setEditingName]   = useState(false);
  const [editingAiName, setEditingAiName] = useState(false);
  const [newName,       setNewName]       = useState(profile?.display_name ?? '');
  const [newAiName,     setNewAiName]     = useState(profile?.ai_name ?? 'Medha');
  const [saving,        setSaving]        = useState(false);
  const [sendingReset,  setSendingReset]  = useState(false);

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

  const saveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await supabase.from('profiles').update({ display_name: newName.trim() }).eq('id', user!.id);
    await refreshProfile();
    setSaving(false);
    setEditingName(false);
  };

  const saveAiName = async () => {
    if (!newAiName.trim()) return;
    setSaving(true);
    await supabase.from('profiles').update({ ai_name: newAiName.trim() || 'Medha' }).eq('id', user!.id);
    await refreshProfile();
    setSaving(false);
    setEditingAiName(false);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => {
        await signOut();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all diary entries. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete permanently', style: 'destructive', onPress: async () => {
          await supabase.from('profiles').update({ display_name: 'Deleted User' }).eq('id', user!.id);
          await signOut();
          router.replace('/(auth)/login');
        }},
      ]
    );
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    Alert.alert('Reset password', `Send a reset link to ${user.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send link', onPress: async () => {
        setSendingReset(true);
        const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
          redirectTo: 'medhadiary://reset-password',
        });
        setSendingReset(false);
        if (error) Alert.alert('Error', error.message);
        else Alert.alert('Email sent', `Check ${user.email} for a reset link.`);
      }},
    ]);
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Profile hero ── */}
        <View style={[s.hero, { backgroundColor: C.surface }]}>
          <View style={[s.avatar, { backgroundColor: C.primaryFaint }]}>
            <Text style={[s.avatarText, { color: C.primary }]}>
              {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>

          {editingName ? (
            <View style={s.editNameRow}>
              <TextInput
                style={[s.editNameInput, { color: C.textPrimary, borderColor: C.primary }]}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                placeholder="Your name"
                placeholderTextColor={C.textMuted}
              />
              <TouchableOpacity onPress={saveName} disabled={saving} style={s.editNameBtn}>
                {saving
                  ? <ActivityIndicator size="small" color={C.primary} />
                  : <Ionicons name="checkmark" size={20} color={C.primary} />
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)} style={s.editNameBtn}>
                <Ionicons name="close" size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={s.nameRow}
              onPress={() => { setNewName(profile?.display_name ?? ''); setEditingName(true); }}
              activeOpacity={0.7}
            >
              <Text style={[s.heroName, { color: C.textPrimary }]}>
                {profile?.display_name ?? 'Your name'}
              </Text>
              <Ionicons name="pencil-outline" size={14} color={C.textMuted} style={{ marginLeft: 6, marginTop: 3 }} />
            </TouchableOpacity>
          )}

          <Text style={[s.heroEmail, { color: C.textMuted }]}>{user?.email}</Text>

          {/* Stats */}
          <View style={[s.statsRow, { borderTopColor: C.border }]}>
            <View style={s.stat}>
              <Text style={[s.statNum, { color: C.primary }]}>{profile?.total_entries ?? 0}</Text>
              <Text style={[s.statLabel, { color: C.textMuted }]}>entries</Text>
            </View>
            <View style={[s.statDiv, { backgroundColor: C.border }]} />
            <View style={s.stat}>
              <Text style={[s.statNum, { color: C.primary }]} numberOfLines={1}>
                {profile?.ai_name ?? 'Medha'}
              </Text>
              <Text style={[s.statLabel, { color: C.textMuted }]}>companion</Text>
            </View>
            <View style={[s.statDiv, { backgroundColor: C.border }]} />
            <View style={s.stat}>
              <Text style={[s.statNum, { color: C.primary }]}>
                {profile?.created_at ? new Date(profile.created_at).getFullYear() : '—'}
              </Text>
              <Text style={[s.statLabel, { color: C.textMuted }]}>joined</Text>
            </View>
          </View>
        </View>

        {/* ── SETTINGS ── */}
        <View style={{ marginTop: SPACING.lg }}>

          {/* Profile section */}
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>PROFILE</Text>
          <View style={[s.group, { backgroundColor: C.surface }]}>

            <SettingRow
              icon="hardware-chip-outline" iconColor={C.primary} iconBg={C.primaryFaint}
              label="Companion name" colors={C}
              right={
                editingAiName ? (
                  <View style={s.editInlineRow}>
                    <TextInput
                      style={[s.editInline, { color: C.textPrimary, borderColor: C.border }]}
                      value={newAiName}
                      onChangeText={setNewAiName}
                      autoFocus
                      placeholder="e.g. Medha, Sage"
                      placeholderTextColor={C.textMuted}
                    />
                    <TouchableOpacity onPress={saveAiName} disabled={saving}>
                      {saving
                        ? <ActivityIndicator size="small" color={C.primary} />
                        : <Ionicons name="checkmark" size={18} color={C.primary} />
                      }
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingAiName(false)}>
                      <Ionicons name="close" size={18} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => { setNewAiName(profile?.ai_name ?? 'Medha'); setEditingAiName(true); }}
                  >
                    <Text style={[s.rowRight, { color: C.textMuted }]}>{profile?.ai_name ?? 'Medha'}</Text>
                    <Ionicons name="chevron-forward" size={16} color={C.border} />
                  </TouchableOpacity>
                )
              }
            />

            <Divider colors={C} />

            <SettingRow
              icon="calendar-outline" iconColor={C.primary} iconBg={C.primaryFaint}
              label="Member since" colors={C}
              right={<Text style={[s.rowRight, { color: C.textMuted }]}>{joinedDate}</Text>}
            />
          </View>

          {/* Activity section */}
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>ACTIVITY</Text>
          <View style={[s.group, { backgroundColor: C.surface }]}>
            <SettingRow
              icon="pulse-outline" iconColor={C.primary} iconBg={C.primaryFaint}
              label="Activity & Insights" colors={C}
              onPress={() => router.push('/activity')}
              chevron
            />
          </View>

          {/* Appearance section */}
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>APPEARANCE</Text>
          <View style={[s.group, { backgroundColor: C.surface }]}>
            <SettingRow
              icon={isDark ? 'moon-outline' : 'sunny-outline'}
              iconColor={C.primary} iconBg={C.primaryFaint}
              label={isDark ? 'Dark mode' : 'Light mode'} colors={C}
              right={
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: C.border, true: C.primary + '80' }}
                  thumbColor={C.primary}
                />
              }
            />
          </View>

          {/* Privacy section */}
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>PRIVACY & SECURITY</Text>
          <View style={[s.group, { backgroundColor: C.surface }]}>

            <SettingRow
              icon="lock-closed-outline" iconColor={C.primary} iconBg={C.primaryFaint}
              label="App lock" colors={C}
              sublabel="Require PIN to open Medha"
              right={
                <Switch
                  value={isLockEnabled}
                  onValueChange={async (val) => {
                    if (val && !hasPin) router.push('/set-pin');
                    else await setLockEnabled(val);
                  }}
                  trackColor={{ false: C.border, true: C.primary + '80' }}
                  thumbColor={C.primary}
                />
              }
            />

            {isLockEnabled && (
              <>
                <Divider colors={C} />
                <SettingRow
                  icon="keypad-outline" iconColor={C.primary} iconBg={C.primaryFaint}
                  label="Change PIN" colors={C}
                  onPress={() => router.push('/set-pin')}
                  chevron
                />
              </>
            )}

            <Divider colors={C} />

            <SettingRow
              icon="mail-outline" iconColor={C.primary} iconBg={C.primaryFaint}
              label="Reset password" colors={C}
              sublabel="Send reset link to your email"
              onPress={handleForgotPassword}
              chevron
            />
          </View>

          {/* Support section */}
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>SUPPORT</Text>
          <View style={[s.group, { backgroundColor: C.surface }]}>

            <SettingRow
              icon="chatbubble-ellipses-outline" iconColor={C.primary} iconBg={C.primaryFaint}
              label="Send feedback" colors={C}
              onPress={() => router.push('/feedback')}
              chevron
            />

            <Divider colors={C} />

            <SettingRow
              icon="shield-outline" iconColor={C.primary} iconBg={C.primaryFaint}
              label="Privacy policy" colors={C}
              onPress={() => router.push('/privacy-policy')}
              chevron
            />

            <Divider colors={C} />

            <SettingRow
              icon="document-text-outline" iconColor={C.primary} iconBg={C.primaryFaint}
              label="Terms of service" colors={C}
              onPress={() => router.push('/terms')}
              chevron
            />
          </View>

          {/* Account danger zone */}
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>ACCOUNT</Text>
          <View style={[s.group, { backgroundColor: C.surface }]}>

            <SettingRow
              icon="log-out-outline" iconColor={colors.error} iconBg={colors.error + '15'}
              label="Log out" labelColor={colors.error} colors={C}
              onPress={handleLogout}
            />

            <Divider colors={C} />

            <SettingRow
              icon="trash-outline" iconColor={colors.error} iconBg={colors.error + '15'}
              label="Delete account" labelColor={colors.error} colors={C}
              sublabel="Permanently removes all your data"
              onPress={handleDeleteAccount}
            />
          </View>
        </View>

        <Text style={[s.version, { color: C.textMuted }]}>Medha v1.0.1 · Made with ♥ in India</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────
function Divider({ colors: C }: { colors: any }) {
  return (
    <View style={[s.divider, { backgroundColor: C.border }]} />
  );
}

function SettingRow({
  icon, iconColor, iconBg, label, labelColor,
  sublabel, right, chevron, onPress, colors: C,
}: {
  icon:        string;
  iconColor:   string;
  iconBg:      string;
  label:       string;
  labelColor?: string;
  sublabel?:   string;
  right?:      React.ReactNode;
  chevron?:    boolean;
  onPress?:    () => void;
  colors:      any;
}) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={s.settingRow}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={[s.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={17} color={iconColor} />
      </View>
      <View style={s.settingBody}>
        <Text style={[s.settingLabel, { color: labelColor ?? C.textPrimary }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[s.settingSublabel, { color: C.textMuted }]}>{sublabel}</Text>
        ) : null}
      </View>
      {right ?? null}
      {chevron && !right && (
        <Ionicons name="chevron-forward" size={16} color={C.border} />
      )}
    </Wrap>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },

  // Hero
  hero: {
    alignItems:        'center',
    paddingVertical:   SPACING.xl,
    paddingHorizontal: SPACING.lg,
    marginBottom:      SPACING.sm,
  },
  avatar: {
    width:          80,
    height:         80,
    borderRadius:   40,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   SPACING.sm,
  },
  avatarText:   { fontSize: 32, fontWeight: FONT_WEIGHT.bold },
  nameRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  heroName:     { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  heroEmail:    { fontSize: FONT_SIZE.sm, marginBottom: SPACING.md },

  editNameRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 4, width: '80%',
  },
  editNameInput: {
    flex: 1, borderBottomWidth: 1,
    paddingVertical: 4, fontSize: FONT_SIZE.lg,
    textAlign: 'center',
  },
  editNameBtn: { padding: 4 },

  statsRow: {
    flexDirection:  'row',
    alignItems:     'center',
    width:          '100%',
    paddingTop:     SPACING.md,
    borderTopWidth: 0.5,
  },
  stat:      { flex: 1, alignItems: 'center', gap: 2 },
  statNum:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  statLabel: { fontSize: FONT_SIZE.xs },
  statDiv:   { width: 0.5, height: 28 },

  // Section labels
  sectionTitle: {
    fontSize:          FONT_SIZE.xs,
    fontWeight:        FONT_WEIGHT.semibold,
    letterSpacing:     0.8,
    paddingHorizontal: SPACING.md + 4,
    marginBottom:      6,
    marginTop:         SPACING.lg,
  },

  // Group container — flat, no individual card borders
  group: {
    marginHorizontal: SPACING.md,
    borderRadius:     BORDER_RADIUS.lg,
    overflow:         'hidden',
  },

  // Divider inside group
  divider: {
    height:           0.5,
    marginLeft:       SPACING.md + 36 + SPACING.sm,
  },

  // Setting row
  settingRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   13,
    paddingHorizontal: SPACING.md,
    gap:               SPACING.sm,
    minHeight:         52,
  },
  settingIcon: {
    width:          34,
    height:         34,
    borderRadius:   BORDER_RADIUS.sm,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  settingBody:     { flex: 1 },
  settingLabel:    { fontSize: FONT_SIZE.md },
  settingSublabel: { fontSize: FONT_SIZE.xs, marginTop: 2 },

  // Edit inline (companion name)
  editInlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editInline: {
    borderBottomWidth: 1, paddingVertical: 2,
    fontSize: FONT_SIZE.sm, minWidth: 80,
  },

  rowRight: { fontSize: FONT_SIZE.sm },

  version: {
    textAlign:  'center',
    fontSize:   FONT_SIZE.xs,
    marginTop:  SPACING.xl,
  },
});