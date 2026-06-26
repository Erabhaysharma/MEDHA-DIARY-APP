import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';

export default function PrivacyPolicyScreen() {
  const { colors: C } = useTheme();

  const sections = [
    {
      title: 'Information we collect',
      body: 'Medha collects information you provide directly — your diary entries, mood ratings, and profile details. We also collect basic usage data to improve the app experience.',
    },
    {
      title: 'How we use your data',
      body: 'Your diary entries are used exclusively to power Medha\'s AI features — memory cards, trend analysis, and personalized chat. We do not sell, share, or use your data for advertising.',
    },
    {
      title: 'Data storage',
      body: 'Your data is stored securely on Supabase servers with encryption at rest and in transit. Diary entries and memories are private by default and only accessible to you, unless you choose to share them publicly.',
    },
    {
      title: 'AI processing',
      body: 'To generate AI insights, portions of your diary content are sent to third-party AI providers (Groq). These providers process data under strict confidentiality agreements and do not retain your data for training.',
    },
    {
      title: 'Public diary posts',
      body: 'When you choose to share a diary page publicly, that content becomes visible to other Medha users. You can post anonymously. Shared posts can be deleted at any time from your Activity page.',
    },
    {
      title: 'Your rights',
      body: 'You can delete your account and all associated data at any time from Account → Delete account. Deleted data is permanently removed within 30 days.',
    },
    {
      title: 'Contact',
      body: 'For any privacy concerns, email us at privacy@medhaapp.in',
    },
  ];

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: C.background }]} edges={['top']}>
      <View style={[pp.header, { borderColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={pp.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[pp.title, { color: C.textPrimary }]}>Privacy Policy</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={[pp.updated, { color: C.textMuted }]}>Last updated: June 2026</Text>

        <Text style={[pp.intro, { color: C.textPrimary }]}>
          Medha is built on a foundation of trust. Your diary is personal — we treat it that way.
        </Text>

        {sections.map((sec, i) => (
          <View key={i} style={{ marginBottom: SPACING.lg }}>
            <Text style={[pp.sectionTitle, { color: C.textPrimary }]}>{sec.title}</Text>
            <Text style={[pp.sectionBody,  { color: C.textMuted   }]}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const pp = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 0.5 },
  backBtn:      { padding: 4 },
  title:        { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  updated:      { fontSize: FONT_SIZE.xs, marginBottom: SPACING.md },
  intro:        { fontSize: FONT_SIZE.md, lineHeight: 24, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: 6 },
  sectionBody:  { fontSize: FONT_SIZE.sm, lineHeight: 22 },
});