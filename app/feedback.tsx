import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth }  from '../src/contexts/AuthContext';
import { supabase } from '../src/lib/supabase';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';

export default function FeedbackScreen() {
  const { colors: C } = useTheme();
  const { user, profile } = useAuth();

  const [name,     setName]     = useState(profile?.display_name ?? '');
  const [email,    setEmail]    = useState(user?.email ?? '');
  const [message,  setMessage]  = useState('');
  const [type,     setType]     = useState<'bug' | 'feature' | 'general'>('general');
  const [sending,  setSending]  = useState(false);

  const TYPES = [
    { id: 'general', label: 'General',  icon: 'chatbubble-outline'    },
    { id: 'bug',     label: 'Bug',      icon: 'bug-outline'           },
    { id: 'feature', label: 'Feature',  icon: 'bulb-outline'          },
  ] as const;

  const send = async () => {
    if (!message.trim()) {
      Alert.alert('Please write your feedback before sending.');
      return;
    }
    setSending(true);
    try {
      // Store in Supabase feedback table (create this table or use email)
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id,
        name:    name.trim(),
        email:   email.trim(),
        type,
        message: message.trim(),
      });
      if (error) throw error;
      Alert.alert('Thank you!', 'Your feedback has been sent. We read every message.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', 'Could not send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: C.background }]} edges={['top']}>
      <View style={[f.header, { borderColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={f.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[f.title, { color: C.textPrimary }]}>Send Feedback</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[f.subtitle, { color: C.textMuted }]}>
          We read every message and use it to make Medha better for you.
        </Text>

        {/* Type selector */}
        <Text style={[f.label, { color: C.textMuted }]}>Feedback type</Text>
        <View style={f.typeRow}>
          {TYPES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[
                f.typeBtn,
                {
                  backgroundColor: type === t.id ? C.primary       : C.surface,
                  borderColor:     type === t.id ? C.primary        : C.border,
                }
              ]}
              onPress={() => setType(t.id)}
            >
              <Ionicons name={t.icon} size={16} color={type === t.id ? C.background : C.textMuted} />
              <Text style={[f.typeBtnText, { color: type === t.id ? C.background : C.textMuted }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name */}
        <Text style={[f.label, { color: C.textMuted }]}>Your name</Text>
        <TextInput
          style={[f.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={C.textMuted}
        />

        {/* Email */}
        <Text style={[f.label, { color: C.textMuted }]}>Email address</Text>
        <TextInput
          style={[f.input, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={C.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Message */}
        <Text style={[f.label, { color: C.textMuted }]}>Your message</Text>
        <TextInput
          style={[f.textArea, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrimary }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us what's on your mind..."
          placeholderTextColor={C.textMuted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[f.sendBtn, { backgroundColor: C.primary, opacity: sending ? 0.7 : 1 }]}
          onPress={send}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending
            ? <ActivityIndicator color={C.background} size="small" />
            : <>
                <Ionicons name="send-outline" size={18} color={C.background} />
                <Text style={[f.sendBtnText, { color: C.background }]}>Send feedback</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const f = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 0.5 },
  backBtn:   { padding: 4 },
  title:     { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  subtitle:  { fontSize: FONT_SIZE.sm, lineHeight: 20, marginBottom: SPACING.lg },
  label:     { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: SPACING.xs, marginTop: SPACING.md },
  typeRow:   { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  typeBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  typeBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  input:     { borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONT_SIZE.sm },
  textArea:  { borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: FONT_SIZE.sm, minHeight: 140 },
  sendBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.md, marginTop: SPACING.xl },
  sendBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});