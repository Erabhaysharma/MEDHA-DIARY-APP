import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { supabase } from '../src/lib/supabase';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';

type ActivityStats = {
  total_posts:  number;
  total_likes:  number;
  total_views:  number;
  liked_posts:  number;
};

type UserPost = {
  id:            string;
  caption:       string;
  is_anonymous:  boolean;
  views:         number;
  created_at:    string;
  entry_content: string;
  entry_date:    string;
  mood_label:    string | null;
  likes_count:   number;
};

type PersonStat = {
  id:            string;
  name:          string;
  relationship:  string | null;
  mention_count: number;
  sentiment_avg: number | null;
};

const MOOD_EMOTION: Record<string, string> = {
  amazing: 'Joyful',
  good:    'Content',
  neutral: 'Calm',
  bad:     'Low',
  awful:   'Heavy',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityScreen() {
  const { user }      = useAuth();
  const { colors: C } = useTheme();

  const [stats,   setStats]   = useState<ActivityStats | null>(null);
  const [posts,   setPosts]   = useState<UserPost[]>([]);
  const [people,  setPeople]  = useState<PersonStat[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => { loadAll(); }, [user])
  );

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadPostsAndStats(), loadPeople()]);
    setLoading(false);
  };

  const loadPostsAndStats = async () => {
    if (!user) return;

    // 1. Fetch all my posts
    const postsRes = await supabase
      .from('social_posts')
      .select('id, caption, is_anonymous, views, created_at, entry_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const rawPosts = postsRes.data ?? [];

    // 2. How many posts I liked (separate query)
    const likedRes = await supabase
      .from('post_likes')
      .select('post_id', { count: 'exact' })
      .eq('user_id', user.id);

    // 3. For each post — fetch entry content + like count
    const enriched: UserPost[] = await Promise.all(
      rawPosts.map(async (p) => {
        const [entryRes, likesRes] = await Promise.all([
          supabase
            .from('diary_entries')
            .select('content, entry_date, mood_label')
            .eq('id', p.entry_id)
            .single(),
          supabase
            .from('post_likes')
            .select('post_id', { count: 'exact' })
            .eq('post_id', p.id),
        ]);

        return {
          id:            p.id,
          caption:       p.caption,
          is_anonymous:  p.is_anonymous,
          views:         p.views ?? 0,
          created_at:    p.created_at,
          entry_content: entryRes.data?.content ?? '',
          entry_date:    entryRes.data?.entry_date ?? '',
          mood_label:    entryRes.data?.mood_label ?? null,
          likes_count:   likesRes.count ?? 0,
        };
      })
    );

    setPosts(enriched);

    const totalViews = enriched.reduce((sum, p) => sum + p.views, 0);
    const totalLikes = enriched.reduce((sum, p) => sum + p.likes_count, 0);

    setStats({
      total_posts:  enriched.length,
      total_likes:  totalLikes,
      total_views:  totalViews,
      liked_posts:  likedRes.count ?? 0,
    });
  };

  const loadPeople = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('people')
      .select('id, name, relationship, mention_count, sentiment_avg')
      .eq('user_id', user.id)
      .order('mention_count', { ascending: false })
      .limit(10);
    setPeople(data ?? []);
  };

  const sentimentLabel = (avg: number | null) => {
    if (avg === null) return { label: 'Unknown', color: C.textMuted };
    if (avg >= 0.3)   return { label: 'Positive', color: '#6A9E72' };
    if (avg <= -0.3)  return { label: 'Tense',    color: '#A05252' };
    return                   { label: 'Neutral',  color: '#C8A96E' };
  };

  if (loading) {
    return (
      <SafeAreaView style={[a.safe, { backgroundColor: C.background }]} edges={['top']}>
        <View style={a.loadingWrap}>
          <ActivityIndicator color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const deletePost = async (postId: string) => {
  Alert.alert(
    'Delete post',
    'Remove this diary page from the public feed?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text:    'Delete',
        style:   'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('social_posts')
            .delete()
            .eq('id', postId)
            .eq('user_id', user!.id);

          if (!error) {
            setPosts(prev => prev.filter(p => p.id !== postId));
            // Update stats
            setStats(prev => prev ? {
              ...prev,
              total_posts:  prev.total_posts - 1,
              total_likes:  prev.total_likes - (posts.find(p => p.id === postId)?.likes_count ?? 0),
              total_views:  prev.total_views - (posts.find(p => p.id === postId)?.views ?? 0),
            } : prev);
          } else {
            Alert.alert('Error', 'Could not delete post. Please try again.');
          }
        },
      },
    ]
  );
};

  return (
    <SafeAreaView style={[a.safe, { backgroundColor: C.background }]} edges={['top']}>

      {/* Header */}
      <View style={[a.header, { borderColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={a.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[a.title, { color: C.textPrimary }]}>Activity</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Stats row ── */}
        <Text style={[a.sectionLabel, { color: C.textMuted }]}>Your public diaries</Text>
        <View style={a.statsGrid}>
          {[
            { label: 'Posts',     value: stats?.total_posts ?? 0, icon: 'newspaper-outline'    },
            { label: 'Likes got', value: stats?.total_likes ?? 0, icon: 'heart-outline'        },
            { label: 'Views',     value: stats?.total_views ?? 0, icon: 'eye-outline'          },
            { label: 'You liked', value: stats?.liked_posts ?? 0, icon: 'heart-circle-outline' },
          ].map(s => (
            <View key={s.label} style={[a.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Ionicons name={s.icon as any} size={20} color={C.primary} />
              <Text style={[a.statValue, { color: C.textPrimary }]}>
                {s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}k` : s.value}
              </Text>
              <Text style={[a.statLabel, { color: C.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── My Posts ── */}
        <View style={[a.sectionHeader, { marginTop: 0 }]}>
          <Text style={[a.sectionLabel, { color: C.textMuted }]}>My diary posts</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/social')}>
            <Text style={[a.seeAll, { color: C.primary }]}>View feed</Text>
          </TouchableOpacity>
        </View>

        {posts.length === 0 ? (
          <View style={[a.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="journal-outline" size={32} color={C.textMuted} />
            <Text style={[a.emptyText, { color: C.textMuted }]}>
              You haven't shared any diary pages yet
            </Text>
            <TouchableOpacity
              style={[a.emptyBtn, { backgroundColor: C.primaryFaint, borderColor: C.primary + '40' }]}
              onPress={() => router.push('/(app)/social')}
            >
              <Text style={[a.emptyBtnText, { color: C.primary }]}>Share your first page</Text>
            </TouchableOpacity>
          </View>
        ) : (
          posts.map(post => {
            const emotion = post.mood_label ? MOOD_EMOTION[post.mood_label] : null;
            return (
              <View
                key={post.id}
                style={[a.postCard, { backgroundColor: C.surface, borderColor: C.border }]}
              >
                {/* Diary left margin */}
                <View style={[a.postMargin, { backgroundColor: C.primary }]} />

                <View style={a.postInner}>
                  {/* Top row: date + emotion + anon badge */}
                  <View style={a.postTopRow}>
                    <Text style={[a.postDate, { color: C.textMuted }]}>
                      {post.entry_date
                        ? new Date(post.entry_date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : timeAgo(post.created_at)}
                    </Text>
                    <View style={a.postBadges}>
                      {emotion && (
                        <View style={[a.emotionPill, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}>
                          <Text style={[a.emotionText, { color: C.primary }]}>{emotion}</Text>
                        </View>
                      )}
                      {post.is_anonymous && (
                        <View style={[a.anonPill, { backgroundColor: C.border }]}>
                          <Ionicons name="eye-off-outline" size={10} color={C.textMuted} />
                          <Text style={[a.anonText, { color: C.textMuted }]}>anon</Text>
                        </View>
                      )}

                      <TouchableOpacity
              onPress={() => deletePost(post.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[a.deleteBtn, { backgroundColor: C.error + '15' }]}
            >
              <Ionicons name="trash-outline" size={12} color={C.error} />
            </TouchableOpacity>
                    </View>
                  </View>

                  {/* Entry content preview */}
                  <Text style={[a.postContent, { color: C.textPrimary }]} numberOfLines={4}>
                    "{post.entry_content}"
                  </Text>

                  {/* Caption */}
                  {post.caption ? (
                    <Text style={[a.postCaption, { color: C.textSecondary }]} numberOfLines={2}>
                      {post.caption}
                    </Text>
                  ) : null}

                  {/* Stats row */}
                  <View style={[a.postStats, { borderColor: C.border }]}>
                    <View style={a.postStat}>
                      <Ionicons name="heart" size={14} color="#e05a5a" />
                      <Text style={[a.postStatText, { color: C.textMuted }]}>
                        {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
                      </Text>
                    </View>
                    <View style={a.postStat}>
                      <Ionicons name="eye-outline" size={14} color={C.textMuted} />
                      <Text style={[a.postStatText, { color: C.textMuted }]}>
                        {post.views >= 1000
                          ? `${(post.views / 1000).toFixed(1)}k`
                          : post.views} views
                      </Text>
                    </View>
                    <Text style={[a.postTime, { color: C.textMuted }]}>
                      {timeAgo(post.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* ── People Insights ── */}
        <View style={[a.sectionHeader, { marginTop: SPACING.lg }]}>
          <Text style={[a.sectionLabel, { color: C.textMuted }]}>People in your life</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/people')}>
            <Text style={[a.seeAll, { color: C.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {people.length === 0 ? (
          <View style={[a.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="people-outline" size={32} color={C.textMuted} />
            <Text style={[a.emptyText, { color: C.textMuted }]}>
              People you mention in your diary will appear here
            </Text>
          </View>
        ) : (
          people.map(p => {
            const sent = sentimentLabel(p.sentiment_avg);
            return (
              <TouchableOpacity
                key={p.id}
                style={[a.personCard, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => router.push(`/person/${p.id}`)}
                activeOpacity={0.8}
              >
                <View style={[a.personAvatar, { backgroundColor: C.primaryFaint }]}>
                  <Text style={[a.personInitial, { color: C.primary }]}>
                    {p.name[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={a.personTop}>
                    <Text style={[a.personName, { color: C.textPrimary }]}>{p.name}</Text>
                    {p.relationship && (
                      <View style={[a.relationBadge, { backgroundColor: C.primaryFaint }]}>
                        <Text style={[a.relationText, { color: C.primary }]}>{p.relationship}</Text>
                      </View>
                    )}
                  </View>
                  <View style={a.personMeta}>
                    <Text style={[a.metaText, { color: C.textMuted }]}>
                      {p.mention_count} mention{p.mention_count !== 1 ? 's' : ''}
                    </Text>
                    <View style={[a.sentimentDot, { backgroundColor: sent.color }]} />
                    <Text style={[a.metaText, { color: sent.color }]}>{sent.label}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
            );
          })
        )}

        {/* ── Schedule shortcut ── */}
        <Text style={[a.sectionLabel, { color: C.textMuted, marginTop: SPACING.lg }]}>Planning</Text>
        <TouchableOpacity
          style={[a.scheduleBtn, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => router.push('/(app)/schedule')}
          activeOpacity={0.8}
        >
          <View style={[a.scheduleBtnIcon, { backgroundColor: C.primaryFaint }]}>
            <Ionicons name="calendar-outline" size={20} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[a.scheduleBtnTitle, { color: C.textPrimary }]}>Schedule & Todos</Text>
            <Text style={[a.scheduleBtnSub, { color: C.textMuted }]}>View your AI daily plan</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const a = StyleSheet.create({
  safe:        { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  title:   { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },

  sectionLabel: {
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom:  SPACING.sm,
  },
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.sm,
  },
  seeAll: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },

  // ── Stats ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           SPACING.sm,
    marginBottom:  SPACING.lg,
  },
  statCard: {
    width:         '47%',
    borderRadius:  BORDER_RADIUS.lg,
    borderWidth:   1,
    padding:       SPACING.md,
    alignItems:    'center',
    gap:           4,
  },
  statValue: { fontSize: 24, fontWeight: FONT_WEIGHT.bold },
  statLabel: { fontSize: FONT_SIZE.xs },

  // ── Empty state ──
  emptyCard: {
    borderRadius:  BORDER_RADIUS.lg,
    borderWidth:   1,
    padding:       SPACING.xl,
    alignItems:    'center',
    gap:           SPACING.sm,
    marginBottom:  SPACING.sm,
  },
  emptyText:    { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { borderRadius: BORDER_RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs, marginTop: 4 },
  emptyBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },

  // ── Post cards ──
  postCard: {
    flexDirection:  'row',
    borderRadius:   BORDER_RADIUS.lg,
    borderWidth:    1,
    marginBottom:   SPACING.sm,
    overflow:       'hidden',
  },
  postMargin: { width: 3 },
  postInner:  { flex: 1, padding: SPACING.md },
  postTopRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   6,
  },
  postDate:   { fontSize: 10, fontWeight: FONT_WEIGHT.medium },
  postBadges: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  emotionPill:{
    borderRadius:      BORDER_RADIUS.full,
    borderWidth:       1,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  emotionText: { fontSize: 10, fontWeight: FONT_WEIGHT.medium },
  anonPill:    {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    borderRadius:      BORDER_RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical:   2,
  },
  anonText:    { fontSize: 10 },
  postContent: {
    fontSize:     FONT_SIZE.sm,
    lineHeight:   20,
    fontStyle:    'italic',
    marginBottom: 6,
  },
  postCaption: {
    fontSize:     FONT_SIZE.xs,
    lineHeight:   16,
    marginBottom: 8,
  },
  postStats: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            SPACING.md,
    borderTopWidth: 0.5,
    paddingTop:     SPACING.xs,
    marginTop:      4,
  },
  postStat:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postStatText: { fontSize: FONT_SIZE.xs },
  postTime:     { fontSize: FONT_SIZE.xs, marginLeft: 'auto' },

  // ── People ──
  personCard: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   BORDER_RADIUS.md,
    borderWidth:    1,
    padding:        SPACING.md,
    marginBottom:   SPACING.sm,
    gap:            10,
  },
  personAvatar:  { width: 38, height: 38, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  personInitial: { fontSize: 15, fontWeight: FONT_WEIGHT.bold },
  personTop:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  personName:    { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  relationBadge: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 },
  relationText:  { fontSize: 10, fontWeight: FONT_WEIGHT.medium },
  personMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:      { fontSize: FONT_SIZE.xs },
  sentimentDot:  { width: 5, height: 5, borderRadius: 3 },

  // ── Schedule ──
  scheduleBtn:      { flexDirection: 'row', alignItems: 'center', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md, gap: 12 },
  scheduleBtnIcon:  { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  scheduleBtnTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  scheduleBtnSub:   { fontSize: FONT_SIZE.xs, marginTop: 2 },


  deleteBtn: {
  borderRadius: BORDER_RADIUS.full,
  padding:      4,
},
});