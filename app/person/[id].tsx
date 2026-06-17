import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { fetchPersonAnalysis, PersonAnalysis } from '../../src/Services/peopleService';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

function TrendChart({ trend, color, C }: {
  trend: { month: string; sentiment: number; count: number }[];
  color: string; C: any;
}) {
  if (trend.length === 0) return null;
  const maxCount = Math.max(...trend.map(t => t.count), 1);
  return (
    <View style={{ marginTop: SPACING.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {trend.map((point, idx) => {
          const barHeight = Math.max(8, (point.count / maxCount) * 70);
          const barColor  = point.sentiment >= 0.2 ? '#6A9E72'
            : point.sentiment <= -0.2 ? '#A05252' : '#7A7A76';
          return (
            <View key={idx} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 80 }}>
              <View style={{ width: '80%', height: barHeight, backgroundColor: barColor, borderRadius: 4, opacity: 0.9 }} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {trend.map((point, idx) => (
          <Text key={idx} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: C.textMuted }}>
            {formatMonth(point.month)}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm }}>
        {[
          { color: '#6A9E72', label: 'Positive'  },
          { color: '#7A7A76', label: 'Neutral'   },
          { color: '#A05252', label: 'Difficult' },
        ].map(item => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.color }} />
            <Text style={{ fontSize: 10, color: C.textMuted }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Golden Share Card ────────────────────────────────────────────────────────
function ShareCard({ data }: { data: PersonAnalysis }) {
  const { person, breakdown, vibe, vibe_emoji, vibe_color } = data;
  return (
    <View style={{
      width: 340,
      backgroundColor: '#111110',
      borderRadius: 24,
      padding: 28,
      borderWidth: 1.5,
      borderColor: '#C8A96E',
    }}>

      {/* Gold top accent bar */}
      <View style={{
        height: 4, width: 60,
        backgroundColor: '#C8A96E',
        borderRadius: 99, marginBottom: 20,
      }} />

      {/* Header */}
      <Text style={{ fontSize: 10, color: '#7A7A76', letterSpacing: 2, marginBottom: 6 }}>
        MY RELATIONSHIP WITH
      </Text>
      <Text style={{ fontSize: 30, fontWeight: '800', color: '#F0EEE6', marginBottom: 4 }}>
        {person.name}
      </Text>
      <Text style={{ fontSize: 13, color: '#C8A96E', marginBottom: 24 }}>
        {data.role || person.relationship} · {person.mention_count} mentions
      </Text>

      {/* Breakdown bars */}
      <View style={{ gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Positive moments',  value: breakdown.positive, color: '#6A9E72' },
          { label: 'Neutral moments',   value: breakdown.neutral,  color: '#7A7A76' },
          { label: 'Difficult moments', value: breakdown.negative, color: '#A05252' },
        ].map(bar => (
          <View key={bar.label}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ fontSize: 11, color: '#A0A0A0' }}>{bar.label}</Text>
              <Text style={{ fontSize: 11, color: bar.color, fontWeight: '700' }}>{bar.value}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#2A2A28', borderRadius: 99 }}>
              <View style={{
                height: 6,
                width: `${bar.value}%` as any,
                backgroundColor: bar.color,
                borderRadius: 99,
              }} />
            </View>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#1A1A18',
        borderRadius: 14,
        padding: 14,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#C8A96E30',
      }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#C8A96E' }}>
            {breakdown.positive}%
          </Text>
          <Text style={{ fontSize: 9, color: '#7A7A76', letterSpacing: 1 }}>POSITIVE</Text>
        </View>
        <View style={{ width: 1, backgroundColor: '#C8A96E20' }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#C8A96E' }}>
            {person.mention_count}
          </Text>
          <Text style={{ fontSize: 9, color: '#7A7A76', letterSpacing: 1 }}>MENTIONS</Text>
        </View>
        <View style={{ width: 1, backgroundColor: '#C8A96E20' }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 26 }}>{vibe_emoji}</Text>
          <Text style={{ fontSize: 9, color: '#7A7A76', letterSpacing: 1, textTransform: 'uppercase' }}>
            {vibe?.split(' ')[0] ?? 'VIBE'}
          </Text>
        </View>
      </View>

      {/* Vibe badge */}
      <View style={{
        backgroundColor: vibe_color + '25',
        borderRadius: 99,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: vibe_color + '60',
        marginBottom: 20,
      }}>
        <Text style={{ fontSize: 13, color: vibe_color, fontWeight: '700' }}>
          {vibe_emoji} {vibe}
        </Text>
      </View>

      {/* Gold divider */}
      <View style={{
        height: 1,
        backgroundColor: '#C8A96E30',
        marginBottom: 14,
      }} />

      {/* Watermark */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <View style={{ width: 20, height: 1, backgroundColor: '#C8A96E40' }} />
        <Text style={{ fontSize: 9, color: '#4A4A48', letterSpacing: 2 }}>
          MADE WITH MEDHA
        </Text>
        <View style={{ width: 20, height: 1, backgroundColor: '#C8A96E40' }} />
      </View>

    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PersonDetailScreen() {
  const { id }        = useLocalSearchParams<{ id: string }>();
  const { colors: C } = useTheme();
  const { profile }   = useAuth();

  const [data,     setData]     = useState<PersonAnalysis | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [sharing,  setSharing]  = useState(false);
  const [cardReady, setCardReady] = useState(false);

  const cardRef = useRef<View>(null);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchPersonAnalysis(id);
      setData(result);
    } catch {
      Alert.alert('Error', 'Could not load relationship data.');
    }
    setLoading(false);
  };

  const handleShare = async () => {
    if (!data || !cardRef.current) return;
    setSharing(true);
    setCardReady(true);

    // Wait for card to fully render
    await new Promise(r => setTimeout(r, 800));

    try {
      const uri = await captureRef(cardRef, {
        format:  'png',
        quality: 1.0,
        result:  'tmpfile',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType:    'image/png',
          dialogTitle: `My relationship with ${data.person.name}`,
          UTI:         'public.png',
        });
      } else {
        Alert.alert('Not available', 'Sharing is not available on this device.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not capture card. Try again.');
    }

    setCardReady(false);
    setSharing(false);
  };

  const handleSaveToGallery = async () => {
    await handleShare();
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.background }]}>
        <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const { person, trend, breakdown, key_moments, ai_summary, role, vibe, vibe_emoji, vibe_color } = data;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>

      {/* ── Hidden golden card for capture ── */}
      <View style={{
        position:      'absolute',
        left:          0,
        top:           0,
        opacity:       cardReady ? 1 : 0,
        pointerEvents: 'none',
        zIndex:        -1,
      }}>
        <View ref={cardRef} collapsable={false}>
          {data && <ShareCard data={data} />}
        </View>
      </View>

      {/* Header */}
      <View style={[s.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>{person.name}</Text>
        <TouchableOpacity
          style={[s.shareBtn, { backgroundColor: C.primaryFaint, borderColor: C.primary + '40' }]}
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing
            ? <ActivityIndicator size="small" color={C.primary} />
            : <Ionicons name="share-outline" size={18} color={C.primary} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero card */}
        <View style={[s.heroCard, { backgroundColor: vibe_color + '15', borderColor: vibe_color + '40' }]}>
          <View style={[s.heroAvatar, { backgroundColor: vibe_color + '30', borderColor: vibe_color }]}>
            <Text style={s.heroAvatarText}>{person.name[0]?.toUpperCase()}</Text>
          </View>
          <Text style={[s.heroName, { color: C.textPrimary }]}>{person.name}</Text>
          <Text style={[s.heroRole, { color: vibe_color }]}>{role || person.relationship}</Text>
          <View style={[s.vibeBadge, { backgroundColor: vibe_color + '20', borderColor: vibe_color + '40' }]}>
            <Text style={[s.vibeText, { color: vibe_color }]}>{vibe_emoji} {vibe}</Text>
          </View>
          <Text style={[s.mentionCount, { color: C.textMuted }]}>
            Mentioned {person.mention_count} times in your diary
          </Text>
        </View>

        {/* AI Summary */}
        {ai_summary ? (
          <View style={[s.section, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="sparkles-outline" size={14} color={C.primary} />
              <Text style={[s.sectionTitle, { color: C.textMuted }]}>MEDHA'S TAKE</Text>
            </View>
            <Text style={[s.summaryText, { color: C.textPrimary }]}>{ai_summary}</Text>
          </View>
        ) : null}

        {/* Breakdown */}
        <View style={[s.section, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={s.sectionHeader}>
            <Ionicons name="pie-chart-outline" size={14} color={C.primary} />
            <Text style={[s.sectionTitle, { color: C.textMuted }]}>EMOTION BREAKDOWN</Text>
          </View>
          {[
            { label: 'Positive moments',  value: breakdown.positive, color: '#6A9E72' },
            { label: 'Neutral moments',   value: breakdown.neutral,  color: '#7A7A76' },
            { label: 'Difficult moments', value: breakdown.negative, color: '#A05252' },
          ].map(bar => (
            <View key={bar.label} style={s.barRow}>
              <Text style={[s.barLabel, { color: C.textSecondary }]}>{bar.label}</Text>
              <View style={s.barWrap}>
                <View style={[s.barBg, { backgroundColor: C.overlay }]}>
                  <View style={[s.barFill, { width: `${bar.value}%` as any, backgroundColor: bar.color }]} />
                </View>
                <Text style={[s.barPct, { color: bar.color }]}>{bar.value}%</Text>
              </View>
            </View>
          ))}
          <View style={[s.statsRow, { borderTopColor: C.border }]}>
            {[
              { num: `${breakdown.positive}%`, label: 'Positive'  },
              { num: `${person.mention_count}`, label: 'Mentions' },
              { num: vibe_emoji,                label: 'Overall'  },
            ].map(stat => (
              <View key={stat.label} style={s.statItem}>
                <Text style={[s.statNum, { color: C.primary }]}>{stat.num}</Text>
                <Text style={[s.statLabel, { color: C.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Trend chart */}
        {trend.length > 1 && (
          <View style={[s.section, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="trending-up-outline" size={14} color={C.primary} />
              <Text style={[s.sectionTitle, { color: C.textMuted }]}>RELATIONSHIP OVER TIME</Text>
            </View>
            <TrendChart trend={trend} color={vibe_color} C={C} />
          </View>
        )}

        {/* Key moments */}
        {key_moments.length > 0 && (
          <View style={[s.section, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="bookmark-outline" size={14} color={C.primary} />
              <Text style={[s.sectionTitle, { color: C.textMuted }]}>KEY MOMENTS</Text>
            </View>
            {key_moments.map((moment, idx) => {
              const momentColor = moment.sentiment >= 0.2 ? '#6A9E72'
                : moment.sentiment <= -0.2 ? '#A05252' : '#7A7A76';
              return (
                <View key={idx} style={[s.momentItem, { borderLeftColor: momentColor }]}>
                  <Text style={[s.momentText, { color: C.textSecondary }]}>"{moment.text}"</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Share buttons */}
        <View style={s.shareRow}>
          <TouchableOpacity
            style={[s.shareBtnLarge, { backgroundColor: C.primary }]}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.8}
          >
            {sharing
              ? <ActivityIndicator size="small" color={C.background} />
              : <>
                  <Ionicons name="share-social-outline" size={18} color={C.background} />
                  <Text style={[s.shareBtnText, { color: C.background }]}>Share relationship card</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={handleSaveToGallery}
            disabled={sharing}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* Chat about person */}
        <TouchableOpacity
          style={[s.chatBtn, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}
          onPress={() => router.push('/(app)/chat')}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.primary} />
          <Text style={[s.chatBtnText, { color: C.primary }]}>Ask Medha about {person.name}</Text>
          <Ionicons name="arrow-forward" size={14} color={C.primary} />
        </TouchableOpacity>

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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold, flex: 1, textAlign: 'center' },
  shareBtn: {
    width: 36, height: 36, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  heroCard: {
    alignItems: 'center', borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, marginBottom: SPACING.md, gap: SPACING.sm,
  },
  heroAvatar: {
    width: 72, height: 72, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  heroAvatarText: { fontSize: 32, fontWeight: FONT_WEIGHT.bold },
  heroName:       { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold },
  heroRole:       { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, textTransform: 'capitalize' },
  vibeBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },
  vibeText:     { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  mentionCount: { fontSize: FONT_SIZE.xs },
  section: {
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, marginBottom: SPACING.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.sm },
  sectionTitle:  { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.8 },
  summaryText:   { fontSize: FONT_SIZE.md, lineHeight: 24 },
  barRow:        { marginBottom: SPACING.sm },
  barLabel:      { fontSize: FONT_SIZE.sm, marginBottom: 4 },
  barWrap:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  barBg:         { flex: 1, height: 6, borderRadius: BORDER_RADIUS.full },
  barFill:       { height: 6, borderRadius: BORDER_RADIUS.full },
  barPct:        { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, width: 36, textAlign: 'right' },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingTop: SPACING.md, marginTop: SPACING.sm, borderTopWidth: 1,
  },
  statItem:  { alignItems: 'center', gap: 2 },
  statNum:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  statLabel: { fontSize: FONT_SIZE.xs },
  momentItem: { borderLeftWidth: 2, paddingLeft: SPACING.sm, marginBottom: SPACING.sm },
  momentText: { fontSize: FONT_SIZE.sm, lineHeight: 20, fontStyle: 'italic' },
  shareRow:   { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  shareBtnLarge: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: SPACING.sm,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
  },
  shareBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  saveBtn: {
    width: 52, height: 52, borderRadius: BORDER_RADIUS.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, marginBottom: SPACING.sm,
  },
  chatBtnText: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});