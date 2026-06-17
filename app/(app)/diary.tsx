import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { DiaryEntry } from '../../src/types/database';
import { useTheme } from '../../src/contexts/ThemeContext';
import {
  COLORS, FONT_SIZE, SPACING,
  BORDER_RADIUS, FONT_WEIGHT,
} from '../../src/constants/theme';

const MOOD_COLOR: Record<string, string> = {
  amazing: '#C8A96E',
  good:    '#6A9E72',
  neutral: '#7A7A76',
  bad:     '#8A7A9E',
  awful:   '#A05252',
};

const MOOD_EMOJI: Record<string, string> = {
  amazing: '🤩',
  good:    '😊',
  neutral: '😐',
  bad:     '😔',
  awful:   '😞',
};

function formatDisplayDate(dateStr: string): { day: string; month: string; weekday: string } {
  const d = new Date(dateStr);
  return {
    day:     d.getDate().toString(),
    month:   d.toLocaleDateString('en-IN', { month: 'short' }),
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
  };
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

export default function DiaryScreen() {
  const [entries,  setEntries]  = useState<DiaryEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const { colors: C } = useTheme();

  // Refresh every time the tab comes into focus
  // so newly saved entries appear immediately
  useFocusEffect(
    useCallback(() => { fetchEntries(); }, [])
  );

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('is_deleted', false)
      .order('entry_date', { ascending: false });

    if (!error && data) setEntries(data);
    setLoading(false);
  };

  // ── Grid card for each entry ─────────────────────────────────────────────
  const renderCard = ({ item }: { item: DiaryEntry }) => {
    const { day, month, weekday } = formatDisplayDate(item.entry_date);
    const today = isToday(item.entry_date);
    const moodColor = item.mood_label ? MOOD_COLOR[item.mood_label] : C.border;

    return (
      <TouchableOpacity
        style={[s.card,{backgroundColor: C.surface,borderColor:C.border},today && s.cardToday,{ borderColor: C.primary}]}
        activeOpacity={0.8}
        onPress={() => router.push(`/entry/${item.id}`)}
      >
        {/* Mood color bar at top of card */}
        <View style={[s.cardMoodBar, { backgroundColor: moodColor }]} />

        <View style={s.cardContent}>
          {/* Date */}
          <View style={s.cardDateWrap}>
            <Text style={[s.cardDay,{color:      C.textPrimary}]}>{day}</Text>
            <Text style={[s.cardMonth,{color:      C.textSecondary}]}>{month}</Text>
            <Text style={[s.cardWeekday,{color:    C.textMuted}]}>{weekday}</Text>
          </View>

          {/* Mood emoji */}
          {item.mood_label && (
            <Text style={s.cardMoodEmoji}>
              {MOOD_EMOJI[item.mood_label]}
            </Text>
          )}

          {/* Title or first line */}
          <Text style={[s.cardTitle,{color:        C.textPrimary}]} numberOfLines={2}>
            {item.title ?? item.content.slice(0, 60)}
          </Text>

          {/* Word count */}
          <Text style={[s.cardWordCount,{color:     C.textMuted}]}>{item.word_count} words</Text>

          {/* Tags */}
          {item.tags.length > 0 && (
            <View style={s.cardTags}>
              {item.tags.slice(0, 2).map(tag => (
            <View key={tag} style={[s.cardTag,{backgroundColor:   C.overlay}]}>
                  <Text style={[s.cardTagText,{color:    C.textMuted}]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Today badge */}
          {today && (
            <View style={[s.todayBadge,{backgroundColor:   C.primaryFaint}]}>
              <Text style={[s.todayBadgeText,{color:      C.primary}]}>Today</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.safe,{ backgroundColor: C.background}]} edges={['top']}>

      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle,{color:      C.textPrimary}]}>My Diary</Text>
          <Text style={[s.headerSub,{color:     C.textMuted,}]}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <ActivityIndicator
          color={C.primary}
          style={{ marginTop: SPACING.xxl }}
        />
      ) : entries.length === 0 ? (
        /* Empty state */
        <View style={s.empty}>
          <Ionicons name="journal-outline" size={48} color={C.textMuted} />
          <Text style={[s.emptyTitle,{color:      C.textPrimary}]}>No entries yet</Text>
          <Text style={[s.emptySub,{color:      C.textMuted,}]}>
            Tap the write button on the home screen to start your first entry
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },

  // Header
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.sm,
    paddingBottom:     SPACING.md,
  },
  headerTitle: {
    fontSize:   FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    
  },
  headerSub: {
    fontSize:  FONT_SIZE.sm,
    marginTop: 2,
  },

  // Grid
  grid: {
    paddingHorizontal: SPACING.md,
    paddingBottom:     SPACING.xxl,
  },
  row: {
    gap:          SPACING.sm,
    marginBottom: SPACING.sm,
  },

  // Card
  card: {
    flex:            1,
    
    borderRadius:    BORDER_RADIUS.lg,
    borderWidth:     1,
    overflow:        'hidden',
    minHeight:       160,
  },
  cardToday: {
   
    borderWidth: 1.5,
  },
  cardMoodBar: {
    height: 4,
    width:  '100%',
  },
  cardContent: {
    padding: SPACING.sm,
    flex:    1,
  },
  cardDateWrap: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           4,
    marginBottom:  SPACING.xs,
  },
  cardDay: {
    fontSize:   FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: 26,
  },
  cardMonth: {
    fontSize:   FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  cardWeekday: {
    fontSize: FONT_SIZE.xs,
  },
  cardMoodEmoji: {
    fontSize:     18,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize:     FONT_SIZE.sm,
    fontWeight:   FONT_WEIGHT.medium,
    lineHeight:   18,
    marginBottom: 4,
    flex:         1,
  },
  cardWordCount: {
    fontSize:  FONT_SIZE.xs,
    marginTop: 'auto',
  },
  cardTags: {
    flexDirection: 'row',
    gap:           4,
    marginTop:     4,
    flexWrap:      'wrap',
  },
  cardTag: {
    borderRadius:      BORDER_RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  cardTagText: {
    fontSize: 10,
  },
  todayBadge: {
    borderRadius:      BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical:   2,
    alignSelf:         'flex-start',
    marginTop:         4,
  },
  todayBadgeText: {
    fontSize:   10,
    fontWeight: FONT_WEIGHT.semibold,
  },

  // Empty state
  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        SPACING.xl,
    gap:            SPACING.sm,
  },
  emptyTitle: {
    fontSize:   FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    
  },
  emptySub: {
    fontSize:   FONT_SIZE.sm,
    
    textAlign:  'center',
    lineHeight: 20,
  },
});