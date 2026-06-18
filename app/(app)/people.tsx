import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { fetchPeople, Person } from '../../src/Services/peopleService';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';

const RELATIONSHIP_ICONS: Record<string, string> = {
  friend:       'people-outline',
  family:       'home-outline',
  colleague:    'briefcase-outline',
  romantic:     'heart-outline',
  acquaintance: 'person-outline',
  other:        'ellipse-outline',
};

export default function PeopleScreen() {
  const { colors: C } = useTheme();
  const [people,  setPeople]  = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => { loadPeople(); }, [])
  );

const loadPeople = async () => {
  setLoading(true);
  setError(null);
  try {
    // Fetch existing people first
    const data = await fetchPeople();

    if (data.length === 0) {
      // No people yet — bulk extract from all diary entries
      await api.post('/api/extract-people/all').catch(() => {});
      // Fetch again after extraction
      const refreshed = await fetchPeople();
      setPeople(refreshed);
    } else {
      setPeople(data);
    }
  } catch (e: any) {
    setError('Could not load people. Make sure the backend is running.');
  }
  setLoading(false);
};
  const renderPerson = ({ item, index }: { item: Person; index: number }) => {
    const positiveWidth = `${Math.max(5, (item.sentiment_avg + 1) / 2 * 100)}%`;
    const icon          = RELATIONSHIP_ICONS[item.relationship] ?? 'person-outline';

    return (
      <TouchableOpacity
        style={[styles.personCard, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => router.push(`/person/${item.id}`)}
        activeOpacity={0.8}
      >
        {/* Rank number */}
        <Text style={[styles.rank, { color: C.textMuted }]}>#{index + 1}</Text>

        {/* Avatar circle */}
        <View style={[styles.avatar, { backgroundColor: item.vibe_color + '20', borderColor: item.vibe_color + '60' }]}>
          <Text style={styles.avatarText}>
            {item.name[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.personInfo}>
          <View style={styles.personTopRow}>
            <Text style={[styles.personName, { color: C.textPrimary }]}>{item.name}</Text>
            <Text style={styles.vibeEmoji}>{item.vibe_emoji}</Text>
          </View>

          <View style={styles.personMeta}>
            <Ionicons name={icon as any} size={11} color={C.textMuted} />
            <Text style={[styles.metaText, { color: C.textMuted }]}>
              {item.relationship} · {item.mention_count} mention{item.mention_count !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Sentiment mini bar */}
          <View style={styles.miniBarRow}>
            <View style={[styles.miniBarBg, { backgroundColor: C.overlay }]}>
              <View style={[
                styles.miniBarFill,
                {
                  width:           positiveWidth as any,
                  backgroundColor: item.vibe_color,
                },
              ]} />
            </View>
            <Text style={[styles.vibeLabel, { color: item.vibe_color }]}>
              {item.vibe}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: C.textPrimary }]}>People</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>
            {people.length > 0
              ? `${people.length} people in your story`
              : 'Everyone you mention in your diary'}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: SPACING.xxl }} />
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="wifi-outline" size={40} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>Backend not connected</Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: C.primary }]}
            onPress={loadPeople}
          >
            <Text style={[styles.retryText, { color: C.background }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : people.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No people yet</Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>
            Mention people in your diary entries and Medha will automatically track your relationships.
          </Text>
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={item => item.id}
          renderItem={renderPerson}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.sm,
    paddingBottom:     SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold },
  headerSub:   { fontSize: FONT_SIZE.sm,  marginTop: 2 },

  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: SPACING.xxl },

  personCard: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            SPACING.sm,
    padding:        SPACING.md,
    borderRadius:   BORDER_RADIUS.lg,
    borderWidth:    1,
  },
  rank: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, width: 24, textAlign: 'center' },
  avatar: {
    width:          44,
    height:         44,
    borderRadius:   BORDER_RADIUS.full,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1.5,
    flexShrink:     0,
  },
  avatarText:    { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  personInfo:    { flex: 1 },
  personTopRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  personName:    { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, flex: 1 },
  vibeEmoji:     { fontSize: 16 },
  personMeta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  metaText:      { fontSize: FONT_SIZE.xs },
  miniBarRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBarBg:     { flex: 1, height: 4, borderRadius: BORDER_RADIUS.full },
  miniBarFill:   { height: 4, borderRadius: BORDER_RADIUS.full },
  vibeLabel:     { fontSize: 10, fontWeight: FONT_WEIGHT.semibold, width: 90, textAlign: 'right' },

  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        SPACING.xl,
    gap:            SPACING.sm,
  },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  emptySub:   { fontSize: FONT_SIZE.sm,  textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical:   SPACING.sm,
    borderRadius:      BORDER_RADIUS.md,
    marginTop:         SPACING.sm,
  },
  retryText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});