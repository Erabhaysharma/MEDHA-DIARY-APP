import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
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

export default function EntryDetailScreen() {
  const { colors: C } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry,   setEntry]   = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => { loadEntry(); }, [id])
  );

  const loadEntry = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('id', id)
      .single();
    if (!error && data) setEntry(data);
    setLoading(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete entry',
      'This entry will be hidden from your diary. Medha will still remember it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('diary_entries')
              .update({ is_deleted: true })
              .eq('id', id)
              .eq('user_id', entry!.user_id);
               //console.log('Delete error:', JSON.stringify(error)); // add this

            if (error) {
              Alert.alert('Error', 'Could not delete. Please try again.');
              return;
            }
            router.replace('/(app)/diary');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={[s.safe,{backgroundColor: C.background }]}>
        <View style={s.notFound}>
          <Text style={[s.notFoundText,{ color:C.textMuted }]}>Entry not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[s.backLink,{color: C.primary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const moodColor = entry.mood_label ? MOOD_COLOR[entry.mood_label] : null;

  return (
    <SafeAreaView style={[s.safe,{ backgroundColor: C.background }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={[s.header,{borderBottomColor: C.border,}]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.textSecondary} />
        </TouchableOpacity>

        <Text style={[s.headerDate,{color:C.textMuted}]}>
          {new Date(entry.entry_date).toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>

        <View style={s.headerActions}>
          <TouchableOpacity style={[s.headerBtn,{color:C.textMuted}]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={20} color={C.error} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.editBtn,{backgroundColor:   C.primary}]}
            onPress={() => router.push(`/edit-entry/${entry.id}`)}
          >
            <Ionicons name="pencil" size={14} color={C.background} />
            <Text style={[s.editBtnText,{ color:      C.background,}]}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood pill */}
        {moodColor && (
          <View style={[s.moodPill, { backgroundColor: moodColor }]}>
            <Text style={[s.moodPillText,{color:         C.background,}]}>
              {MOOD_EMOJI[entry.mood_label!]}  {entry.mood_label}
            </Text>
          </View>
        )}

        {/* Title */}
        {entry.title && (
          <Text style={[s.title,{color:C.textPrimary,}]}>{entry.title}</Text>
        )}

        {/* Meta */}
        <View style={s.meta}>
          <View style={s.metaItem}>
            <Ionicons name="document-text-outline" size={13} color={C.textMuted} />
            <Text style={[s.metaText,{color: C.textMuted }]}>{entry.word_count} words</Text>
          </View>
          {entry.people_mentioned.length > 0 && (
            <View style={s.metaItem}>
              <Ionicons name="people-outline" size={13} color={C.textMuted} />
              <Text style={s.metaText}>
                {entry.people_mentioned.slice(0, 3).join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={[s.divider,{backgroundColor: C.border,}]} />

        {/* Content — blog style */}
        <Text style={[s.content,{color:C.textPrimary}]}>{entry.content}</Text>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <View style={s.tagsWrap}>
            {entry.tags.map(tag => (
              <View key={tag} style={[s.tag,{ borderColor:C.border,backgroundColor:C.surface}]}>
                <Text style={[s.tagText,{ color: C.textMuted}]}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1},
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 1,
    
    gap:               8,
  },
  headerBtn:  { padding: 4 },
  headerDate: {
    flex:       1,
    fontSize:   FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    
    textAlign:  'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  editBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    borderRadius:      BORDER_RADIUS.md,
    paddingVertical:   6,
    paddingHorizontal: 12,
  },
  editBtnText: {
    fontSize:   FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
   
  },
  scroll:        { flex: 1 },
  scrollContent: { padding: SPACING.md },
  moodPill: {
    borderRadius:      BORDER_RADIUS.full,
    paddingVertical:   4,
    paddingHorizontal: SPACING.md,
    alignSelf:         'flex-start',
    marginBottom:      SPACING.md,
  },
  moodPillText: {
    fontSize:      FONT_SIZE.sm,
    fontWeight:    FONT_WEIGHT.semibold,
    
    textTransform: 'capitalize',
  },
  title: {
    fontSize:     FONT_SIZE.xxl,
    fontWeight:   FONT_WEIGHT.bold,
    
    lineHeight:   34,
    marginBottom: SPACING.sm,
  },
  meta: {
    flexDirection: 'row',
    gap:           SPACING.md,
    marginBottom:  SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  metaText: { fontSize: FONT_SIZE.xs},
  divider: {
    height:          1,
    
    marginVertical:  SPACING.md,
  },
  content: {
    fontSize:      FONT_SIZE.md,
    
    lineHeight:    28,
    letterSpacing: 0.2,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginTop:     SPACING.lg,
  },
  tag: {
    
    borderRadius:      BORDER_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical:   4,
    borderWidth:       1,
   
  },
  tagText:    { fontSize: FONT_SIZE.xs },
  notFound:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  notFoundText: { fontSize: FONT_SIZE.lg},
  backLink:   { fontSize: FONT_SIZE.sm},
});