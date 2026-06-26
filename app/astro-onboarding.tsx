import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../src/contexts/ThemeContext';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';
import { submitOnboarding } from '../src/Services/astroService';

const ZODIAC_EMOJI: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export default function AstroOnboarding() {
  const { colors: C } = useTheme();

  const [dob,          setDob]          = useState<Date | null>(null);
  const [showDatePick, setShowDatePick] = useState(false);
  const [birthTime,    setBirthTime]    = useState('');
  const [birthPlace,   setBirthPlace]   = useState('');
  const [saving,       setSaving]       = useState(false);
  const [zodiac,       setZodiac]       = useState<string | null>(null);
  const [step,         setStep]         = useState<'form' | 'result'>('form');

  const dobString = dob
    ? dob.toISOString().split('T')[0]
    : null;

  const dobDisplay = dob
    ? dob.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const canSubmit = !!dob && birthPlace.trim().length > 1;

  const handleSubmit = async () => {
    if (!canSubmit || !dobString) return;
    setSaving(true);
    try {
      const res = await submitOnboarding({
        dob:         dobString,
        birth_time:  birthTime.trim() || 'unknown',
        birth_place: birthPlace.trim(),
      });
      setZodiac(res.zodiac_sign);
      setStep('result');
    } catch (e: any) {
      console.warn('onboarding error', e?.message);
    } finally {
      setSaving(false);
    }
  };

  if (step === 'result' && zodiac) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
        <View style={s.resultWrap}>
          <Text style={s.resultEmoji}>{ZODIAC_EMOJI[zodiac] ?? '⭐'}</Text>
          <Text style={[s.resultTitle, { color: C.textPrimary }]}>You are a {zodiac}</Text>
          <Text style={[s.resultSub, { color: C.textMuted }]}>
            Astro Medha now knows your cosmic blueprint.{'\n'}
            Your personalized journey begins today.
          </Text>
          <TouchableOpacity
            style={[s.resultBtn, { backgroundColor: C.primary }]}
            onPress={() => router.replace('/astro-chat')}
          >
            <Text style={[s.resultBtnText, { color: C.background }]}>
              Open Astro Medha ✨
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <View style={[s.header, { borderColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Your Birth Details</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <View style={s.topInfo}>
          <Text style={s.topEmoji}>🔮</Text>
          <Text style={[s.topTitle, { color: C.textPrimary }]}>
            Help Medha read your stars
          </Text>
          <Text style={[s.topSub, { color: C.textMuted }]}>
            These details are used only to calculate your birth chart and personalize your experience. They are stored securely and never shared.
          </Text>
        </View>

        {/* Date of birth */}
        <Text style={[s.label, { color: C.textMuted }]}>Date of Birth *</Text>
        <TouchableOpacity
          style={[s.inputBtn, { backgroundColor: C.surface, borderColor: dob ? C.primary : C.border }]}
          onPress={() => setShowDatePick(true)}
        >
          <Ionicons name="calendar-outline" size={18} color={dob ? C.primary : C.textMuted} />
          <Text style={[s.inputBtnText, { color: dob ? C.textPrimary : C.textMuted }]}>
            {dobDisplay ?? 'Select your date of birth'}
          </Text>
        </TouchableOpacity>

        {showDatePick && (
          <DateTimePicker
            value={dob ?? new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            minimumDate={new Date(1940, 0, 1)}
            onChange={(event, selectedDate) => {
              setShowDatePick(false);
              if (selectedDate) setDob(selectedDate);
            }}
          />
        )}

        {/* Birth place */}
        <Text style={[s.label, { color: C.textMuted }]}>Birth Place (City) *</Text>
        <View style={[s.inputWrap, { backgroundColor: C.surface, borderColor: birthPlace ? C.primary : C.border }]}>
          <Ionicons name="location-outline" size={18} color={birthPlace ? C.primary : C.textMuted} />
          <TextInput
            style={[s.input, { color: C.textPrimary }]}
            placeholder="e.g. Mumbai, Delhi, Jaipur"
            placeholderTextColor={C.textMuted}
            value={birthPlace}
            onChangeText={setBirthPlace}
            autoCorrect={false}
          />
        </View>

        {/* Birth time */}
        <Text style={[s.label, { color: C.textMuted }]}>
          Birth Time{' '}
          <Text style={{ fontWeight: FONT_WEIGHT.medium }}>(optional — improves accuracy)</Text>
        </Text>
        <View style={[s.inputWrap, { backgroundColor: C.surface, borderColor: birthTime ? C.primary : C.border }]}>
          <Ionicons name="time-outline" size={18} color={birthTime ? C.primary : C.textMuted} />
          <TextInput
            style={[s.input, { color: C.textPrimary }]}
            placeholder="e.g. 10:30 AM (leave blank if unknown)"
            placeholderTextColor={C.textMuted}
            value={birthTime}
            onChangeText={setBirthTime}
            autoCorrect={false}
          />
        </View>

        <View style={[s.noteCard, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}>
          <Ionicons name="information-circle-outline" size={16} color={C.primary} />
          <Text style={[s.noteText, { color: C.primary }]}>
            Birth time helps calculate your moon sign and rising sign for deeper insights. If unknown, Medha will use your sun sign.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: canSubmit ? C.primary : C.border }]}
          onPress={handleSubmit}
          disabled={!canSubmit || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={C.background} size="small" />
            : <>
                <Ionicons name="star-outline" size={18} color={canSubmit ? C.background : C.textMuted} />
                <Text style={[s.submitBtnText, { color: canSubmit ? C.background : C.textMuted }]}>
                  Unlock my Astro Medha
                </Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 0.5 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  scroll:  { padding: SPACING.md },

  topInfo:  { alignItems: 'center', paddingVertical: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.lg },
  topEmoji: { fontSize: 40 },
  topTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, textAlign: 'center' },
  topSub:   { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },

  label: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.xs, marginTop: SPACING.md },

  inputBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm + 2 },
  inputBtnText: { fontSize: FONT_SIZE.sm },

  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm + 2 },
  input:     { flex: 1, fontSize: FONT_SIZE.sm, padding: 0 },

  noteCard: { flexDirection: 'row', gap: 8, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm, marginTop: SPACING.md, alignItems: 'flex-start' },
  noteText:  { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: 16 },

  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.md, marginTop: SPACING.xl },
  submitBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },

  resultWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  resultEmoji:   { fontSize: 72 },
  resultTitle:   { fontSize: 28, fontWeight: FONT_WEIGHT.bold, textAlign: 'center' },
  resultSub:     { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 22 },
  resultBtn:     { borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.md },
  resultBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});