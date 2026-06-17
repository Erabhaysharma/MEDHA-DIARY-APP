import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Vibration, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLock } from '../src/contexts/LockContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const PIN_LENGTH = 4;

export default function LockScreen() {
  const { verifyPin, unlockApp, setLockEnabled } = useLock();
  const { colors: C }                            = useTheme();
  const { signOut }                              = useAuth();
  const [pin,      setPin]      = useState('');
  const [attempts, setAttempts] = useState(0);
  const [shake,    setShake]    = useState(false);

  const handleKey = async (key: string) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (key === '')   return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      const ok = await verifyPin(newPin);
      if (ok) {
        unlockApp();
        router.replace('/home');
      } else {
        Vibration.vibrate(400);
        setAttempts(a => a + 1);
        setPin('');
        if (attempts + 1 >= 5) {
          Alert.alert(
            'Too many attempts',
            'Log out and log back in to access your account.',
            [{ text: 'Log out', style: 'destructive', onPress: async () => {
              await signOut();
              router.replace('/(auth)/login');
            }}]
          );
        }
      }
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]}>
      <View style={s.container}>

        {/* Lock icon */}
        <View style={[s.iconWrap, { backgroundColor: C.primaryFaint, borderColor: C.primary }]}>
          <Ionicons name="lock-closed" size={32} color={C.primary} />
        </View>

        <Text style={[s.title, { color: C.textPrimary }]}>Medha is locked</Text>
        <Text style={[s.subtitle, { color: C.textMuted }]}>Enter your PIN to continue</Text>

        {/* PIN dots */}
        <View style={s.dotsRow}>
          {Array(PIN_LENGTH).fill(0).map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                { borderColor: C.primary },
                i < pin.length && { backgroundColor: C.primary },
              ]}
            />
          ))}
        </View>

        {attempts > 0 && (
          <Text style={[s.attempts, { color: C.error }]}>
            Wrong PIN · {5 - attempts} attempts left
          </Text>
        )}

        {/* Keypad */}
        <View style={s.grid}>
          {KEYS.map((key, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                s.key,
                { backgroundColor: key === '' ? 'transparent' : C.surface, borderColor: C.border },
                key === '⌫' && { backgroundColor: 'transparent', borderWidth: 0 },
              ]}
              onPress={() => handleKey(key)}
              disabled={key === ''}
              activeOpacity={0.7}
            >
              <Text style={[
                s.keyText,
                { color: key === '⌫' ? C.primary : C.textPrimary },
              ]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Forgot PIN */}
        <TouchableOpacity
          style={s.forgotBtn}
          onPress={() => Alert.alert(
            'Forgot PIN?',
            'You will be logged out and need to log in again to reset your PIN.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log out', style: 'destructive', onPress: async () => {
                await setLockEnabled(false);
                await signOut();
                router.replace('/(auth)/login');
              }},
            ]
          )}
        >
          <Text style={[s.forgotText, { color: C.textMuted }]}>Forgot PIN?</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  iconWrap: {
    width: 72, height: 72, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: SPACING.md,
  },
  title:    { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginBottom: 4 },
  subtitle: { fontSize: FONT_SIZE.sm, marginBottom: SPACING.xl },
  dotsRow:  { flexDirection: 'row', gap: 16, marginBottom: SPACING.sm },
  dot: {
    width: 14, height: 14, borderRadius: 7, borderWidth: 2,
  },
  attempts: { fontSize: FONT_SIZE.xs, marginBottom: SPACING.lg },
  grid: {
    width: 280, flexDirection: 'row',
    flexWrap: 'wrap', justifyContent: 'center',
    gap: 12, marginTop: SPACING.lg,
  },
  key: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  keyText:   { fontSize: 24, fontWeight: FONT_WEIGHT.medium },
  forgotBtn: { marginTop: SPACING.xl },
  forgotText:{ fontSize: FONT_SIZE.sm },
});