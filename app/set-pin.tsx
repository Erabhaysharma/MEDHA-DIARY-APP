import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLock } from '../src/contexts/LockContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';

const KEYS      = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
const PIN_LENGTH = 4;

export default function SetPinScreen() {
  const { setPin, setLockEnabled } = useLock();
  const { colors: C }              = useTheme();
  const [firstPin,  setFirstPin]   = useState<string | null>(null);
  const [pin,       setCurrentPin] = useState('');
  const [step,      setStep]       = useState<'set' | 'confirm'>('set');

  const handleKey = async (key: string) => {
    if (key === '⌫') { setCurrentPin(p => p.slice(0, -1)); return; }
    if (key === '')   return;

    const newPin = pin + key;
    setCurrentPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      if (step === 'set') {
        setFirstPin(newPin);
        setCurrentPin('');
        setStep('confirm');
      } else {
        if (newPin === firstPin) {
          await setPin(newPin);
          await setLockEnabled(true);
          Alert.alert('PIN set', 'App lock is now enabled.', [
            { text: 'Done', onPress: () => router.back() },
          ]);
        } else {
          Vibration.vibrate(400);
          Alert.alert('Mismatch', 'PINs do not match. Try again.');
          setFirstPin(null);
          setCurrentPin('');
          setStep('set');
        }
      }
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]}>

      {/* Back button */}
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
      </TouchableOpacity>

      <View style={s.container}>
        <View style={[s.iconWrap, { backgroundColor: C.primaryFaint, borderColor: C.primary }]}>
          <Ionicons name={step === 'set' ? 'keypad-outline' : 'shield-checkmark-outline'} size={32} color={C.primary} />
        </View>

        <Text style={[s.title, { color: C.textPrimary }]}>
          {step === 'set' ? 'Set a 4-digit PIN' : 'Confirm your PIN'}
        </Text>
        <Text style={[s.subtitle, { color: C.textMuted }]}>
          {step === 'set'
            ? 'This PIN protects your diary from others'
            : 'Enter the same PIN again to confirm'}
        </Text>

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

        {/* Step indicator */}
        <View style={s.stepsRow}>
          <View style={[s.stepDot, { backgroundColor: C.primary }]} />
          <View style={[s.stepDot, { backgroundColor: step === 'confirm' ? C.primary : C.border }]} />
        </View>

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
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1 },
  back:      { padding: SPACING.md },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, marginTop: -60 },
  iconWrap: {
    width: 72, height: 72, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: SPACING.md,
  },
  title:    { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: FONT_SIZE.sm, marginBottom: SPACING.xl, textAlign: 'center' },
  dotsRow:  { flexDirection: 'row', gap: 16, marginBottom: SPACING.md },
  dot:      { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  stepsRow: { flexDirection: 'row', gap: 6, marginBottom: SPACING.lg },
  stepDot:  { width: 6, height: 6, borderRadius: 3 },
  grid: {
    width: 280, flexDirection: 'row',
    flexWrap: 'wrap', justifyContent: 'center', gap: 12,
  },
  key: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  keyText:  { fontSize: 24, fontWeight: FONT_WEIGHT.medium },
});