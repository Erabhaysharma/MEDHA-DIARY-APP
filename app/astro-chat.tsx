import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';
import {
  getDailyForecast, sendAstroMessage,
  getAstroProfile, updateAstroLanguage, AstroProfile,
} from '../src/Services/astroService';

type Message = {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
};

// ─── Settings Sheet ───────────────────────────────────────────────────────────
function SettingsSheet({
  visible, onClose, profile, onLanguageChange, onEditBirth, colors: C,
}: {
  visible:          boolean;
  onClose:          () => void;
  profile:          AstroProfile | null;
  onLanguageChange: (lang: 'hindi' | 'english') => void;
  onEditBirth:      () => void;
  colors:           any;
}) {
  const isHindi     = profile?.astro_language === 'hindi';
  const editsLeft   = Math.max(0, 2 - (profile?.astro_edit_count ?? 0));
  const canEdit     = editsLeft > 0;

  const handleEditBirth = () => {
    if (!canEdit) {
      Alert.alert(
        'Edit Limit Reached',
        'You have used both your allowed birth info edits. Your kundli is now locked for accuracy.',
        [{ text: 'OK' }]
      );
      return;
    }
    Alert.alert(
      'Edit Birth Information',
      `You can edit your birth details ${editsLeft} more time${editsLeft > 1 ? 's' : ''}. This affects your kundli and all future readings. Are you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', style: 'destructive', onPress: () => { onClose(); onEditBirth(); } },
      ]
    );
  };

  const handleLanguageToggle = (val: boolean) => {
    const lang = val ? 'hindi' : 'english';
    onLanguageChange(lang);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[st.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
        <View style={[st.handle, { backgroundColor: C.border }]} />

        {/* Header */}
        <View style={st.sheetHeader}>
          <Text style={[st.sheetTitle, { color: C.textPrimary }]}>Astro Medha Settings</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Language toggle */}
        <View style={[st.settingRow, { borderColor: C.border }]}>
          <View style={[st.settingIcon, { backgroundColor: C.primaryFaint }]}>
            <Text style={{ fontSize: 16 }}>🌐</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.settingLabel, { color: C.textPrimary }]}>
              {isHindi ? 'भाषा — हिंदी' : 'Language — English'}
            </Text>
            <Text style={[st.settingDesc, { color: C.textMuted }]}>
              {isHindi
                ? 'Astro Medha हिंदी में जवाब देगी'
                : 'Astro Medha replies in English'}
            </Text>
          </View>
          <View style={st.toggleWrap}>
            <Text style={[st.toggleLabel, { color: C.textMuted }]}>EN</Text>
            <Switch
              value={isHindi}
              onValueChange={handleLanguageToggle}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor={C.background}
            />
            <Text style={[st.toggleLabel, { color: C.primary }]}>हि</Text>
          </View>
        </View>

        {/* Edit birth info */}
        <TouchableOpacity
          style={[st.settingRow, { borderColor: C.border, opacity: canEdit ? 1 : 0.5 }]}
          onPress={handleEditBirth}
          activeOpacity={0.8}
        >
          <View style={[st.settingIcon, { backgroundColor: canEdit ? C.primaryFaint : C.border }]}>
            <Ionicons
              name="create-outline"
              size={18}
              color={canEdit ? C.primary : C.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.settingLabel, { color: C.textPrimary }]}>
              {isHindi ? 'जन्म जानकारी बदलें' : 'Edit Birth Information'}
            </Text>
            <Text style={[st.settingDesc, { color: C.textMuted }]}>
              {canEdit
                ? (isHindi
                    ? `आप ${editsLeft} बार और बदल सकते हैं`
                    : `${editsLeft} edit${editsLeft > 1 ? 's' : ''} remaining`)
                : (isHindi
                    ? 'दोनों बार उपयोग हो चुके हैं · कुंडली लॉक है'
                    : 'Both edits used · Kundli is now locked')}
            </Text>
          </View>
          <View style={st.editRight}>
            {canEdit ? (
              <View style={[st.editsBadge, { backgroundColor: C.primaryFaint }]}>
                <Text style={[st.editsBadgeText, { color: C.primary }]}>
                  {editsLeft} left
                </Text>
              </View>
            ) : (
              <Ionicons name="lock-closed-outline" size={16} color={C.textMuted} />
            )}
            <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Birth info summary */}
        {profile?.zodiac_sign && (
          <View style={[st.birthSummary, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={[st.birthSummaryTitle, { color: C.textMuted }]}>
              {isHindi ? 'आपकी कुंडली' : 'Your Kundli'}
            </Text>
            <View style={st.birthRow}>
              <Text style={[st.birthLabel, { color: C.textMuted }]}>
                {isHindi ? 'राशि' : 'Rashi (Sun sign)'}
              </Text>
              <Text style={[st.birthValue, { color: C.textPrimary }]}>
                {profile.zodiac_sign}
              </Text>
            </View>
            {profile.birth_place && (
              <View style={st.birthRow}>
                <Text style={[st.birthLabel, { color: C.textMuted }]}>
                  {isHindi ? 'जन्म स्थान' : 'Birth place'}
                </Text>
                <Text style={[st.birthValue, { color: C.textPrimary }]}>
                  {profile.birth_place}
                </Text>
              </View>
            )}
            {profile.birth_time && profile.birth_time !== 'unknown' && (
              <View style={st.birthRow}>
                <Text style={[st.birthLabel, { color: C.textMuted }]}>
                  {isHindi ? 'जन्म समय' : 'Birth time'}
                </Text>
                <Text style={[st.birthValue, { color: C.textPrimary }]}>
                  {profile.birth_time}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 20 }} />
      </View>
    </Modal>
  );
}

// ─── Main Chat Screen ─────────────────────────────────────────────────────────
export default function AstroChatScreen() {
  const { colors: C } = useTheme();
  const { user }      = useAuth();

  const [profile,      setProfile]      = useState<AstroProfile | null>(null);
  const [forecast,     setForecast]     = useState<string | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [sessionId,    setSessionId]    = useState<string | null>(null);
  const [loadingFc,    setLoadingFc]    = useState(true);
  const [showForecast, setShowForecast] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const listRef = useRef<FlatList>(null);
  const isHindi = profile?.astro_language === 'hindi';

  useFocusEffect(
    useCallback(() => { loadInitial(); }, [user])
  );

  const loadInitial = async () => {
    setLoadingFc(true);
    try {
      const [p, fc] = await Promise.all([getAstroProfile(), getDailyForecast()]);
      setProfile(p);
      setForecast(fc.forecast);
    } catch (e) {
      console.warn('astro load error', e);
    }
    setLoadingFc(false);
  };

  const handleLanguageChange = async (lang: 'hindi' | 'english') => {
    // Optimistic update
    setProfile(prev => prev ? { ...prev, astro_language: lang } : prev);
    try {
      await updateAstroLanguage(lang);
      // Reload forecast in new language
      const fc = await getDailyForecast();
      setForecast(fc.forecast);
    } catch (e) {
      console.warn('language update error', e);
      // Revert
      setProfile(prev => prev ? { ...prev, astro_language: lang === 'hindi' ? 'english' : 'hindi' } : prev);
    }
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);

    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMsg }]);

    try {
      const res = await sendAstroMessage({ session_id: sessionId, message: userMsg });
      if (!sessionId) setSessionId(res.session_id);
      setMessages(prev => [...prev, {
        id:      Date.now().toString(),
        role:    'assistant',
        content: res.reply,
      }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages(prev => [...prev, {
        id:      Date.now().toString(),
        role:    'assistant',
        content: isHindi
          ? 'अभी तारे शांत हैं। थोड़ी देर बाद फिर पूछें। 🌙'
          : 'The stars are quiet right now. Please try again in a moment. 🌙',
      }]);
    } finally {
      setSending(false);
    }
  };

  const QUICK_EN = [
    'How will my day go today?',
    'What does my career path look like?',
    'When will I find love?',
    'What are my strengths this month?',
    'Should I take this new opportunity?',
  ];
  const QUICK_HI = [
    'आज मेरा दिन कैसा रहेगा?',
    'मेरा करियर कैसा होगा?',
    'मेरी शादी कब होगी?',
    'इस महीने मेरे लिए क्या अच्छा है?',
    'क्या मुझे यह नया मौका लेना चाहिए?',
  ];
  const quickQuestions = isHindi ? QUICK_HI : QUICK_EN;

  const disclaimerHindi = 'ज्योतिष के आधार पर · सुनिश्चित परिणाम नहीं';
  const disclaimerEngl  = 'Based on astrological patterns · not guaranteed outcomes';

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser      = item.role === 'user';
    const hasDisclaim = isHindi
      ? item.content.includes('सुनिश्चित परिणाम नहीं')
      : item.content.includes('Not guaranteed outcomes');
    const mainText = item.content
      .replace(/_ज्योतिष के अनुसार.*?।_/g, '')
      .replace(/_Astro Medha.*?outcomes\._/g, '')
      .trim();

    return (
      <View style={[
        mc.msgWrap,
        isUser ? mc.msgWrapUser : mc.msgWrapBot,
      ]}>
        {!isUser && (
          <View style={[mc.botAvatar, { backgroundColor: C.primaryFaint }]}>
            <Text style={{ fontSize: 14 }}>🔮</Text>
          </View>
        )}
        <View style={{ flex: 1, maxWidth: '85%' }}>
          <View style={[
            mc.bubble,
            isUser
              ? [mc.bubbleUser, { backgroundColor: C.primary }]
              : [mc.bubbleBot, { backgroundColor: C.surface, borderColor: C.border }],
          ]}>
            <Text style={[mc.bubbleText, { color: isUser ? C.background : C.textPrimary }]}>
              {mainText}
            </Text>
          </View>
          {hasDisclaim && !isUser && (
            <Text style={[mc.disclaimer, { color: C.textMuted }]}>
              ⚠ {isHindi ? disclaimerHindi : disclaimerEngl}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loadingFc) {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 36, marginBottom: SPACING.md }}>🔮</Text>
        <ActivityIndicator color={C.primary} />
        <Text style={[{ color: C.textMuted, fontSize: FONT_SIZE.sm, marginTop: SPACING.sm }]}>
          {isHindi ? 'आपकी कुंडली पढ़ी जा रही है...' : 'Reading your stars...'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: C.background }]} edges={['top']}>

      {/* Header */}
      <View style={[ac.header, { borderColor: C.border }]}>
        <TouchableOpacity onPress={() => router.replace('/(app)/home')} style={ac.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={ac.headerCenter}>
          <Text style={[ac.headerTitle, { color: C.textPrimary }]}>
            {isHindi ? 'ज्योतिष मेधा' : 'Astro Medha'}
          </Text>
          <Text style={[ac.headerSub, { color: C.primary }]}>
            {profile?.zodiac_sign ?? ''} · {isHindi ? 'प्रीमियम' : 'Premium'}
          </Text>
        </View>
        <View style={ac.headerRight}>
          <TouchableOpacity
            onPress={() => setShowForecast(v => !v)}
            style={[ac.iconBtn, { backgroundColor: C.primaryFaint }]}
          >
            <Text style={{ fontSize: 15 }}>🌅</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSettingsOpen(true)}
            style={[ac.iconBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
          >
            <Ionicons name="settings-outline" size={17} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Daily forecast card */}
      {showForecast && forecast && (
        <View style={[ac.forecastCard, { backgroundColor: C.surface, borderColor: C.primary + '30' }]}>
          <View style={ac.forecastHeader}>
            <Text style={[ac.forecastTitle, { color: C.primary }]}>
              {isHindi ? '🌅 आज की राशिफल' : '🌅 Today\'s Rasiphal'}
            </Text>
            <TouchableOpacity onPress={() => setShowForecast(false)}>
              <Ionicons name="chevron-up" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[ac.forecastText, { color: C.textPrimary }]} numberOfLines={4}>
            {forecast}
          </Text>
          <TouchableOpacity onPress={() => setShowForecast(false)}>
            <Text style={[ac.forecastReadMore, { color: C.primary }]}>
              {isHindi ? 'छुपाएं ↑' : 'Hide ↑'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={i => i.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.sm }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={ac.emptyWrap}>
              <Text style={[ac.emptyTitle, { color: C.textPrimary }]}>
                {isHindi ? 'ज्योतिष मेधा से पूछें' : 'Ask Astro Medha anything'}
              </Text>
              <Text style={[ac.emptySub, { color: C.textMuted }]}>
                {isHindi
                  ? 'आपकी कुंडली, आपकी डायरी, आपका भविष्य —\nसब एक जगह'
                  : 'Your stars, your diary, your future —\nall in one conversation.'}
              </Text>
              <View style={ac.quickWrap}>
                {quickQuestions.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[ac.quickBtn, { backgroundColor: C.surface, borderColor: C.border }]}
                    onPress={() => setInput(q)}
                  >
                    <Text style={[ac.quickText, { color: C.textPrimary }]}>{q}</Text>
                    <Ionicons name="arrow-forward" size={14} color={C.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />

        {/* Input */}
        <View style={[ac.inputRow, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TextInput
            style={[ac.input, { color: C.textPrimary }]}
            placeholder={isHindi ? 'अपना सवाल पूछें...' : 'Ask about your future...'}
            placeholderTextColor={C.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            onPress={send}
            disabled={!input.trim() || sending}
            style={[ac.sendBtn, { backgroundColor: input.trim() ? C.primary : C.border }]}
          >
            {sending
              ? <ActivityIndicator size="small" color={C.background} />
              : <Ionicons name="send" size={16} color={input.trim() ? C.background : C.textMuted} />
            }
          </TouchableOpacity>
        </View>

        {/* Disclaimer bar */}
        <View style={[ac.disclaimerBar, { backgroundColor: C.surface }]}>
          <Ionicons name="information-circle-outline" size={12} color={C.textMuted} />
          <Text style={[ac.disclaimerText, { color: C.textMuted }]}>
            {isHindi ? disclaimerHindi : disclaimerEngl}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Settings Sheet */}
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onLanguageChange={handleLanguageChange}
        onEditBirth={() => router.push('/astro-onboarding')}
        colors={C}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const mc = StyleSheet.create({
  msgWrap:     { flexDirection: 'row', marginBottom: SPACING.sm, gap: 8 },
  msgWrapUser: { justifyContent: 'flex-end' },
  msgWrapBot:  { justifyContent: 'flex-start', alignItems: 'flex-end' },
  botAvatar:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble:      { borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm },
  bubbleUser:  { borderBottomRightRadius: 4 },
  bubbleBot:   { borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText:  { fontSize: FONT_SIZE.sm, lineHeight: 22 },
  disclaimer:  { fontSize: 10, marginTop: 4, lineHeight: 14 },
});

const ac = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 0.5 },
  backBtn:      { padding: 4 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle:  { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  headerSub:    { fontSize: 10, fontWeight: FONT_WEIGHT.semibold },
  headerRight:  { flexDirection: 'row', gap: 6 },
  iconBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  forecastCard:    { margin: SPACING.md, marginBottom: 0, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  forecastHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  forecastTitle:   { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, textTransform: 'uppercase', letterSpacing: 0.8 },
  forecastText:    { fontSize: FONT_SIZE.sm, lineHeight: 20, marginBottom: 4 },
  forecastReadMore:{ fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium, marginTop: 4 },

  emptyWrap:  { alignItems: 'center', paddingTop: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, textAlign: 'center' },
  emptySub:   { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },
  quickWrap:  { width: '100%', gap: SPACING.xs, marginTop: SPACING.md },
  quickBtn:   { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickText:  { fontSize: FONT_SIZE.sm, flex: 1 },

  inputRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: SPACING.sm, borderTopWidth: 0.5 },
  input:      { flex: 1, fontSize: FONT_SIZE.sm, maxHeight: 80, padding: 0 },
  sendBtn:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  disclaimerBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 5, paddingBottom: Platform.OS === 'android' ? 10 : 5 },
  disclaimerText: { fontSize: 10 },
});

const st = StyleSheet.create({
  sheet: {
    borderTopLeftRadius:  BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding:     SPACING.md,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: SPACING.md,
  },
  sheetHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   SPACING.lg,
  },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },

  settingRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            12,
    paddingVertical: SPACING.md,
    borderBottomWidth: 0.5,
  },
  settingIcon:  { width: 38, height: 38, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, marginBottom: 2 },
  settingDesc:  { fontSize: FONT_SIZE.xs, lineHeight: 16 },

  toggleWrap:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },

  editRight:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editsBadge:      { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  editsBadgeText:  { fontSize: 11, fontWeight: FONT_WEIGHT.bold },

  birthSummary: {
    borderRadius:  BORDER_RADIUS.lg,
    borderWidth:   1,
    padding:       SPACING.md,
    marginTop:     SPACING.md,
    gap:           6,
  },
  birthSummaryTitle: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  birthRow:          { flexDirection: 'row', justifyContent: 'space-between' },
  birthLabel:        { fontSize: FONT_SIZE.xs },
  birthValue:        { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
});