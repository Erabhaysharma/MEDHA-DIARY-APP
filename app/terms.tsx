import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { FONT_SIZE, SPACING, FONT_WEIGHT } from '../src/constants/theme';

export default function TermsScreen() {
  const { colors: C } = useTheme();

  const sections = [
    {
      title: 'Acceptance of terms',
      body:  'By using Medha, you agree to these terms. If you do not agree, please do not use the app.',
    },
    {
      title: 'Use of the app',
      body:  'Medha is a personal diary and AI companion app. You agree to use it lawfully and not to misuse the platform — including not posting harmful, hateful, or illegal content in the public diary feed.',
    },
    {
      title: 'Your content',
      body:  'You own everything you write in Medha. By using the app, you grant us a limited license to process your content solely to provide the app\'s features. We make no claim of ownership over your diary entries.',
    },
    {
      title: 'Public posts',
      body:  'Content you choose to share publicly must comply with community standards. We reserve the right to remove content that violates these standards without notice.',
    },
    {
      title: 'Premium subscription',
      body:  'Astro Medha Premium is a paid subscription billed monthly. Subscriptions can be cancelled at any time. Refunds are handled on a case-by-case basis — contact support@medhaapp.in.',
    },
    {
      title: 'AI disclaimer',
      body:  'Medha\'s AI features — including Astro Medha — provide information for entertainment and reflection purposes only. AI-generated content is not professional medical, psychological, or astrological advice.',
    },
    {
      title: 'Limitation of liability',
      body:  'Medha is provided as-is. We are not liable for any loss of data or indirect damages arising from your use of the app.',
    },
    {
      title: 'Changes to terms',
      body:  'We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.',
    },
    {
      title: 'Contact',
      body:  'For any questions about these terms, email legal@medhaapp.in',
    },
  ];

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: C.background }]} edges={['top']}>
      <View style={[t.header, { borderColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={t.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[t.title, { color: C.textPrimary }]}>Terms of Service</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={[t.updated, { color: C.textMuted }]}>Last updated: June 2026</Text>

        <Text style={[t.intro, { color: C.textPrimary }]}>
          These terms govern your use of Medha. Please read them carefully.
        </Text>

        {sections.map((sec, i) => (
          <View key={i} style={{ marginBottom: SPACING.lg }}>
            <Text style={[t.sectionTitle, { color: C.textPrimary }]}>
              {i + 1}. {sec.title}
            </Text>
            <Text style={[t.sectionBody, { color: C.textMuted }]}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const t = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 0.5 },
  backBtn:      { padding: 4 },
  title:        { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  updated:      { fontSize: FONT_SIZE.xs, marginBottom: SPACING.md },
  intro:        { fontSize: FONT_SIZE.md, lineHeight: 24, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: 6 },
  sectionBody:  { fontSize: FONT_SIZE.sm, lineHeight: 22 },
});