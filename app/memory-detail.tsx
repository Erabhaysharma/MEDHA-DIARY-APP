import { useLocalSearchParams, router } from 'expo-router';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';

const { width } = Dimensions.get('window');

export default function MemoryDetailScreen() {
  const params        = useLocalSearchParams();
  const { colors: C } = useTheme();

  // Parse the memory from params
  const type        = params.type as string;
  const title       = params.title as string;
  const description = params.description as string;
  const photoUrl    = params.photo_url as string | undefined;
  const date        = params.date as string;
  const color       = params.color as string | undefined;
  const emoji       = params.emoji as string | undefined;
  const summary     = params.summary as string | undefined;
  const insight     = params.insight as string | undefined;
  const emotion     = params.emotion as string | undefined;

  const isAI = type === 'ai';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>Memory</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isAI ? (
          /* ── AI Memory Card ── */
          <>
            {/* Color card hero */}
            <View style={[s.aiHero, { backgroundColor: color ?? C.primary }]}>
              <Text style={s.aiEmoji}>{emoji}</Text>
              <Text style={s.aiTitle}>{title}</Text>
              <View style={[s.emotionBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={s.emotionText}>{emotion}</Text>
              </View>
            </View>

            {/* Date */}
            <Text style={[s.dateLabel, { color: C.textMuted }]}>{date}</Text>

            {/* Summary */}
            <View style={[s.section, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[s.sectionTitle, { color: C.textMuted }]}>WHAT MEDHA REMEMBERS</Text>
              <Text style={[s.bodyText, { color: C.textPrimary }]}>{summary}</Text>
            </View>

            {/* Insight */}
            {insight && (
              <View style={[s.insightBox, { backgroundColor: C.primaryFaint, borderColor: C.primary + '40' }]}>
                <Ionicons name="sparkles-outline" size={16} color={C.primary} />
                <Text style={[s.insightText, { color: C.textSecondary }]}>{insight}</Text>
              </View>
            )}

            {/* Chat button */}
            <TouchableOpacity
              style={[s.chatBtn, { backgroundColor: C.primary }]}
              onPress={() => router.push('/(app)/chat')}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.background} />
              <Text style={[s.chatBtnText, { color: C.background }]}>
                Talk to Medha about this
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* ── User Memory ── */
          <>
            {/* Full size photo */}
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={[s.fullPhoto, { width: width - SPACING.md * 2 }]}
                resizeMode="cover"
              />
            ) : (
              <View style={[s.photoPlaceholder, { backgroundColor: C.primaryFaint }]}>
                <Ionicons name="image-outline" size={48} color={C.primary} />
              </View>
            )}

            {/* Date */}
            <Text style={[s.dateLabel, { color: C.textMuted }]}>
              {new Date(date).toLocaleDateString('en-IN', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>

            {/* Description */}
            <View style={[s.section, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[s.sectionTitle, { color: C.textMuted }]}>MEMORY</Text>
              <Text style={[s.bodyText, { color: C.textPrimary }]}>{description}</Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { padding: SPACING.md },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 1,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },

  // AI hero card
  aiHero: {
    borderRadius:   BORDER_RADIUS.xl,
    padding:        SPACING.xl,
    alignItems:     'center',
    marginBottom:   SPACING.md,
    minHeight:      200,
    justifyContent: 'center',
    gap:            SPACING.sm,
  },
  aiEmoji:    { fontSize: 56 },
  aiTitle:    { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: '#fff', textAlign: 'center' },
  emotionBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical:   4,
    borderRadius:      BORDER_RADIUS.full,
    marginTop:         SPACING.xs,
  },
  emotionText: { fontSize: FONT_SIZE.sm, color: '#fff', fontWeight: FONT_WEIGHT.medium, textTransform: 'capitalize' },

  dateLabel: { fontSize: FONT_SIZE.sm, marginBottom: SPACING.md },

  section: {
    borderRadius:  BORDER_RADIUS.lg,
    padding:       SPACING.md,
    borderWidth:   1,
    marginBottom:  SPACING.md,
  },
  sectionTitle: {
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    letterSpacing: 0.8,
    marginBottom:  SPACING.sm,
  },
  bodyText: { fontSize: FONT_SIZE.md, lineHeight: 26 },

  insightBox: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           SPACING.sm,
    borderRadius:  BORDER_RADIUS.md,
    padding:       SPACING.md,
    borderWidth:   1,
    marginBottom:  SPACING.lg,
  },
  insightText: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: 20, fontStyle: 'italic' },

  chatBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            SPACING.sm,
    borderRadius:   BORDER_RADIUS.md,
    padding:        SPACING.md,
  },
  chatBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },

  // User memory
  fullPhoto: {
    height:       280,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.md,
  },
  photoPlaceholder: {
    height:         200,
    borderRadius:   BORDER_RADIUS.xl,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   SPACING.md,
  },
});