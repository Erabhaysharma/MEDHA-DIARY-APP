import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';

export default function SignupScreen() {
  const { signUp } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  const handleSignup = async () => {
    // validation
    if (!displayName.trim()) return setError('Please enter your name.');
    if (!email.trim())       return setError('Please enter your email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setError(null);
    setLoading(true);

    const { error } = await signUp(email.trim().toLowerCase(), password, displayName.trim());

    setLoading(false);
    if (error) setError(error);
    // on success AuthGate auto-redirects to /(app)/home
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Brand ── */}
          <View style={s.brandWrap}>
            <Text style={s.brandIcon}>𝑀</Text>
            <Text style={s.brandName}>Medha</Text>
            <Text style={s.brandSub}>Begin your story</Text>
          </View>

          {/* ── Form ── */}
          <View style={s.form}>
            <Text style={s.formTitle}>Create account</Text>
            <Text style={s.formSub}>Your diary stays private — always</Text>

            {/* Name */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Your name</Text>
              <TextInput
                style={s.input}
                placeholder="What should Medha call you?"
                placeholderTextColor={COLORS.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Confirm password */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm password</Text>
              <TextInput
                style={s.input}
                placeholder="Repeat your password"
                placeholderTextColor={COLORS.textMuted}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
              />
            </View>

            {/* Error */}
            {error && (
              <View style={s.errorWrap}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={COLORS.background} />
                : <Text style={s.btnText}>Create account</Text>
              }
            </TouchableOpacity>

            {/* Switch to login */}
            <View style={s.switchRow}>
              <Text style={s.switchText}>Already have an account? </Text>
              <Link href="/(auth)/Login" asChild>
                <TouchableOpacity>
                  <Text style={s.switchLink}>Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: COLORS.background },
  kav:   { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },

  // Brand
  brandWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  brandIcon: {
    fontSize:   64,
    color:      COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 72,
  },
  brandName: {
    fontSize:      FONT_SIZE.xxl,
    fontWeight:    FONT_WEIGHT.bold,
    color:         COLORS.textPrimary,
    letterSpacing: 2,
    marginTop:     SPACING.xs,
  },
  brandSub: {
    fontSize:  FONT_SIZE.sm,
    color:     COLORS.textMuted,
    marginTop: SPACING.xs,
  },

  // Form
  form: {
    backgroundColor: COLORS.surface,
    borderRadius:    BORDER_RADIUS.lg,
    padding:         SPACING.lg,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  formTitle: {
    fontSize:     FONT_SIZE.xl,
    fontWeight:   FONT_WEIGHT.bold,
    color:        COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  formSub: {
    fontSize:     FONT_SIZE.sm,
    color:        COLORS.textMuted,
    marginBottom: SPACING.lg,
  },

  // Fields
  fieldWrap: { marginBottom: SPACING.md },
  label: {
    fontSize:     FONT_SIZE.sm,
    fontWeight:   FONT_WEIGHT.medium,
    color:        COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surfaceRaised,
    borderRadius:    BORDER_RADIUS.md,
    borderWidth:     1,
    borderColor:     COLORS.border,
    padding:         SPACING.md,
    fontSize:        FONT_SIZE.md,
    color:           COLORS.textPrimary,
  },

  // Error
  errorWrap: {
    backgroundColor: COLORS.error + '20',
    borderRadius:    BORDER_RADIUS.sm,
    padding:         SPACING.sm,
    marginBottom:    SPACING.md,
    borderWidth:     1,
    borderColor:     COLORS.error + '40',
  },
  errorText: {
    color:    COLORS.error,
    fontSize: FONT_SIZE.sm,
  },

  // Button
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius:    BORDER_RADIUS.md,
    padding:         SPACING.md,
    alignItems:      'center',
    marginTop:       SPACING.xs,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color:      COLORS.background,
    fontSize:   FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },

  // Switch
  switchRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      SPACING.lg,
  },
  switchText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  switchLink: { color: COLORS.primary,   fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
});