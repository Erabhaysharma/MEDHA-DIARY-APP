import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
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
  "Who has been good for me recently?",
  "What patterns do you notice in my life?",
  "What mistakes keep coming up for me?",
  "What should I focus on right now?",
];

function formatSourceDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return dateStr; }
}

function groupSessionsByDate(sessions: ChatSession[]) {
  const groups: { title: string; data: ChatSession[] }[] = [];
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  const todaySessions:     ChatSession[] = [];
  const yesterdaySessions: ChatSession[] = [];
  const olderSessions:     ChatSession[] = [];

  sessions.forEach(s => {
    const d = new Date(s.created_at);
    if (d.toDateString() === today.toDateString())     todaySessions.push(s);
    else if (d.toDateString() === yesterday.toDateString()) yesterdaySessions.push(s);
    else olderSessions.push(s);
  });

  if (todaySessions.length)     groups.push({ title: 'Today',     data: todaySessions });
  if (yesterdaySessions.length) groups.push({ title: 'Yesterday', data: yesterdaySessions });
  if (olderSessions.length)     groups.push({ title: 'Older',     data: olderSessions });
  return groups;
}

export default function ChatScreen() {
  const { profile }   = useAuth();
  const { colors: C } = useTheme();

  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState('');
  const [sessionId,     setSessionId]     = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [initError,     setInitError]     = useState<string | null>(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [sessions,      setSessions]      = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const flatListRef  = useRef<FlatList>(null);
  const isStreaming  = useRef(false);
  const slideAnim    = useRef(new Animated.Value(-300)).current;

  useFocusEffect(useCallback(() => {
    if (!sessionId) initSession();
  }, [sessionId]));

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  // Animate sidebar
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue:         sidebarOpen ? 0 : -300,
      duration:        250,
      useNativeDriver: true,
    }).start();
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
      setInitError(e.message || 'Could not connect to Medha.');
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setSidebarOpen(false);
  };

  const loadSession = async (session: ChatSession) => {
    setSidebarOpen(false);
    setSessionId(session.session_id);
    const history = await getChatHistory(session.session_id);
    const msgs: Message[] = history.map((m, i) => ({
      ...m,
      id: `${m.role}-${i}`,
    }));
    setMessages(msgs);
  };

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || !sessionId || isStreaming.current) return;

    setInput('');
    isStreaming.current = true;
    setLoading(true);

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: messageText };
    const assistantId = `assistant-${Date.now()}`;
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
            ? { ...m, content: 'Sorry, something went wrong. Try again.', loading: false }
            : m
        ));
        isStreaming.current = false;
        setLoading(false);
      },
    });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageWrap, isUser && styles.messageWrapUser]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: C.primaryFaint, borderColor: C.primary }]}>
            <Text style={[styles.avatarText, { color: C.primary }]}>
              {profile?.ai_name?.[0] ?? 'M'}
            </Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser
            ? { backgroundColor: C.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderBottomLeftRadius: 4 },
        ]}>
          {item.loading && item.content === '' ? (
            <View style={styles.typingWrap}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={[styles.typingText, { color: C.textMuted }]}>thinking...</Text>
            </View>
          ) : (
            <Text style={[styles.bubbleText, { color: isUser ? C.background : C.textPrimary }]}>
              {item.content}
            </Text>
          )}
          {item.sources && item.sources.length > 0 && (
            <View style={[styles.sourcesWrap, { borderTopColor: C.border }]}>
              <Text style={[styles.sourcesLabel, { color: C.textMuted }]}>from your diary:</Text>
              <View style={styles.sourceChips}>
                {item.sources.map((date, idx) => (
                  <View key={idx} style={[styles.sourceChip, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}>
                    <Ionicons name="book-outline" size={10} color={C.primary} />
                    <Text style={[styles.sourceChipText, { color: C.primary }]}>
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={[styles.kav, { backgroundColor: C.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: C.border, backgroundColor: C.background }]}>
          {/* Sidebar toggle */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => setSidebarOpen(true)}
          >
            <Ionicons name="menu" size={20} color={C.primary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.headerAvatar, { backgroundColor: C.primaryFaint, borderColor: C.primary }]}>
              <Text style={[styles.headerAvatarText, { color: C.primary }]}>
                {profile?.ai_name?.[0] ?? 'M'}
              </Text>
            </View>
            <View>
              <Text style={[styles.headerName, { color: C.textPrimary }]}>
                {profile?.ai_name ?? 'Medha'}
              </Text>
              <Text style={[styles.headerSub, { color: C.textMuted }]}>your personal companion</Text>
            </View>
          </View>

          {/* New chat */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={startNewChat}
          >
            <Ionicons name="add" size={20} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Error banner ── */}
        {initError && (
          <View style={[styles.errorBanner, { backgroundColor: C.error + '20' }]}>
            <Text style={[styles.errorText, { color: C.error }]}>{initError}</Text>
            <TouchableOpacity onPress={() => { setInitError(null); setSessionId(null); initSession(); }}>
              <Text style={[styles.errorRetry, { color: C.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Messages / Empty state ── */}
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.welcomeAvatar, { backgroundColor: C.primaryFaint, borderColor: C.primary }]}>
              <Text style={[styles.welcomeAvatarText, { color: C.primary }]}>
                {profile?.ai_name?.[0] ?? 'M'}
              </Text>
            </View>
            <Text style={[styles.welcomeTitle, { color: C.textPrimary }]}>
              Hi {profile?.display_name?.split(' ')[0] ?? 'there'}
            </Text>
            <Text style={[styles.welcomeSub, { color: C.textMuted }]}>
              I know you. Ask me anything about your life.
            </Text>
            <View style={styles.suggestionsWrap}>
              {SUGGESTIONS.map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.suggestionChip, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => sendMessage(suggestion)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.suggestionText, { color: C.textSecondary }]}>{suggestion}</Text>
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
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* ── Input bar ── */}
        <View style={[styles.inputWrap, { borderTopColor: C.border, backgroundColor: C.background }]}>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
            placeholder={`Ask ${profile?.ai_name ?? 'Medha'} anything...`}
            placeholderTextColor={C.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn, { backgroundColor: C.primary },
              (!input.trim() || loading || !sessionId) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading || !sessionId}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator size="small" color={C.background} />
              : <Ionicons name="arrow-up" size={18} color={C.background} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Sidebar overlay ── */}
      {sidebarOpen && (
        <Pressable
          style={styles.overlay}
          onPress={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar panel ── */}
      <Animated.View
        style={[
          styles.sidebar,
          { backgroundColor: C.background, borderRightColor: C.border },
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          {/* Sidebar header */}
          <View style={[styles.sidebarHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.sidebarTitle, { color: C.textPrimary }]}>Chats</Text>
            <TouchableOpacity
              style={[styles.newChatSideBtn, { backgroundColor: C.primary }]}
              onPress={startNewChat}
            >
              <Ionicons name="add" size={16} color={C.background} />
              <Text style={[styles.newChatSideBtnText, { color: C.background }]}>New chat</Text>
            </TouchableOpacity>
          </View>

          {/* Sessions list */}
          {loadingSessions ? (
            <ActivityIndicator style={{ marginTop: SPACING.lg }} color={C.primary} />
          ) : sessions.length === 0 ? (
            <View style={styles.sidebarEmpty}>
              <Ionicons name="chatbubbles-outline" size={32} color={C.textMuted} />
              <Text style={[styles.sidebarEmptyText, { color: C.textMuted }]}>
                No previous chats
              </Text>
            </View>
          ) : (
            <FlatList
              data={grouped}
              keyExtractor={g => g.title}
              renderItem={({ item: group }) => (
                <View>
                  <Text style={[styles.groupTitle, { color: C.textMuted }]}>
                    {group.title}
                  </Text>
                  {group.data.map(session => (
                    <TouchableOpacity
                      key={session.session_id}
                      style={[
                        styles.sessionItem,
                        { borderBottomColor: C.border },
                        session.session_id === sessionId && { backgroundColor: C.primaryFaint },
                      ]}
                      onPress={() => loadSession(session)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubble-outline" size={14} color={C.textMuted} />
                      <Text
                        style={[styles.sessionTitle, { color: C.textPrimary }]}
                        numberOfLines={1}
                      >
                        {session.title || session.last_message || 'Chat'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      </Animated.View>

    </SafeAreaView>
  );
}

const SIDEBAR_WIDTH = 280;

const styles = StyleSheet.create({
  safe:  { flex: 1 },
  kav:   { flex: 1 },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 1,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerAvatar: {
    width: 36, height: 36, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  headerAvatarText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  headerName:       { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  headerSub:        { fontSize: FONT_SIZE.xs },
  iconBtn: {
    padding: 8, borderRadius: BORDER_RADIUS.full, borderWidth: 1,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm,
  },
  errorText:  { fontSize: FONT_SIZE.xs, flex: 1 },
  errorRetry: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  welcomeAvatar: {
    width: 64, height: 64, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, marginBottom: SPACING.md,
  },
  welcomeAvatarText: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold },
  welcomeTitle:      { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.xs },
  welcomeSub:        { fontSize: FONT_SIZE.sm, marginBottom: SPACING.lg, textAlign: 'center' },
  suggestionsWrap:   { width: '100%', gap: SPACING.sm },
  suggestionChip:    { borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, borderWidth: 1 },
  suggestionText:    { fontSize: FONT_SIZE.sm },

  messageList:     { padding: SPACING.md, paddingBottom: SPACING.xl },
  messageWrap:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: SPACING.md, gap: SPACING.sm },
  messageWrapUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 28, height: 28, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0,
  },
  avatarText:  { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  bubble:      { maxWidth: '80%', borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm },
  bubbleText:  { fontSize: FONT_SIZE.md, lineHeight: 22 },
  typingWrap:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, padding: SPACING.xs },
  typingText:  { fontSize: FONT_SIZE.sm },
  sourcesWrap: { marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1 },
  sourcesLabel:{ fontSize: FONT_SIZE.xs, marginBottom: 4 },
  sourceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sourceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  sourceChipText: { fontSize: 10, fontWeight: FONT_WEIGHT.medium },

  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: SPACING.sm, padding: SPACING.md, borderTopWidth: 1,
    paddingBottom: Platform.OS === 'android' ? SPACING.lg : SPACING.md,
  },
  input: {
    flex: 1, borderRadius: BORDER_RADIUS.lg, borderWidth: 1,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md, maxHeight: 120,
  },
  sendBtn:         { width: 40, height: 40, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },

  // Sidebar
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  sidebar: {
    position:    'absolute',
    top:         0,
    left:        0,
    bottom:      0,
    width:       SIDEBAR_WIDTH,
    zIndex:      20,
    borderRightWidth: 1,
  },
  sidebarHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        SPACING.md,
    borderBottomWidth: 1,
  },
  sidebarTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  newChatSideBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  newChatSideBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  sidebarEmpty:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  sidebarEmptyText:{ fontSize: FONT_SIZE.sm },
  groupTitle: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.6, paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md, paddingBottom: SPACING.xs,
  },
  sessionItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  sessionTitle: { fontSize: FONT_SIZE.sm, flex: 1 },
});