import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Pressable, BackHandler, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth }  from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import {
  createChatSession, streamChat, getChatSessions,
  getChatHistory, ChatMessage, ChatSession,
} from '../../src/Services/chatService';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';

interface Message extends ChatMessage {
  id:       string;
  sources?: string[];
  loading?: boolean;
}

const SUGGESTIONS = [
  "How have I been feeling lately?",
  "Who has been most important to me?",
  "What patterns do you notice?",
  "What should I focus on right now?",
  "What mistakes keep coming up?",
];

function formatSourceDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

function groupSessionsByDate(sessions: ChatSession[]) {
  const groups: { title: string; data: ChatSession[] }[] = [];
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todaySessions:     ChatSession[] = [];
  const yesterdaySessions: ChatSession[] = [];
  const olderSessions:     ChatSession[] = [];

  sessions.forEach(s => {
    const d = new Date(s.created_at);
    if (d.toDateString() === today.toDateString())         todaySessions.push(s);
    else if (d.toDateString() === yesterday.toDateString()) yesterdaySessions.push(s);
    else                                                    olderSessions.push(s);
  });

  if (todaySessions.length)     groups.push({ title: 'Today',     data: todaySessions });
  if (yesterdaySessions.length) groups.push({ title: 'Yesterday', data: yesterdaySessions });
  if (olderSessions.length)     groups.push({ title: 'Earlier',   data: olderSessions });
  return groups;
}

// ─── Typing dots animation ────────────────────────────────────────────────────
function TypingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );

    const a1 = anim(dot1, 0);
    const a2 = anim(dot2, 150);
    const a3 = anim(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width:  7,
    height: 7,
    borderRadius: 4,
    backgroundColor: color,
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4, paddingHorizontal: 2 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { profile }    = useAuth();
  const { colors: C }  = useTheme();
  const insets         = useSafeAreaInsets();

  const [messages,        setMessages]        = useState<Message[]>([]);
  const [input,           setInput]           = useState('');
  const [sessionId,       setSessionId]       = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [initError,       setInitError]       = useState<string | null>(null);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [sessions,        setSessions]        = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const flatListRef  = useRef<FlatList>(null);
  const isStreaming  = useRef(false);
  const slideAnim    = useRef(new Animated.Value(-300)).current;
  const overlayAnim  = useRef(new Animated.Value(0)).current;

  // ── Android back → home ──
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sidebarOpen) { setSidebarOpen(false); return true; }
      router.replace('/(app)/home');
      return true;
    });
    return () => sub.remove();
  }, [sidebarOpen]);

  useFocusEffect(useCallback(() => {
    if (!sessionId) initSession();
  }, [sessionId]));

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  // Sidebar animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: sidebarOpen ? 0 : -300,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: sidebarOpen ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
    if (sidebarOpen) loadSessions();
  }, [sidebarOpen]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    const data = await getChatSessions();
    setSessions(data);
    setLoadingSessions(false);
  };

  const initSession = async () => {
    try {
      setInitError(null);
      const id = await createChatSession();
      setSessionId(id);
    } catch (e: any) {
      setInitError(e.message || 'Could not connect.');
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setSidebarOpen(false);
    setTimeout(() => initSession(), 100);
  };

  const loadSession = async (session: ChatSession) => {
    setSidebarOpen(false);
    setSessionId(session.session_id);
    const history = await getChatHistory(session.session_id);
    setMessages(history.map((m, i) => ({ ...m, id: `${m.role}-${i}` })));
  };

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || !sessionId || isStreaming.current) return;

    setInput('');
    isStreaming.current = true;
    setLoading(true);

    const userMsg: Message      = { id: `user-${Date.now()}`, role: 'user', content: messageText };
    const assistantId            = `assistant-${Date.now()}`;
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', loading: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    const history: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));

    await streamChat({
      session_id: sessionId,
      message:    messageText,
      history,
      onToken: (token) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: m.content + token, loading: false } : m
        ));
      },
      onDone: (sources) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, sources, loading: false } : m
        ));
        isStreaming.current = false;
        setLoading(false);
      },
      onError: () => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Please try again.', loading: false }
            : m
        ));
        isStreaming.current = false;
        setLoading(false);
      },
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[
        s.msgRow,
        isUser ? s.msgRowUser : s.msgRowBot,
        index === 0 && { marginTop: SPACING.lg },
      ]}>
        {/* Bot avatar */}
        {!isUser && (
          <View style={[s.botAvatar, { backgroundColor: C.primaryFaint }]}>
            <Text style={[s.botAvatarText, { color: C.primary }]}>
              {profile?.ai_name?.[0] ?? 'M'}
            </Text>
          </View>
        )}

        <View style={[s.msgContent, isUser && s.msgContentUser]}>
          {/* Bubble */}
          <View style={[
            s.bubble,
            isUser
              ? [s.bubbleUser, { backgroundColor: C.primary }]
              : [s.bubbleBot],
          ]}>
            {item.loading && item.content === '' ? (
              <TypingDots color={C.primary} />
            ) : (
              <Text style={[
                s.bubbleText,
                { color: isUser ? '#fff' : C.textPrimary },
              ]}>
                {item.content}
              </Text>
            )}
          </View>

          {/* Source chips */}
          {item.sources && item.sources.length > 0 && (
            <View style={s.sources}>
              <Text style={[s.sourcesLabel, { color: C.textMuted }]}>
                From your diary
              </Text>
              <View style={s.sourceChips}>
                {item.sources.map((date, i) => (
                  <View key={i} style={[s.chip, { backgroundColor: C.primaryFaint }]}>
                    <Ionicons name="book-outline" size={10} color={C.primary} />
                    <Text style={[s.chipText, { color: C.primary }]}>
                      {formatSourceDate(date)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const grouped = groupSessionsByDate(sessions);
  const aiName  = profile?.ai_name ?? 'Medha';
return (
  <View style={[s.root, { backgroundColor: C.background }]}>
    <StatusBar barStyle={C.background === '#fff' ? 'dark-content' : 'light-content'} />

    {/* Top safe area only */}
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header ── */}
        <View style={[s.header, { borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => router.replace('/(app)/home')}
            style={s.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.headerCenter}
            onPress={() => setSidebarOpen(true)}
            activeOpacity={0.7}
          >
            <View style={[s.headerAvatar, { backgroundColor: C.primaryFaint }]}>
              <Text style={[s.headerAvatarText, { color: C.primary }]}>
                {aiName[0]}
              </Text>
            </View>
            <View>
              <Text style={[s.headerName, { color: C.textPrimary }]}>{aiName}</Text>
              <Text style={[s.headerSub,  { color: C.textMuted   }]}>your diary companion</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={C.textMuted} style={{ marginLeft: 2 }} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={startNewChat}
            style={s.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={22} color={C.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Error banner ── */}
        {initError && (
          <View style={[s.errorBanner, { backgroundColor: C.error + '15' }]}>
            <Ionicons name="alert-circle-outline" size={14} color={C.error} />
            <Text style={[s.errorText, { color: C.error }]}>{initError}</Text>
            <TouchableOpacity onPress={() => { setInitError(null); initSession(); }}>
              <Text style={[s.errorRetry, { color: C.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Messages / Empty state ── */}
        {messages.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyAvatar, { backgroundColor: C.primaryFaint }]}>
              <Text style={[s.emptyAvatarText, { color: C.primary }]}>{aiName[0]}</Text>
            </View>
            <Text style={[s.emptyGreeting, { color: C.textPrimary }]}>
              Hi {profile?.display_name?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={[s.emptySub, { color: C.textMuted }]}>
              I know your story. Ask me anything.
            </Text>
            <View style={s.suggestions}>
              {SUGGESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => sendMessage(q)}
                  activeOpacity={0.5}
                  style={[s.suggestion, { borderColor: C.border + '40' }]}
                >
                  <Text style={[s.suggestionText, { color: C.textSecondary }]}>{q}</Text>
                  <Ionicons name="arrow-forward" size={13} color={C.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        {/* ── Input bar — bottom safe area handled manually ── */}
        <View style={[
          s.inputBar,
          {
            borderColor:     C.border,
            backgroundColor: C.background,
            paddingBottom:   insets.bottom > 0 ? insets.bottom : SPACING.md,
          }
        ]}>
          <View style={[s.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
            <TextInput
              style={[s.input, { color: C.textPrimary }]}
              placeholder={`Message ${aiName}...`}
              placeholderTextColor={C.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                { backgroundColor: input.trim() ? C.primary : C.border },
              ]}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading || !sessionId}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-up" size={16} color="#fff" />
              }
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>

    {/* ── Sidebar overlay ── */}
    {sidebarOpen && (
      <Pressable
        style={[s.overlay]}
        onPress={() => setSidebarOpen(false)}
      />
    )}

    {/* ── Sidebar panel ── */}
    <Animated.View style={[
      s.sidebar,
      { backgroundColor: C.background, borderRightColor: C.border },
      { transform: [{ translateX: slideAnim }] },
    ]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[s.sidebarHeader, { borderColor: C.border }]}>
          <Text style={[s.sidebarTitle, { color: C.textPrimary }]}>History</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={startNewChat}
              style={[s.newChatBtn, { backgroundColor: C.primary }]}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={s.newChatBtnText}>New chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSidebarOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[s.closeBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            >
              <Ionicons name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {loadingSessions ? (
          <ActivityIndicator style={{ marginTop: SPACING.xl }} color={C.primary} />
        ) : sessions.length === 0 ? (
          <View style={s.sidebarEmpty}>
            <Ionicons name="chatbubbles-outline" size={36} color={C.textMuted} />
            <Text style={[s.sidebarEmptyText, { color: C.textMuted }]}>No chats yet</Text>
          </View>
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={g => g.title}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: group }) => (
              <View>
                <Text style={[s.groupLabel, { color: C.textMuted }]}>{group.title}</Text>
                {group.data.map(session => (
                  <TouchableOpacity
                    key={session.session_id}
                    style={[
                      s.sessionItem,
                      { borderColor: C.border },
                      session.session_id === sessionId && { backgroundColor: C.primaryFaint },
                    ]}
                    onPress={() => loadSession(session)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={14}
                      color={session.session_id === sessionId ? C.primary : C.textMuted}
                    />
                    <Text
                      style={[
                        s.sessionTitle,
                        { color: session.session_id === sessionId ? C.primary : C.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {session.title || session.last_message || 'Chat'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </Animated.View>

  </View>
);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const SIDEBAR_W = 280;

const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   10,
    borderBottomWidth: 0.5,
  },
  headerBtn:        { padding: 4, width: 36, alignItems: 'center' },
  headerCenter:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerAvatar:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  headerName:       { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, textAlign: 'center' },
  headerSub:        { fontSize: 10, textAlign: 'center' },

  // Error
  errorBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: SPACING.md,
    paddingVertical:   8,
  },
  errorText:  { flex: 1, fontSize: FONT_SIZE.xs },
  errorRetry: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

  // Empty state
  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyAvatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyAvatarText: { fontSize: 26, fontWeight: FONT_WEIGHT.bold },
  emptyGreeting:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginBottom: 6 },
  emptySub:        { fontSize: FONT_SIZE.sm, marginBottom: SPACING.xl, textAlign: 'center', lineHeight: 20 },

  // Suggestions — clean, no card background
  suggestions: { width: '100%', gap: 2 },
  suggestion:  {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderColor:    'rgba(150,150,150,0.15)',
  },
  suggestionText: { fontSize: FONT_SIZE.sm, flex: 1, lineHeight: 20 },

  // Messages
  msgList: {   paddingHorizontal: SPACING.md,
  paddingTop:        SPACING.md,
  paddingBottom:     SPACING.md,},

  msgRow:     { flexDirection: 'row', marginBottom: 20, gap: 10 },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgRowBot:  { alignItems: 'flex-start' },

  botAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  botAvatarText: { fontSize: 12, fontWeight: FONT_WEIGHT.bold },

  msgContent:     { flex: 1, alignItems: 'flex-start' },
  msgContentUser: { alignItems: 'flex-end' },

  bubble: { maxWidth: '88%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleBot:  { borderBottomLeftRadius:  4 },
  bubbleText: { fontSize: FONT_SIZE.md, lineHeight: 24 },

  // Sources
  sources:      { marginTop: 6, paddingLeft: 4 },
  sourcesLabel: { fontSize: 11, marginBottom: 5 },
  sourceChips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    borderRadius:      BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  chipText: { fontSize: 10, fontWeight: FONT_WEIGHT.medium },

  inputWrap: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    borderRadius:      24,
    borderWidth:       1,
    paddingLeft:       16,
    paddingRight:      6,
    paddingVertical:   6,
    gap:               6,
  },
  input: {
    flex:      1,
    fontSize:  FONT_SIZE.md,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
    paddingBottom: 4,
  },
  sendBtn: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    marginBottom:   1,
  },

  // Sidebar overlay
 overlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(0,0,0,0.45)',
  zIndex: 15,   // ← between main content (0) and sidebar (20)
},

  // Sidebar
  sidebar: {
    position:         'absolute',
    top:              0,
    left:             0,
    bottom:           0,
    width:            SIDEBAR_W,
    zIndex:           20,
    borderRightWidth: 0.5,
  },
  sidebarHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 0.5,
  },
  sidebarTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  newChatBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    borderRadius:      BORDER_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  newChatBtnText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },

  sidebarEmpty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            SPACING.sm,
  },
  sidebarEmptyText: { fontSize: FONT_SIZE.sm },

  groupLabel: {
    fontSize:          FONT_SIZE.xs,
    fontWeight:        FONT_WEIGHT.semibold,
    letterSpacing:     0.5,
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.md,
    paddingBottom:     SPACING.xs,
    textTransform:     'uppercase',
  },
  sessionItem: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical:   12,
    borderBottomWidth: 0.5,
  },
  sessionTitle: { flex: 1, fontSize: FONT_SIZE.sm },
  closeBtn: {
  width:          32,
  height:         32,
  borderRadius:   16,
  borderWidth:    1,
  alignItems:     'center',
  justifyContent: 'center',
},
inputBar: {
  paddingHorizontal: SPACING.md,
  paddingTop:        10,
  borderTopWidth:    0.5,
  // paddingBottom handled inline with insets
},

});