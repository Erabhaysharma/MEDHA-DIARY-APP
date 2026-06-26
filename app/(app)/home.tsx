import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
  Animated, Keyboard, Dimensions, PanResponder, Image,Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import React from 'react';
import Svg, {
  Path, Defs, LinearGradient, Stop,
  Circle, Line, Text as SvgText,
} from 'react-native-svg';

import { useAuth }  from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { supabase } from '../../src/lib/supabase';
import { DiaryEntry } from '../../src/types/database';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';
import {
  fetchMemoryCards, fetchUserMemories,
  fetchTrends, MemoryCard, UserMemory, Trend,
} from '../../src/Services/memoryService';

// ─── Constants ────────────────────────────────────────────────────────────────
const MEMORY_UNLOCK_AT = 5;
const SCREEN_W         = Dimensions.get('window').width;
const CARD_W           = SCREEN_W - SPACING.md * 2;
const GRAPH_W          = CARD_W - SPACING.md * 2 - 16;
const GRAPH_H          = 110;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr: string): string {
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAD_LEFT  = 32;  // y-axis label space
const PAD_RIGHT = 8;
const PAD_TOP   = 5;
const PAD_BOT   = 17;  // x-axis label space

// ─── Graph builder ────────────────────────────────────────────────────────────
function buildGraph(points: { date: string; value: number }[], w: number, h: number) {
  if (points.length < 2) return null;

  const plotW  = w - PAD_LEFT - PAD_RIGHT;
  const plotH  = h - PAD_TOP  - PAD_BOT;

  // Always use 1-10 scale for consistency
  const coords = points.map((p, i) => ({
    x: PAD_LEFT + (i / (points.length - 1)) * plotW,
    y: PAD_TOP  + (1 - (p.value - 1) / 8) * plotH,
    value: p.value,
    date:  p.date,
  }));

  // Smooth bezier path
  let linePath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpx  = ((prev.x + curr.x) / 2).toFixed(1);
    linePath  += ` C ${cpx} ${prev.y.toFixed(1)} ${cpx} ${curr.y.toFixed(1)} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  const last    = coords[coords.length - 1];
  const first   = coords[0];
  const fillPath = linePath
    + ` L ${last.x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)}`
    + ` L ${first.x.toFixed(1)} ${(PAD_TOP + plotH).toFixed(1)} Z`;

  // Y axis grid lines at 2, 4, 6, 8, 10
  const yLines = [2, 4, 6, 8, 10].map(v => ({
    v,
    y: PAD_TOP + (1 - (v - 1) / 9) * plotH,
  }));

  // X axis labels — show max 4 evenly spaced
  const xLabels: { label: string; x: number }[] = [];
  const step = Math.max(1, Math.floor(points.length / 4));
  for (let i = 0; i < points.length; i += step) {
    xLabels.push({
      label: new Date(points[i].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      x:     coords[i].x,
    });
  }
  // Always include last
  if (xLabels[xLabels.length - 1]?.label !== new Date(points[points.length - 1].date)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })) {
    xLabels.push({
      label: new Date(points[points.length - 1].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      x:     last.x,
    });
  }

  return { linePath, fillPath, coords, last, yLines, xLabels, plotH };
}

// ─── SVG Graph ────────────────────────────────────────────────────────────────
function TrendSVG({ trend, width, height }: {
  trend: Trend; width: number; height: number;
}) {
  const graph  = buildGraph(trend.points, width, height);
  const gradId = `grd_${trend.key}`;
  const plotH  = height - PAD_TOP - PAD_BOT;

  if (!graph) {
    // Empty state — dashed flat line at midpoint
    const midY = PAD_TOP + plotH / 2;
    return (
      <Svg width={width} height={height}>
        {/* Y axis */}
        <Line
          x1={PAD_LEFT} y1={PAD_TOP}
          x2={PAD_LEFT} y2={PAD_TOP + plotH}
          stroke="#333" strokeWidth={0.5}
        />
        {/* Flat dashed line */}
        <Line
          x1={PAD_LEFT} y1={midY}
          x2={width - PAD_RIGHT} y2={midY}
          stroke="#444" strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        {/* "No data" label */}
        <SvgText
          x={width / 2} y={midY - 8}
          textAnchor="middle"
          fontSize={10} fill="#555"
        >
          Write diary to see trends
        </SvgText>
      </Svg>
    );
  }

  const { linePath, fillPath, coords, last, yLines, xLabels } = graph;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={trend.color} stopOpacity="0.35" />
          <Stop offset="1"   stopColor={trend.color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>

      {/* Y axis grid lines + labels */}
      {yLines.map(({ v, y }) => (
        <React.Fragment key={v}>
          <Line
            x1={PAD_LEFT} y1={y.toFixed(1)}
            x2={width - PAD_RIGHT} y2={y.toFixed(1)}
            stroke="#2a2a2a" strokeWidth={0.5}
          />
          <SvgText
            x={PAD_LEFT - 4} y={(y + 4).toFixed(1)}
            textAnchor="end"
            fontSize={9} fill="#555"
          >
            {v}
          </SvgText>
        </React.Fragment>
      ))}

      {/* Y axis line */}
      <Line
        x1={PAD_LEFT} y1={PAD_TOP}
        x2={PAD_LEFT} y2={PAD_TOP + plotH}
        stroke="#333" strokeWidth={0.7}
      />

      {/* Fill area */}
      <Path d={fillPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <Path
        d={linePath}
        fill="none"
        stroke={trend.color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points — small dots */}
      {coords.map((c, i) => (
        <Circle key={i} cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} r={2.5} fill={trend.color} opacity={0.6} />
      ))}

      {/* Last point — highlighted */}
      <Circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r={5}  fill={trend.color} />
      <Circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r={9}  fill={trend.color} opacity={0.2} />

      {/* Last value label */}
      <SvgText
        x={(last.x + 12).toFixed(1)} y={(last.y + 4).toFixed(1)}
        fontSize={10} fill={trend.color} fontWeight="bold"
      >
        {last.value}
      </SvgText>

      {/* X axis labels */}
      {xLabels.map(({ label, x }, i) => (
        <SvgText
          key={i}
          x={x.toFixed(1)}
          y={(PAD_TOP + plotH + 16).toFixed(1)}
          textAnchor="middle"
          fontSize={9} fill="#555"
        >
          {label}
        </SvgText>
      ))}

      {/* X axis line */}
      <Line
        x1={PAD_LEFT} y1={(PAD_TOP + plotH).toFixed(1)}
        x2={(width - PAD_RIGHT).toFixed(1)} y2={(PAD_TOP + plotH).toFixed(1)}
        stroke="#333" strokeWidth={0.5}
      />
    </Svg>
  );
}

// ─── Trend Card ───────────────────────────────────────────────────────────────
function TrendCard({ trend, colors: C }: { trend: Trend; colors: any }) {
  const trendIcon  = trend.trend === 'up' ? '↑' : trend.trend === 'down' ? '↓' : '→';
  const trendColor = trend.trend === 'up'   ? '#6A9E72'
                   : trend.trend === 'down' ? '#A05252'
                   : C.textMuted;
  const trendLabel = trend.trend === 'up'   ? 'Growing'
                   : trend.trend === 'down' ? 'Declining'
                   : 'Stable';

  return (
    <View style={[tc.card, { backgroundColor: C.surface, borderColor: C.border, width: CARD_W }]}>

      {/* Header */}
      <View style={tc.header}>
        <View style={tc.left}>
          <Text style={tc.emoji}>{trend.emoji}</Text>
          <View>
            <Text style={[tc.label, { color: C.textPrimary }]}>{trend.label}</Text>
            <Text style={[tc.sub,   { color: C.textMuted   }]}>
              {trend.points.length > 0
                ? `${trend.points.length} data points`
                : 'No entries yet'}
            </Text>
          </View>
        </View>

        {/* Score + trend badge */}
        <View style={tc.right}>
          {trend.points.length > 0 ? (
            <>
              <Text style={[tc.score, { color: trend.color }]}>
                {trend.latest}<Text style={[tc.scoreOf, { color: C.textMuted }]}>/10</Text>
              </Text>
              <View style={[tc.trendBadge, { backgroundColor: trendColor + '20', borderColor: trendColor + '40' }]}>
                <Text style={[tc.trendText, { color: trendColor }]}>
                  {trendIcon} {trendLabel}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[tc.sub, { color: C.textMuted }]}>–/10</Text>
          )}
        </View>
      </View>

      {/* Avg strip */}
      {trend.points.length > 0 && (
        <View style={[tc.avgStrip, { backgroundColor: trend.color + '12', borderColor: trend.color + '25' }]}>
          <Text style={[tc.avgText, { color: trend.color }]}>
            Average score: {trend.avg}/10
          </Text>
        </View>
      )}

      {/* Graph */}
      <View style={tc.graphWrap}>
        <TrendSVG trend={trend} width={GRAPH_W} height={GRAPH_H} />
      </View>
    </View>
  );
}

// ─── Trend Graphs Section ─────────────────────────────────────────────────────
const EMPTY_TRENDS: Trend[] = [
  { key: 'mood_happiness', label: 'Mood & Happiness', emoji: '😊', color: '#C8A96E', gradient: '#A88B52', points: [], avg: 0, trend: 'flat', latest: 0 },
  { key: 'productivity',   label: 'Productivity',     emoji: '⚡', color: '#5A8AAE', gradient: '#3A6A8E', points: [], avg: 0, trend: 'flat', latest: 0 },
  { key: 'health',         label: 'Health Score',     emoji: '❤️', color: '#9E7A9E', gradient: '#7E5A7E', points: [], avg: 0, trend: 'flat', latest: 0 },
  { key: 'learning',       label: 'Learning Growth',  emoji: '📚', color: '#6A9E72', gradient: '#4A7A52', points: [], avg: 0, trend: 'flat', latest: 0 },
  { key: 'career',         label: 'Career Growth',    emoji: '💼', color: '#C87A52', gradient: '#A85A32', points: [], avg: 0, trend: 'flat', latest: 0 },
];

function TrendGraphs({ colors: C, totalEntries }: { colors: any; totalEntries: number }) {
  const [trends,      setTrends]      = useState<Trend[]>(EMPTY_TRENDS);
  const [loading,     setLoading]     = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      if (totalEntries >= 2) load();
    }, [totalEntries])
  );

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchTrends();
      if (result.has_data && result.trends.length > 0) {
        setTrends(result.trends);
      }
    } catch (e: any) {
      console.warn('Trend load error:', e?.message);
    } finally {
      setLoading(false);
    }
  };

  const onScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    setActiveIndex(Math.max(0, Math.min(idx, trends.length - 1)));
  };

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <View style={h.sectionRow}>
        <Text style={[h.sectionLabel, { color: C.textMuted }]}>Life Trends</Text>
        {loading
          ? <ActivityIndicator size="small" color={C.primary} />
          : totalEntries < 2
            ? <Text style={[h.sectionHint, { color: C.textMuted }]}>2+ entries to unlock</Text>
            : null
        }
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {trends.map(t => (
          <TrendCard key={t.key} trend={t} colors={C} />
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={h.dotsRow}>
        {trends.map((t, i) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => {
              scrollRef.current?.scrollTo({ x: i * CARD_W, animated: true });
              setActiveIndex(i);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <View style={[
              h.dot,
              {
                backgroundColor: i === activeIndex ? trends[i].color : C.border,
                width:           i === activeIndex ? 20 : 6,
              }
            ]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
// ─── Medha Memory Cards (AI generated) ───────────────────────────────────────
function MedhaMemories({ colors: C, totalEntries, onOpen }: {
  colors: any; totalEntries: number; onOpen: (card: MemoryCard) => void;
}) {
  const { user }              = useAuth();
  const [cards,   setCards]   = useState<MemoryCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (totalEntries >= MEMORY_UNLOCK_AT) load();
    }, [user?.id, totalEntries])
  );

  const load = async () => {
    setLoading(true);
    setError(false);
    setCards([]);
    try {
      const result = await fetchMemoryCards();
      if (result.unlocked && Array.isArray(result.cards)) {
        const valid = result.cards.filter(
          c => c.title?.trim() && c.summary?.trim() && c.emoji && c.color
        );
        setCards(valid);
      }
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  };

  if (totalEntries < MEMORY_UNLOCK_AT) return null;

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <View style={h.sectionRow}>
        <Text style={[h.sectionLabel, { color: C.textMuted }]}>Medha Remembers</Text>
        {error && (
          <TouchableOpacity onPress={load}>
            <Text style={[h.sectionHint, { color: C.primary }]}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{
              width: 156, height: 180, borderRadius: BORDER_RADIUS.xl,
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
            }} />
          ))}
        </ScrollView>
      )}

      {!loading && error && (
        <TouchableOpacity
          onPress={load}
          style={[h.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          <Ionicons name="refresh-outline" size={20} color={C.primary} />
          <Text style={[h.emptyText, { color: C.textMuted }]}>Couldn't load. Tap to retry.</Text>
        </TouchableOpacity>
      )}

      {!loading && !error && cards.length === 0 && (
        <View style={[h.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="sparkles-outline" size={22} color={C.primary} />
          <Text style={[h.emptyText, { color: C.textMuted }]}>
            Keep writing — Medha is building your memory patterns
          </Text>
        </View>
      )}

      {cards.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm, paddingRight: SPACING.sm }}
          decelerationRate="fast"
          snapToInterval={164}
          snapToAlignment="start"
        >
          {cards.map(card => (
            <TouchableOpacity
              key={card.id}
              onPress={() => onOpen(card)}
              activeOpacity={0.85}
              style={{
                width: 156, height: 180, borderRadius: BORDER_RADIUS.xl,
                backgroundColor: card.color, padding: SPACING.md,
                justifyContent: 'space-between', overflow: 'hidden',
              }}
            >
              <View style={{
                position: 'absolute', top: -20, right: -20,
                width: 100, height: 100, borderRadius: 50,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }} />
              <Text style={{ fontSize: 32 }}>{card.emoji}</Text>
              <View>
                <Text style={{
                  fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold,
                  color: '#fff', lineHeight: 20, marginBottom: 4,
                }} numberOfLines={2}>
                  {card.title}
                </Text>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: FONT_WEIGHT.medium }}>
                  {card.date_range}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── User Memories ────────────────────────────────────────────────────────────
function UserMemories({ colors: C, onOpen }: {
  colors: any; onOpen: (mem: UserMemory) => void;
}) {
  const { user }               = useAuth();
  const [mems, setMems]        = useState<UserMemory[]>([]);
  const [loading, setLoading]  = useState(false);

  useFocusEffect(
    useCallback(() => { load(); }, [user?.id])
  );

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserMemories(user.id);
      setMems(data);
    } catch (e) {
      console.warn('User memories load error:', e);
    }
    setLoading(false);
  };

  const deleteMemory = async (memId: string) => {
  Alert.alert(
    'Delete memory',
    'Remove this memory permanently?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text:    'Delete',
        style:   'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('memories')
            .delete()
            .eq('id', memId)
            .eq('user_id', user!.id);

          if (!error) {
            setMems(prev => prev.filter(m => m.id !== memId));
          } else {
            Alert.alert('Error', 'Could not delete memory. Please try again.');
          }
        },
      },
    ]
  );
};

  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <View style={h.sectionRow}>
        <Text style={[h.sectionLabel, { color: C.textMuted }]}>Your Memories</Text>
        <TouchableOpacity onPress={() => router.push('/add-memory')}>
          <Text style={[h.sectionHint, { color: C.primary }]}>+ Add</Text>
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
       {mems.map(mem => (
  <View   // ← change TouchableOpacity to View here, touch is handled inside
    key={mem.id}
    style={{
      width:           148,
      backgroundColor: C.surface,
      borderRadius:    BORDER_RADIUS.lg,
      borderWidth:     1,
      borderColor:     C.border,
      overflow:        'hidden',
    }}
  >
    {/* Tappable area opens memory */}
    <TouchableOpacity
      onPress={() => onOpen(mem)}
      activeOpacity={0.85}
    >
      {mem.photo_url ? (
        <Image
          source={{ uri: mem.photo_url }}
          style={{ width: '100%', height: 100 }}
          resizeMode="cover"
        />
      ) : (
        <View style={{
          width: '100%', height: 100,
          backgroundColor: C.primaryFaint,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="image-outline" size={28} color={C.primary} />
        </View>
      )}
      <View style={{ padding: SPACING.xs }}>
        <Text style={{
          fontSize: FONT_SIZE.xs, color: C.textPrimary,
          fontWeight: FONT_WEIGHT.medium, lineHeight: 16,
        }} numberOfLines={2}>
          {mem.description}
        </Text>
        <Text style={{ fontSize: 10, color: C.primary, marginTop: 3, fontWeight: FONT_WEIGHT.medium }}>
          {new Date(mem.memory_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </TouchableOpacity>

    {/* Delete button — top right corner */}
    <TouchableOpacity
      onPress={() => deleteMemory(mem.id)}
      style={{
        position:        'absolute',
        top:             6,
        right:           6,
        width:           24,
        height:          24,
        borderRadius:    12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      <Ionicons name="close" size={14} color="#fff" />
    </TouchableOpacity>
  </View>
))}

        <TouchableOpacity
          onPress={() => router.push('/add-memory')}
          activeOpacity={0.8}
          style={{
            width: 148, height: 160, backgroundColor: C.surface,
            borderRadius: BORDER_RADIUS.lg, borderWidth: 1,
            borderColor: C.primary + '40', borderStyle: 'dashed',
            alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
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

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { profile, refreshProfile } = useAuth();
  const { colors: C }               = useTheme();

  const MOOD_COLOR: Record<string, string> = {
    amazing: C.moodAmazing,
    good:    C.moodGood,
    neutral: C.moodNeutral,
    bad:     C.moodBad,
    awful:   C.moodAwful,
  };

  const [entries,       setEntries]       = useState<DiaryEntry[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<DiaryEntry[] | null>(null);

  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchRef  = useRef<TextInput>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) router.push('/(app)/social');
      },
    })
  ).current;

  useFocusEffect(useCallback(() => { fetchEntries(); }, []));

  const fetchEntries = async () => {
    setLoading(true);
    await refreshProfile();
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('is_deleted', false)
      .order('entry_date', { ascending: false })
      .limit(10);
    if (!error && data) setEntries(data);
    setLoading(false);
  };

  const openSearch = () => {
    setSearchOpen(true);
    Animated.spring(searchAnim, { toValue: 1, useNativeDriver: false, tension: 80, friction: 10 })
      .start(() => searchRef.current?.focus());
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults(null);
    Animated.spring(searchAnim, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 })
      .start(() => setSearchOpen(false));
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

  const openAiCard = (card: MemoryCard) => {
    router.push({
      pathname: '/memory-detail',
      params: {
        type: 'ai', title: card.title, emoji: card.emoji,
        color: card.color, emotion: card.emotion,
        summary: card.summary, insight: card.insight,
        date: card.date_range, description: card.summary,
      },
    });
  };

  const openUserMemory = (mem: UserMemory) => {
    router.push({
      pathname: '/memory-detail',
      params: {
        type: 'user', title: 'My Memory',
        description: mem.description,
        photo_url: mem.photo_url ?? '',
        date: mem.memory_date,
      },
    });
  };

  const totalEntries  = profile?.total_entries ?? entries.length;
  const memoriesLocked = totalEntries < MEMORY_UNLOCK_AT;
  const entriesNeeded  = MEMORY_UNLOCK_AT - totalEntries;
  const progressPct    = Math.min((totalEntries / MEMORY_UNLOCK_AT) * 100, 100);
  const firstName      = profile?.display_name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView
      style={[h.safe, { backgroundColor: C.background }]}
      edges={['top']}
      {...panResponder.panHandlers}
    >
      <ScrollView
        style={h.scroll}
        contentContainerStyle={h.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── 1. Top bar ── */}
        <View style={h.topbar}>
          {!searchOpen ? (
            <View style={h.greetingWrap}>
              <Text style={[h.greeting,    { color: C.textPrimary }]}>
                {getGreeting()}, {firstName}
              </Text>
              <Text style={[h.subGreeting, { color: C.textMuted }]}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                {totalEntries > 0 ? ` · ${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'}` : ''}
              </Text>
            </View>
          ) : (
            <Animated.View style={[
              h.searchBar,
              { opacity: searchAnim, backgroundColor: C.surface, borderColor: C.primary }
            ]}>
              <Ionicons name="search-outline" size={16} color={C.textMuted} />
              <TextInput
                ref={searchRef}
                style={[h.searchInput, { color: C.textPrimary }]}
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

          <View style={h.topbarRight}>
            <TouchableOpacity
              style={[h.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={searchOpen ? closeSearch : openSearch}
            >
              <Ionicons
                name={searchOpen ? 'close' : 'search-outline'}
                size={20}
                color={searchOpen ? C.primary : C.textSecondary}
              />
            </TouchableOpacity>
            {!searchOpen && (
              <>
                <TouchableOpacity
                  style={[h.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => router.push('/account')}
                >
                  <Ionicons name="person-circle-outline" size={24} color={C.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[h.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => router.push('/add-memory')}
                >
                  <Ionicons name="images-outline" size={20} color={C.primary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Search results overlay ── */}
        {searchOpen && searchResults !== null && (
          <View style={{ marginBottom: SPACING.md }}>
            <Text style={[h.sectionLabel, { color: C.textMuted, marginBottom: SPACING.sm }]}>
              {searchResults.length === 0
                ? 'No results found'
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'}`}
            </Text>
            {searchResults.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={[h.entryCard, { backgroundColor: C.surface, borderColor: C.border }]}
                activeOpacity={0.8}
                onPress={() => { closeSearch(); router.push(`/entry/${entry.id}`); }}
              >
                <View style={h.entryTop}>
                  <Text style={[h.entryDate, { color: C.textMuted }]}>{formatDate(entry.entry_date)}</Text>
                  {entry.mood_label && (
                    <View style={[h.moodDot, { backgroundColor: MOOD_COLOR[entry.mood_label] ?? C.textMuted }]} />
                  )}
                </View>
                <Text style={[h.entryTitle,   { color: C.textPrimary }]} numberOfLines={1}>
                  {entry.title ?? entry.content.slice(0, 50)}
                </Text>
                <Text style={[h.entryPreview, { color: C.textMuted }]} numberOfLines={2}>
                  {entry.content}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {searchOpen && searchResults === null && (
          <View style={h.searchHint}>
            <Ionicons name="search-outline" size={32} color={C.textMuted} />
            <Text style={[h.searchHintText, { color: C.textMuted }]}>
              Search by title, date, person or incident
            </Text>
          </View>
        )}

        {/* ── Main content (hidden during search) ── */}
        {!searchOpen && (
          <>
            {/* ── 2. Life Trend Graphs ── */}
            <TrendGraphs colors={C} totalEntries={totalEntries} />

            {/* ── Memory locked progress card ── */}
            {memoriesLocked && (
              <View style={[h.lockedCard, { backgroundColor: C.surface, borderColor: C.primaryFaint }]}>
                <View style={h.lockedTop}>
                  <View style={[h.lockedIcon, { backgroundColor: C.primaryFaint }]}>
                    <Ionicons name="hardware-chip-outline" size={20} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[h.lockedTitle, { color: C.textPrimary }]}>Memories take time</Text>
                    <Text style={[h.lockedSub,   { color: C.textMuted   }]}>
                      {entriesNeeded} more {entriesNeeded === 1 ? 'entry' : 'entries'} until{' '}
                      {profile?.ai_name ?? 'Medha'} starts remembering
                    </Text>
                  </View>
                </View>
                <View style={[h.progressBg, { backgroundColor: C.overlay }]}>
                  <View style={[h.progressFill, { width: `${progressPct}%`, backgroundColor: C.primary }]} />
                </View>
                <Text style={[h.progressLabel, { color: C.textMuted }]}>
                  {totalEntries} of {MEMORY_UNLOCK_AT} entries written
                </Text>
              </View>
            )}

            {/* ── 3. Medha AI Memory Cards ── */}
            <MedhaMemories
              colors={C}
              totalEntries={totalEntries}
              onOpen={openAiCard}
            />

            {/* ── 4. User Memories ── */}
            <UserMemories
              colors={C}
              onOpen={openUserMemory}
            />

            {/* ── 5. Recent Diary Entries ── */}
            <View style={h.sectionRow}>
              <Text style={[h.sectionLabel, { color: C.textMuted }]}>Recent entries</Text>
              {entries.length > 3 && (
                <TouchableOpacity onPress={() => router.push('/(app)/diary')}>
                  <Text style={[h.sectionHint, { color: C.primary }]}>See all</Text>
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <ActivityIndicator color={C.primary} style={{ marginTop: SPACING.lg }} />
            ) : entries.length === 0 ? (
              <View style={h.emptyEntries}>
                <Ionicons name="journal-outline" size={36} color={C.textMuted} />
                <Text style={[h.emptyTitle, { color: C.textPrimary }]}>Your story starts here</Text>
                <Text style={[h.emptySub,   { color: C.textMuted   }]}>
                  Write your first diary entry and begin building your memory
                </Text>
              </View>
            ) : (
              entries.slice(0, 3).map(entry => (
                <TouchableOpacity
                  key={entry.id}
                  style={[h.entryCard, { backgroundColor: C.surface, borderColor: C.border }]}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                >
                  <View style={h.entryTop}>
                    <Text style={[h.entryDate, { color: C.textMuted }]}>
                      {formatDate(entry.entry_date)}
                    </Text>
                    {entry.mood_label && (
                      <View style={[h.moodDot, { backgroundColor: MOOD_COLOR[entry.mood_label] ?? C.textMuted }]} />
                    )}
                  </View>
                  <Text style={[h.entryTitle,   { color: C.textPrimary }]} numberOfLines={1}>
                    {entry.title ?? entry.content.slice(0, 50)}
                  </Text>
                  <Text style={[h.entryPreview, { color: C.textMuted   }]} numberOfLines={2}>
                    {entry.content}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      {!searchOpen && (
        memoriesLocked ? (
          <View style={h.fabCenterWrap}>
            <TouchableOpacity
              style={[h.fabCenter, { backgroundColor: C.primary }]}
              onPress={() => router.push('/new-entry')}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={16} color={C.background} />
              <Text style={[h.fabCenterText, { color: C.background }]}>Write today's entry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[h.fabCorner, { backgroundColor: C.primary }]}
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

const tc = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth:  1,
    padding:      SPACING.md,
    marginRight:  0,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.sm,
  },
  left:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  emoji: { fontSize: 24 },
  label: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  sub:   { fontSize: FONT_SIZE.xs, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },

  score:    { fontSize: 22, fontWeight: FONT_WEIGHT.bold },
  scoreOf:  { fontSize: 12, fontWeight: FONT_WEIGHT.medium },

  trendBadge: {
    borderRadius:      BORDER_RADIUS.full,
    borderWidth:       1,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  trendText: { fontSize: 11, fontWeight: FONT_WEIGHT.semibold },

  avgStrip: {
    borderRadius:  BORDER_RADIUS.md,
    borderWidth:   1,
    paddingVertical:   5,
    paddingHorizontal: 10,
    marginBottom:  SPACING.sm,
    alignSelf:     'flex-start',
  },
  avgText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },

  graphWrap: { marginHorizontal: -4 },
});

// ─── Home Styles ──────────────────────────────────────────────────────────────
const h = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { padding: SPACING.md },

  // Topbar
  topbar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg, minHeight: 48 },
  greetingWrap:{ flex: 1 },
  greeting:    { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  subGreeting: { fontSize: FONT_SIZE.sm, marginTop: 2 },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn:     { padding: 8, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  searchBar:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 8, borderWidth: 1, marginRight: 8 },
  searchInput: { flex: 1, fontSize: FONT_SIZE.sm, padding: 0 },
  searchHint:  { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md },
  searchHintText: { fontSize: FONT_SIZE.sm, textAlign: 'center' },

  // Section headers
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionHint:  { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },

  // Dots
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: SPACING.sm },
  dot:     { height: 6, borderRadius: 3 },

  // Memory locked
  lockedCard:  { borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, marginBottom: SPACING.lg },
  lockedTop:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  lockedIcon:  { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  lockedSub:   { fontSize: FONT_SIZE.xs, marginTop: 2 },
  progressBg:  { height: 4, borderRadius: BORDER_RADIUS.full, marginBottom: SPACING.xs },
  progressFill:{ height: 4, borderRadius: BORDER_RADIUS.full },
  progressLabel:{ fontSize: FONT_SIZE.xs },

  // Empty states
  emptyCard:   { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md, alignItems: 'center', gap: SPACING.xs, flexDirection: 'row', marginBottom: SPACING.sm },
  emptyText:   { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: 16 },
  emptyEntries:{ alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle:  { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  emptySub:    { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },

  // Entry cards
  entryCard:   { borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1 },
  entryTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  entryDate:   { fontSize: FONT_SIZE.xs },
  moodDot:     { width: 7, height: 7, borderRadius: BORDER_RADIUS.full },
  entryTitle:  { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: 4 },
  entryPreview:{ fontSize: FONT_SIZE.sm, lineHeight: 18 },

  // FAB
  fabCenterWrap:{ position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center' },
  fabCenter:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.sm + 2, paddingHorizontal: SPACING.lg },
  fabCenterText:{ fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  fabCorner:    { position: 'absolute', bottom: 90, right: SPACING.md, width: 52, height: 52, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
});