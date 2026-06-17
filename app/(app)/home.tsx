import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
  Animated, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';   // ← Step 1
import { supabase } from '../../src/lib/supabase';
import { DiaryEntry } from '../../src/types/database';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';
import { Image } from 'react-native';

const MEMORY_UNLOCK_AT = 5;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr: string): string {
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function HomeScreen() {
  const { profile, refreshProfile } = useAuth();

  const { colors: C }  = useTheme();   // ← Step 2 — C replaces COLORS

  // Mood colors use C so they update with theme
  const MOOD_COLOR: Record<string, string> = {
    amazing: C.moodAmazing,
    good:    C.moodGood,
    neutral: C.moodMeutral,
    bad:     C.moodBad,
    awful:   C.moodAwful,
  };

  const [entries,       setEntries]       = useState<DiaryEntry[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [memories,      setMemories]      = useState<{ title: string; text: string }[]>([]);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<DiaryEntry[] | null>(null);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchRef  = useRef<TextInput>(null);

  const searchOpacity = searchAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 1],
  });

  useFocusEffect(
    useCallback(() => { fetchEntries(); }, [])
  );

  

const fetchEntries = async () => {
  setLoading(true);
 
  // Refresh profile count at the same time
  await refreshProfile();

  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('is_deleted', false)
    .neq('is_deleted', true)
    .order('entry_date', { ascending: false })
    .limit(10);

  if (!error && data) {
    setEntries(data);
    if (data.length >= MEMORY_UNLOCK_AT) {
      setMemories([
        {
          title: 'Pattern noticed',
          text:  'Your mood tends to be higher on days you write in the morning.',
        },
        {
          title: 'Last 7 days',
          text:  `You wrote ${data.filter(e => {
            const d    = new Date(e.entry_date);
            const week = new Date(Date.now() - 7 * 86400000);
            return d >= week;
          }).length} entries this week. Keep going.`,
        },
      ]);
    }
  }
  setLoading(false);
};

  const openSearch = () => {
    setSearchOpen(true);
    Animated.spring(searchAnim, {
      toValue: 1, useNativeDriver: false, tension: 80, friction: 10,
    }).start(() => searchRef.current?.focus());
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults(null);
    Animated.spring(searchAnim, {
      toValue: 0, useNativeDriver: false, tension: 80, friction: 10,
    }).start(() => setSearchOpen(false));
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults(null); return; }
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('is_deleted', false)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('entry_date', { ascending: false })
      .limit(20);
    if (!error && data) setSearchResults(data);
  };

  const totalEntries   = profile?.total_entries ?? entries.length;
  const memoriesLocked = totalEntries < MEMORY_UNLOCK_AT;
  const entriesNeeded  = MEMORY_UNLOCK_AT - totalEntries;
  const progressPct    = Math.min((totalEntries / MEMORY_UNLOCK_AT) * 100, 100);
  const firstName      = profile?.display_name?.split(' ')[0] ?? 'there';

  return (
    // ← Step 3 — every color is C.xxx inline
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Top bar ── */}
        <View style={s.topbar}>
          {!searchOpen ? (
            <View style={s.greetingWrap}>
              <Text style={[s.greeting, { color: C.textPrimary }]}>
                {getGreeting()}, {firstName}
              </Text>
              <Text style={[s.subGreeting, { color: C.textMuted }]}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
                {totalEntries > 0
                  ? ` · ${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'}`
                  : ''}
              </Text>

            </View>
          ) : (
            <Animated.View style={[
              s.searchBarWrap,
              {
                opacity:         searchOpacity,
                backgroundColor: C.surface,
                borderColor:     C.primary,
              }
            ]}>
              <Ionicons name="search-outline" size={16} color={C.textMuted} />
              <TextInput
                ref={searchRef}
                style={[s.searchInput, { color: C.textPrimary }]}
                placeholder="Search entries, people, incidents..."
                placeholderTextColor={C.textMuted}
                value={searchQuery}
                onChangeText={handleSearch}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults(null); }}>
                  <Ionicons name="close-circle" size={16} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          <View style={s.topbarRight}>
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={searchOpen ? closeSearch : openSearch}
            >
              <Ionicons
                name={searchOpen ? 'close' : 'search-outline'}
                size={20}
                color={searchOpen ? C.primary : C.textSecondary}
              />
            </TouchableOpacity>
            {!searchOpen && (
              <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => router.push('/account')}
              >
                <Ionicons name="person-circle-outline" size={24} color={C.primary} />
                
              </TouchableOpacity>

              
              
              


            )}

          {!searchOpen && (
          <TouchableOpacity
                style={[s.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => router.push('/add-memory')}
                >
                  <Ionicons name="images-outline" size={20} color={C.primary} />
          </TouchableOpacity>
        
)}

          </View>

          
        </View>

        {/* ── Search results ── */}
        {searchOpen && searchResults !== null && (
          <View style={s.searchResultsWrap}>
            <Text style={[s.sectionLabel, { color: C.textMuted }]}>
              {searchResults.length === 0
                ? 'No results found'
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
            </Text>
            {searchResults.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={[s.entryCard, { backgroundColor: C.surface, borderColor: C.border }]}
                activeOpacity={0.8}
                onPress={() => { closeSearch(); router.push(`/entry/${entry.id}`); }}
              >
                <View style={s.entryTop}>
                  <Text style={[s.entryDate, { color: C.textMuted }]}>
                    {formatDate(entry.entry_date)}
                  </Text>
                  {entry.mood_label && (
                    <View style={[s.moodDot, { backgroundColor: MOOD_COLOR[entry.mood_label] ?? C.textMuted }]} />
                  )}
                </View>
                <Text style={[s.entryTitle, { color: C.textPrimary }]} numberOfLines={1}>
                  {entry.title ?? entry.content.slice(0, 50)}
                </Text>
                <Text style={[s.entryPreview, { color: C.textMuted }]} numberOfLines={2}>
                  {entry.content}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Search hint ── */}
        {searchOpen && searchResults === null && (
          <View style={s.searchHint}>
            <Ionicons name="search-outline" size={32} color={C.textMuted} />
            <Text style={[s.searchHintText, { color: C.textMuted }]}>
              Search by title, date, person or incident
            </Text>
          </View>
        )}

        {/* ── Main content ── */}
        {!searchOpen && (
          <>
            {/* Memories section */}
            {memoriesLocked ? (
              <View style={[s.memoryLockedCard, { backgroundColor: C.surface, borderColor: C.primaryFaint }]}>
                <View style={s.memoryLockedTop}>
                  <View style={[s.memoryIcon, { backgroundColor: C.primaryFaint }]}>
                    <Ionicons name="hardware-chip-outline" size={20} color={C.primary} />
                  </View>
                  <View style={s.memoryLockedText}>
                    <Text style={[s.memoryLockedTitle, { color: C.textPrimary }]}>
                      Memories take time
                    </Text>
                    <Text style={[s.memoryLockedSub, { color: C.textMuted }]}>
                      {entriesNeeded} more {entriesNeeded === 1 ? 'entry' : 'entries'} until {profile?.ai_name ?? 'Medha'} starts remembering
                    </Text>
                  </View>
                </View>
                <View style={[s.progressBg, { backgroundColor: C.overlay }]}>
                  <View style={[s.progressFill, { width: `${progressPct}%`, backgroundColor: C.primary }]} />
                </View>
                <Text style={[s.progressLabel, { color: C.textMuted }]}>
                  {totalEntries} of {MEMORY_UNLOCK_AT} entries written
                </Text>
                 
            
              </View>
              
            ) 
            
           
            
            : (
              <View style={s.memoriesWrap}>
                <Text style={[s.sectionLabel, { color: C.textMuted }]}>
                  {profile?.ai_name ?? 'Medha'} remembers
                </Text>
                {memories.map((m, i) => (
                  <View key={i} style={[s.memoryCard, { backgroundColor: C.surface, borderColor: C.primaryFaint }]}>
                    <View style={s.memoryCardTop}>
                      <Ionicons
                        name={i === 0 ? 'trending-up-outline' : 'sparkles-outline'}
                        size={14}
                        color={C.primary}
                      />
                      <Text style={[s.memoryCardTitle, { color: C.primary }]}>{m.title}</Text>
                      
                    </View>
                    <Text style={[s.memoryCardText, { color: C.textSecondary }]}>{m.text}</Text>
                   
       
                  </View>
                ))}
                <TouchableOpacity
                  style={[s.chatPromptBtn, { backgroundColor: C.primaryFaint }]}
                  onPress={() => router.push('/(app)/chat')}
                  activeOpacity={0.8}
                >
                  
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={C.primary} />
                  <Text style={[s.chatPromptText, { color: C.primary }]}>
                    Ask {profile?.ai_name ?? 'Medha'} about your past
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color={C.primary} />
                </TouchableOpacity>
              </View>
            )}
             
   {/* ── Recent memories strip ── */}
            <RecentMemories colors={C} totalEntries={totalEntries} />
            {/* Recent entries */}
            <View style={s.sectionHeader}>
              <Text style={[s.sectionLabel, { color: C.textMuted }]}>Recent entries</Text>
              {entries.length > 3 && (
                <TouchableOpacity onPress={() => router.push('/(app)/diary')}>
                  <Text style={[s.seeAll, { color: C.primary }]}>See all</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <ActivityIndicator color={C.primary} style={{ marginTop: SPACING.lg }} />
            ) : entries.length === 0 ? (
              <View style={s.emptyEntries}>
                <Ionicons name="journal-outline" size={36} color={C.textMuted} />
                <Text style={[s.emptyTitle, { color: C.textPrimary }]}>Your story starts here</Text>
                <Text style={[s.emptySub, { color: C.textMuted }]}>
                  Write your first diary entry and begin building your memory
                </Text>
              </View>
            ) : (
              entries.slice(0, 3).map(entry => (
                <TouchableOpacity
                  key={entry.id}
                  style={[s.entryCard, { backgroundColor: C.surface, borderColor: C.border }]}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                >
                  <View style={s.entryTop}>
                    <Text style={[s.entryDate, { color: C.textMuted }]}>
                      {formatDate(entry.entry_date)}
                    </Text>
                    {entry.mood_label && (
                      <View style={[s.moodDot, { backgroundColor: MOOD_COLOR[entry.mood_label] ?? C.textMuted }]} />
                    )}
                  </View>
                  <Text style={[s.entryTitle, { color: C.textPrimary }]} numberOfLines={1}>
                    {entry.title ?? entry.content.slice(0, 50)}
                  </Text>
                  <Text style={[s.entryPreview, { color: C.textMuted }]} numberOfLines={2}>
                    {entry.content}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={{ height: 80 }} />
       
      </ScrollView>

      {/* ── FAB ── */}
      {!searchOpen && (
        memoriesLocked ? (
          <View style={s.centerFabWrap}>
            <TouchableOpacity
              style={[s.centerFab, { backgroundColor: C.primary }]}
              onPress={() => router.push('/new-entry')}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={16} color={C.background} />
              <Text style={[s.centerFabText, { color: C.background }]}>
                Write today's entry
              </Text>
            </TouchableOpacity>
            
          </View>
          
        ) : (
          <TouchableOpacity
            style={[s.cornerFab, { backgroundColor: C.primary }]}
            onPress={() => router.push('/new-entry')}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil" size={22} color={C.background} />
          </TouchableOpacity>
        )
      )}

      
    </SafeAreaView>
  );
}

import { fetchMemoryCards, fetchUserMemories, MemoryCard, UserMemory } from '../../src/Services/memoryService';

function RecentMemories({ colors: C, totalEntries }: { colors: any; totalEntries: number }) {
  const { user }                          = useAuth();
  const [aiCards,     setAiCards]         = useState<MemoryCard[]>([]);
  const [userMemories, setUserMemories]   = useState<UserMemory[]>([]);
  const [loading,     setLoading]         = useState(false);
  const [unlocked,    setUnlocked]        = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMemories();
    }, [user, totalEntries])
  );

  const loadMemories = async () => {
    if (!user) return;
    setLoading(true);

    // Always load user memories
    const userMems = await fetchUserMemories(user.id);
    setUserMemories(userMems);

    // Load AI cards only if 5+ entries
    if (totalEntries >= 5) {
      try {
        const result = await fetchMemoryCards();
        setAiCards(result.cards);
        setUnlocked(result.unlocked);
      } catch (e) {
        console.warn('Could not load AI memory cards:', e);
      }
    }

    setLoading(false);
  };

  const openMemory = (item: MemoryCard | UserMemory) => {
    if (item.type === 'ai') {
      router.push({
        pathname: '/memory-detail',
        params: {
          type:        'ai',
          title:       item.title,
          emoji:       item.emoji,
          color:       item.color,
          emotion:     item.emotion,
          summary:     item.summary,
          insight:     item.insight,
          date:        item.date_range,
          description: item.summary,
        },
      });
    } else {
      router.push({
        pathname: '/memory-detail',
        params: {
          type:        'user',
          title:       'My Memory',
          description: item.description,
          photo_url:   item.photo_url ?? '',
          date:        item.memory_date,
        },
      });
    }
  };

  // Before 5 entries — show only user memory strip + add button
  if (totalEntries < 5) {
    return (
      <View style={{ marginBottom: SPACING.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
          <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Your Memories
          </Text>
          <TouchableOpacity onPress={() => router.push('/add-memory')}>
            <Text style={{ fontSize: FONT_SIZE.xs, color: C.primary, fontWeight: FONT_WEIGHT.medium }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm, paddingRight: SPACING.sm }}
          decelerationRate="fast"
          snapToInterval={156}
          snapToAlignment="start"
        >
          {userMemories.map(mem => (
            <TouchableOpacity
              key={mem.id}
              onPress={() => openMemory(mem)}
              activeOpacity={0.85}
              style={{
                width:           148,
                backgroundColor: C.surface,
                borderRadius:    BORDER_RADIUS.lg,
                borderWidth:     1,
                borderColor:     C.border,
                overflow:        'hidden',
              }}
            >
              {mem.photo_url ? (
                <Image source={{ uri: mem.photo_url }} style={{ width: '100%', height: 100 }} resizeMode="cover" />
              ) : (
                <View style={{ width: '100%', height: 100, backgroundColor: C.primaryFaint, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={28} color={C.primary} />
                </View>
              )}
              <View style={{ padding: SPACING.xs }}>
                <Text style={{ fontSize: FONT_SIZE.xs, color: C.textPrimary, fontWeight: FONT_WEIGHT.medium, lineHeight: 16 }} numberOfLines={2}>
                  {mem.description}
                </Text>
                <Text style={{ fontSize: 10, color: C.primary, marginTop: 3, fontWeight: FONT_WEIGHT.medium }}>
                  {new Date(mem.memory_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Add memory button */}
          <TouchableOpacity
            onPress={() => router.push('/add-memory')}
            activeOpacity={0.8}
            style={{
              width:           148,
              height:          160,
              backgroundColor: C.surface,
              borderRadius:    BORDER_RADIUS.lg,
              borderWidth:     1,
              borderColor:     C.primary + '40',
              borderStyle:     'dashed',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             SPACING.xs,
            }}
          >
            <Ionicons name="add-circle-outline" size={28} color={C.primary} />
            <Text style={{ fontSize: FONT_SIZE.xs, color: C.primary, fontWeight: FONT_WEIGHT.medium, textAlign: 'center' }}>
              Add memory
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // 5+ entries — show AI cards + user memories together
  const allItems = [
    ...aiCards,
    ...userMemories,
  ];

  if (allItems.length === 0 && !loading) return null;

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
        <Text style={{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Your Memories
        </Text>
        <TouchableOpacity onPress={() => router.push('/add-memory')}>
          <Text style={{ fontSize: FONT_SIZE.xs, color: C.primary, fontWeight: FONT_WEIGHT.medium }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: SPACING.sm, paddingRight: SPACING.sm }}
        decelerationRate="fast"
        snapToInterval={164}
        snapToAlignment="start"
      >
        {allItems.map(item => {
          if (item.type === 'ai') {
            // ── AI Memory Card — colorful square ──
            const card = item as MemoryCard;
            return (
              <TouchableOpacity
                key={card.id}
                onPress={() => openMemory(card)}
                activeOpacity={0.85}
                style={{
                  width:         156,
                  height:        180,
                  borderRadius:  BORDER_RADIUS.xl,
                  backgroundColor: card.color,
                  padding:       SPACING.md,
                  justifyContent: 'space-between',
                  overflow:      'hidden',
                }}
              >
                {/* Decorative circle */}
                <View style={{
                  position:        'absolute',
                  top:             -20,
                  right:           -20,
                  width:           100,
                  height:          100,
                  borderRadius:    50,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                }} />

                <Text style={{ fontSize: 32 }}>{card.emoji}</Text>

                <View>
                  <Text style={{
                    fontSize:   FONT_SIZE.md,
                    fontWeight: FONT_WEIGHT.bold,
                    color:      '#fff',
                    lineHeight: 20,
                    marginBottom: 4,
                  }} numberOfLines={2}>
                    {card.title}
                  </Text>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: FONT_WEIGHT.medium }}>
                    {card.date_range}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          } else {
            // ── User Memory Card — photo card ──
            const mem = item as UserMemory;
            return (
              <TouchableOpacity
                key={mem.id}
                onPress={() => openMemory(mem)}
                activeOpacity={0.85}
                style={{
                  width:           156,
                  height:          180,
                  backgroundColor: C.surface,
                  borderRadius:    BORDER_RADIUS.xl,
                  borderWidth:     1,
                  borderColor:     C.border,
                  overflow:        'hidden',
                }}
              >
                {mem.photo_url ? (
                  <Image
                    source={{ uri: mem.photo_url }}
                    style={{ width: '100%', height: 120 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{
                    width:           '100%',
                    height:          120,
                    backgroundColor: C.primaryFaint,
                    alignItems:      'center',
                    justifyContent:  'center',
                  }}>
                    <Ionicons name="image-outline" size={32} color={C.primary} />
                  </View>
                )}
                <View style={{ padding: SPACING.sm, flex: 1, justifyContent: 'space-between' }}>
                  <Text style={{
                    fontSize:   FONT_SIZE.xs,
                    color:      C.textPrimary,
                    fontWeight: FONT_WEIGHT.medium,
                    lineHeight: 15,
                  }} numberOfLines={2}>
                    {mem.description}
                  </Text>
                  <Text style={{ fontSize: 10, color: C.primary, fontWeight: FONT_WEIGHT.medium }}>
                    {new Date(mem.memory_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }
        })}

        {/* Add memory button */}
        <TouchableOpacity
          onPress={() => router.push('/add-memory')}
          activeOpacity={0.8}
          style={{
            width:           156,
            height:          180,
            backgroundColor: C.surface,
            borderRadius:    BORDER_RADIUS.xl,
            borderWidth:     1,
            borderColor:     C.primary + '40',
            borderStyle:     'dashed',
            alignItems:      'center',
            justifyContent:  'center',
            gap:             SPACING.xs,
          }}
        >
          <Ionicons name="add-circle-outline" size={28} color={C.primary} />
          <Text style={{ fontSize: FONT_SIZE.xs, color: C.primary, fontWeight: FONT_WEIGHT.medium, textAlign: 'center' }}>
            Add memory
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
// ─── Styles — layout only, NO colors ─────────────────────────────────────────
const s = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { padding: SPACING.md },

  topbar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.lg,
    minHeight:      48,
  },
  greetingWrap: { flex: 1 },
  greeting: {
    fontSize:   FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  subGreeting: {
    fontSize:  FONT_SIZE.sm,
    marginTop: 2,
  },
  topbarRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  iconBtn: {
    padding:      8,
    borderRadius: BORDER_RADIUS.full,
    borderWidth:  1,
  },
  searchBarWrap: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    borderRadius:      BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   8,
    borderWidth:       1,
    marginRight:       8,
  },
  searchInput: {
    flex:     1,
    fontSize: FONT_SIZE.sm,
    padding:  0,
  },
  searchHint: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    gap:        SPACING.md,
  },
  searchHintText: {
    fontSize:  FONT_SIZE.sm,
    textAlign: 'center',
  },
  searchResultsWrap: { marginBottom: SPACING.md },

  memoryLockedCard: {
    borderRadius:  BORDER_RADIUS.lg,
    padding:       SPACING.md,
    borderWidth:   1,
    marginBottom:  SPACING.lg,
  },
  memoryLockedTop: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    marginBottom:  SPACING.md,
  },
  memoryIcon: {
    width:          36,
    height:         36,
    borderRadius:   BORDER_RADIUS.sm,
    alignItems:     'center',
    justifyContent: 'center',
  },
  memoryLockedText:  { flex: 1 },
  memoryLockedTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  memoryLockedSub:   { fontSize: FONT_SIZE.xs, marginTop: 2 },
  progressBg: {
    height:        4,
    borderRadius:  BORDER_RADIUS.full,
    marginBottom:  SPACING.xs,
  },
  progressFill: {
    height:       4,
    borderRadius: BORDER_RADIUS.full,
  },
  progressLabel: { fontSize: FONT_SIZE.xs },

  memoriesWrap:  { marginBottom: SPACING.lg },
  memoryCard: {
    borderRadius:  BORDER_RADIUS.md,
    padding:       SPACING.md,
    marginBottom:  SPACING.sm,
    borderWidth:   1,
  },
  memoryCardTop: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  4,
  },
  memoryCardTitle: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  memoryCardText:  { fontSize: FONT_SIZE.sm, lineHeight: 18 },
  chatPromptBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderRadius:      BORDER_RADIUS.md,
    padding:           SPACING.sm,
    marginTop:         SPACING.xs,
    alignSelf:         'flex-start',
  },
  chatPromptText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.sm,
  },
  sectionLabel: {
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  seeAll: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },

  entryCard: {
    borderRadius:  BORDER_RADIUS.md,
    padding:       SPACING.md,
    marginBottom:  SPACING.sm,
    borderWidth:   1,
  },
  entryTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   4,
  },
  entryDate:    { fontSize: FONT_SIZE.xs },
  moodDot:      { width: 7, height: 7, borderRadius: BORDER_RADIUS.full },
  entryTitle:   { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: 4 },
  entryPreview: { fontSize: FONT_SIZE.sm, lineHeight: 18 },

  emptyEntries: {
    alignItems: 'center',
    padding:    SPACING.xl,
    gap:        SPACING.sm,
  },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  emptySub:   { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },

  centerFabWrap: {
    position:   'absolute',
    bottom:     90,
    left:       0,
    right:      0,
    alignItems: 'center',
  },
  centerFab: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    borderRadius:      BORDER_RADIUS.full,
    paddingVertical:   SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
  },
  centerFabText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },

  cornerFab: {
    position:        'absolute',
    bottom:          90,
    right:           SPACING.md,
    width:           52,
    height:          52,
    borderRadius:    BORDER_RADIUS.full,
    alignItems:      'center',
    justifyContent:  'center',
  },
});