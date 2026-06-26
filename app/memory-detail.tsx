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

  const type        = params.type        as string;
  const title       = params.title       as string;
  const description = params.description as string;
  const photoUrl    = params.photo_url   as string | undefined;
  const date        = params.date        as string;
  const color       = params.color       as string | undefined;
  const emoji       = params.emoji       as string | undefined;
  const summary     = params.summary     as string | undefined;
  const insight     = params.insight     as string | undefined;
  const emotion     = params.emotion     as string | undefined;

  // ── AI Memory Card ────────────────────────────────────────────────────────
  if (type === 'ai') {
    const bgColor = color ?? '#6A9E72';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>

        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.aiBackBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.lg, paddingTop: 0 }}
        >
          {/* Hero emoji */}
          <View style={s.aiHeroWrap}>
            <View style={s.aiEmojiCircle}>
              <Text style={s.aiEmoji}>{emoji ?? '✨'}</Text>
            </View>
            {/* Decorative outer ring */}
            <View style={s.aiRing} />
          </View>

          {/* Emotion tag */}
          {emotion ? (
            <View style={s.aiEmotionTag}>
              <Text style={s.aiEmotionText}>{emotion.toUpperCase()}</Text>
            </View>
          ) : null}

          {/* Title */}
          <Text style={s.aiTitle}>{title}</Text>

          {/* Date range */}
          <Text style={s.aiDate}>{date}</Text>

          {/* What Medha remembers */}
          <View style={s.aiCard}>
            <Text style={s.aiCardLabel}>✨  What Medha remembers</Text>
            <Text style={s.aiCardBody}>"{summary}"</Text>
          </View>

          {/* Medha's insight */}
          {insight ? (
            <View style={[s.aiCard, s.aiInsightCard]}>
              <Text style={s.aiCardLabel}>💡  Medha's insight</Text>
              <Text style={[s.aiCardBody, { fontStyle: 'normal', fontSize: FONT_SIZE.sm }]}>
                {insight}
              </Text>
            </View>
          ) : null}

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── User Memory ───────────────────────────────────────────────────────────
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>My Memory</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }}
      >
        {/* Photo or placeholder */}
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={[s.photo, { width: width - SPACING.md * 2 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[s.photoPlaceholder, { backgroundColor: C.primaryFaint }]}>
            <Ionicons name="image-outline" size={48} color={C.primary} />
            <Text style={[{ fontSize: FONT_SIZE.xs, color: C.primary, marginTop: 8 }]}>
              No photo added
            </Text>
          </View>
        )}

        {/* Date */}
        {formattedDate ? (
          <Text style={[s.dateLabel, { color: C.textMuted }]}>{formattedDate}</Text>
        ) : null}

        {/* Description */}
        <View style={[s.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>MEMORY</Text>
          <Text style={[s.bodyText, { color: C.textPrimary }]}>{description}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  // ── AI styles ──
  aiBackBtn: {
    margin:          SPACING.md,
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  aiHeroWrap: {
    alignItems:    'center',
    marginBottom:  SPACING.xl,
    position:      'relative',
  },
  aiEmojiCircle: {
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  aiEmoji: { fontSize: 60 },
  aiRing: {
    position:    'absolute',
    width:       160,
    height:      160,
    borderRadius:80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    top:         -20,
  },
  aiEmotionTag: {
    alignSelf:         'center',
    backgroundColor:   'rgba(255,255,255,0.2)',
    borderRadius:      BORDER_RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical:   5,
    marginBottom:      SPACING.md,
  },
  aiEmotionText: {
    color:         '#fff',
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    letterSpacing: 1,
  },
  aiTitle: {
    fontSize:     28,
    fontWeight:   FONT_WEIGHT.bold,
    color:        '#fff',
    textAlign:    'center',
    marginBottom: SPACING.sm,
  },
  aiDate: {
    fontSize:     FONT_SIZE.sm,
    color:        'rgba(255,255,255,0.7)',
    textAlign:    'center',
    marginBottom: SPACING.xl,
  },
  aiCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    BORDER_RADIUS.xl,
    padding:         SPACING.lg,
    marginBottom:    SPACING.md,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.2)',
  },
  aiInsightCard: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderColor:     'rgba(255,255,255,0.1)',
  },
  aiCardLabel: {
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    color:         'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom:  SPACING.sm,
  },
  aiCardBody: {
    fontSize:   FONT_SIZE.md,
    color:      '#fff',
    lineHeight: 26,
    fontStyle:  'italic',
  },

  // ── User memory styles ──
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 0.5,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },

  photo: {
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
  dateLabel: {
    fontSize:     FONT_SIZE.sm,
    marginBottom: SPACING.md,
  },
  section: {
    borderRadius: BORDER_RADIUS.lg,
    padding:      SPACING.md,
    borderWidth:  1,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    letterSpacing: 0.8,
    marginBottom:  SPACING.sm,
  },
  bodyText: {
    fontSize:   FONT_SIZE.md,
    lineHeight: 26,
  },
});