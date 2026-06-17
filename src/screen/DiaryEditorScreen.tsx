import { useState, useEffect, useRef } from 'react';
import { ingestEntry } from '../Services/diaryService';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DiaryEntry, MOOD_OPTIONS, MoodLabel } from '../types/database';
import { useTheme } from '../../src/contexts/ThemeContext'; 
import {
  COLORS, FONT_SIZE, SPACING,
  BORDER_RADIUS, FONT_WEIGHT,
} from '../constants/theme';

import { extractPeople } from '../Services/diaryService';

interface Props {
  entryId?: string;  // if passed — edit mode. if null — create mode
}

export default function DiaryEditorScreen({ entryId }: Props) {
  const { refreshProfile } = useAuth();
  const { user } = useAuth();
  const { colors: C }  = useTheme();
  const [title,     setTitle]     = useState('');
  const [content,   setContent]   = useState('');
  const [moodLabel, setMoodLabel] = useState<MoodLabel | null>(null);
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [tags,      setTags]      = useState<string[]>([]);
  const [tagInput,  setTagInput]  = useState('');
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(!!entryId);
  const [existingEntry, setExistingEntry] = useState<DiaryEntry | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef    = useRef<TextInput>(null);

  // ── Load existing entry if editing ──────────────────────────────────────────
  useEffect(() => {
    if (entryId) loadEntry();
  }, [entryId]);

  const loadEntry = async () => {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (!error && data) {
      setExistingEntry(data);
      setTitle(data.title ?? '');
      setContent(data.content);
      setMoodLabel(data.mood_label);
      setMoodScore(data.mood_score);
      setTags(data.tags ?? []);
      setEntryDate(data.entry_date);
    }
    setLoading(false);
  };

  // ── Auto-save every 30 seconds while writing ─────────────────────────────────
  useEffect(() => {
    if (!content.trim()) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave(true); // silent save
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [content, title]);

  // ── Tag helpers ──────────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async (silent = false) => {
  if (!content.trim()) {
    if (!silent) Alert.alert('Empty entry', 'Write something before saving.');
    return;
  }
  if (!user) return;

  setSaving(true);

  const payload = {
    title:      title.trim() || null,
    content:    content.trim(),
    mood_label: moodLabel,
    mood_score: moodScore,
    tags,
    entry_date: entryDate,
    user_id:    user.id,
    is_indexed: false,
  };

  let savedEntryId: string | null = null;
  let error: any = null;

  if (existingEntry) {
    // Update existing entry
    const result = await supabase
      .from('diary_entries')
      .update(payload)
      .eq('id', existingEntry.id);
    error        = result.error;
    savedEntryId = existingEntry.id;
  } else {
    // Create new entry — get the ID back
    const result = await supabase
      .from('diary_entries')
      .insert(payload)
      .select('id')
      .single();
    error        = result.error;
    savedEntryId = result.data?.id ?? null;

    if (result.data) {
      // Set existingEntry so auto-save works correctly
      setExistingEntry({ ...payload, id: result.data.id } as any);
    }

    // After successful save — refresh profile to update entry count
if (savedEntryId) {
  ingestEntry({
    entry_id:   savedEntryId,
    content:    content.trim(),
    entry_date: entryDate,
    mood_label: moodLabel,
    title:      title.trim() || null,
  });
  extractPeople({
  entry_id:   savedEntryId,
  content:    content.trim(),
  entry_date: entryDate,
});

  // Refresh profile so total_entries updates immediately on home screen
  refreshProfile();
}

if (!silent) router.back();
  }

  setSaving(false);

  if (error) {
    if (!silent) Alert.alert('Save failed', error.message);
    return;
  }

  // ── Trigger Pinecone ingestion with the real entry ID ──────────────────
  if (savedEntryId) {
    console.log('Triggering ingest for entry:', savedEntryId);
    ingestEntry({
      entry_id:   savedEntryId,
      content:    content.trim(),
      entry_date: entryDate,
      mood_label: moodLabel,
      title:      title.trim() || null,
    }).then(() => {
      console.log('Ingest completed for:', savedEntryId);
    }).catch(err => {
      console.warn('Ingest failed:', err);
    });
  }

  if (!silent) router.back();
};

  // ── Mood picker ──────────────────────────────────────────────────────────────
  const selectMood = (label: MoodLabel, score: number) => {
    setMoodLabel(label);
    setMoodScore(score);
  };

  if (loading) {
    return (
      <View style={[s.loadingWrap,{backgroundColor: C.background, }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.safe,{backgroundColor: C.background}]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* ── Header ── */}
        <View style={[s.header,{borderBottomColor: C.border}]}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={[s.headerDate,{color:      C.textSecondary}]}>
            {new Date(entryDate).toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </Text>
          <TouchableOpacity
            style={[s.saveBtn,{ backgroundColor: C.primary,}, saving && s.saveBtnDisabled,{color:C.background}]}
            onPress={() => handleSave(false)}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color={C.background} />
              : <Text style={s.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Title ── */}
          <TextInput
            style={[s.titleInput,{color:C.textPrimary}]}
            placeholder="Title (optional)"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            returnKeyType="next"
            onSubmitEditing={() => contentRef.current?.focus()}
          />

          {/* ── Divider ── */}
          <View style={s.divider} />

          {/* ── Mood picker ── */}
          <View style={s.moodSection}>
            <Text style={s.fieldLabel}>How are you feeling?</Text>
            <View style={s.moodRow}>
              {MOOD_OPTIONS.map(m => (
                <TouchableOpacity
                  key={m.label}
                  style={[
                    s.moodBtn,
                    moodLabel === m.label && { borderColor: m.color, backgroundColor: m.color + '18',backgroundColor: C.surface ,borderColor:     C.border},
                  ]}
                  onPress={() => selectMood(m.label, m.score)}
                  activeOpacity={0.8}
                >
                  <Text style={s.moodEmoji}>{m.emoji}</Text>
                  <Text style={[
                    s.moodText,
                    moodLabel === m.label && { color: m.color,color:C.textMuted},
                  ]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Divider ── */}
          <View style={[s.divider,{ backgroundColor: C.border,}]} />

          {/* ── Content ── */}
          <TextInput
            ref={contentRef}
            style={[s.contentInput,{ color:C.textPrimary}]}
            placeholder={`What's on your mind today, ${user?.email?.split('@')[0] ?? 'you'}?`}
            placeholderTextColor={C.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoCorrect
          />

          {/* ── Divider ── */}
          <View style={s.divider} />

          {/* ── Tags ── */}
          <View style={s.tagsSection}>
            <Text style={[s.fieldLabel,{color:        C.textMuted,}]}>Tags</Text>
            <View style={s.tagInputRow}>
              <TextInput
                style={[s.tagInput,{backgroundColor:C.surface,borderColor:C.border,color:C.textPrimary}]}
                placeholder="Add a tag (e.g. work, health)"
                placeholderTextColor={C.textMuted}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
                returnKeyType="done"
                maxLength={20}
                autoCapitalize="none"
              />
              {tagInput.length > 0 && (
              <TouchableOpacity style={[s.tagAddBtn,{backgroundColor: C.primary}]} onPress={addTag}>
                  <Ionicons name="add" size={18} color={C.background} />
                </TouchableOpacity>
              )}
            </View>
            {tags.length > 0 && (
              <View style={s.tagList}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[s.tagChip,{backgroundColor:C.primaryFaint,borderColor:C.primary + '30'}]}
                    onPress={() => removeTag(tag)}
                  >
                    <Text style={[s.tagChipText,{ color:C.primary,}]}>#{tag}</Text>
                    <Ionicons name="close" size={12} color={C.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={[s.tagHint,{color:C.textMuted}]}>Tap a tag to remove it · max 5 tags</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const s = StyleSheet.create({
  safe:        { flex: 1},
  loadingWrap: { flex: 1,alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 1,
    
  },
  backBtn: { padding: 4 },
  headerDate: {
    fontSize:   FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    
    flex:       1,
    textAlign:  'center',
  },
  saveBtn: {
   
    borderRadius:    BORDER_RADIUS.md,
    paddingVertical:   6,
    paddingHorizontal: SPACING.md,
    minWidth:          60,
    alignItems:        'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize:   FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    
  },

  scroll:        { flex: 1 },
  scrollContent: { padding: SPACING.md },

  // Title
  titleInput: {
    fontSize:   FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    
    padding:    0,
    marginBottom: SPACING.md,
  },

  divider: {
    height:          1,
   
    marginVertical:  SPACING.md,
  },

  // Mood
  moodSection:  { marginBottom: SPACING.xs },
  fieldLabel: {
    fontSize:     FONT_SIZE.xs,
    fontWeight:   FONT_WEIGHT.semibold,
    
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  SPACING.sm,
  },
  moodRow: {
    flexDirection: 'row',
    gap:           8,
    flexWrap:      'wrap',
  },
  moodBtn: {
    alignItems:      'center',
    gap:             4,
    
    borderRadius:    BORDER_RADIUS.md,
    borderWidth:     1,
    paddingVertical:   10,
    paddingHorizontal: 12,
    minWidth:          58,
  },
  moodEmoji: { fontSize: 22 },
  moodText: {
    fontSize:   FONT_SIZE.xs,
    
    fontWeight: FONT_WEIGHT.medium,
  },

  // Content
  contentInput: {
    fontSize:   FONT_SIZE.md,
   
    lineHeight: 26,
    minHeight:  220,
    padding:    0,
  },

  // Tags
  tagsSection:  { marginBottom: SPACING.xs },
  tagInputRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  tagInput: {
    flex:              1,
    
    borderRadius:      BORDER_RADIUS.md,
    borderWidth:       1,
    
    paddingHorizontal: SPACING.sm,
    paddingVertical:   8,
    fontSize:          FONT_SIZE.sm,
    
  },
  tagAddBtn: {
    width:           34,
    height:          34,
    borderRadius:    BORDER_RADIUS.md,
    
    alignItems:      'center',
    justifyContent:  'center',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginTop:     SPACING.sm,
  },
  tagChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    
    borderRadius:      BORDER_RADIUS.full,
    paddingVertical:   4,
    paddingHorizontal: 10,
    borderWidth:       1,
    
  },
  tagChipText: {
    fontSize:   FONT_SIZE.xs,
   
    fontWeight: FONT_WEIGHT.medium,
  },
  tagHint: {
    fontSize:  FONT_SIZE.xs,
    
    marginTop: SPACING.xs,
  },
});