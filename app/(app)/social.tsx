import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput,
  Modal, KeyboardAvoidingView, Platform,ScrollView,
  Dimensions, ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';
import { supabase } from '../../src/lib/supabase';
import {
  fetchFeed, toggleLike, incrementView,
  scoreDiary,DiaryScore,
  fetchComments, addComment, createPost,generateContent
} from '../../src/Services/socialService';
import { SocialPost, PostComment, DiaryEntry, MoodLabel } from '../../src/types/database'
import { Clipboard } from 'react-native';

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

//const { width: window.width } = Dimensions.get('window');



// NEW — add SCREEN_W
const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
// ─── Comment Sheet ────────────────────────────────────────────────────────────
function CommentSheet({
  postId, visible, onClose, colors: C,
}: {
  postId: string; visible: boolean; onClose: () => void; colors: any;
}) {
  const { user } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible && postId) {
      fetchComments(postId).then(setComments).catch(() => {});
    }
  }, [visible, postId]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const c = await addComment(postId, text.trim());
      setComments(prev => [...prev, c]);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[cs.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[cs.sheetHandle, { backgroundColor: C.border }]} />
          <Text style={[cs.sheetTitle, { color: C.textPrimary }]}>Comments</Text>
          <FlatList
            data={comments}
            keyExtractor={i => i.id}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <View style={cs.commentRow}>
                <View style={[cs.commentAvatar, { backgroundColor: C.primaryFaint }]}>
                  <Text style={[cs.commentInitial, { color: C.primary }]}>
                    {(item.display_name ?? 'A')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[cs.commentName, { color: C.textMuted }]}>
                    {item.display_name ?? 'Anonymous'}
                  </Text>
                  <Text style={[cs.commentText, { color: C.textPrimary }]}>{item.content}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[cs.emptyComments, { color: C.textMuted }]}>No comments yet. Be the first.</Text>
            }
          />
          <View style={[cs.commentInput, { borderColor: C.border, backgroundColor: C.background }]}>
            <TextInput
              style={[cs.commentBox, { color: C.textPrimary }]}
              placeholder="Write a comment..."
              placeholderTextColor={C.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity onPress={send} disabled={!text.trim() || sending}>
              <Ionicons name="send" size={20} color={text.trim() ? C.primary : C.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────


function ShareModal({
  visible, onClose, onShared, colors: C,
}: {
  visible: boolean; onClose: () => void; onShared: () => void; colors: any;
}) {
  const { user } = useAuth();
  const [entries,    setEntries]    = useState<DiaryEntry[]>([]);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [caption,    setCaption]    = useState('');
  const [anonymous,  setAnonymous]  = useState(false);
  const [step,       setStep]       = useState<1 | 2 | 3>(1);
  const [sharing,    setSharing]    = useState(false);
  const [scoreData,    setScoreData]    = useState<DiaryScore | null>(null);
  const [scoreVisible, setScoreVisible] = useState(false);
  const [scoring,      setScoring]      = useState(false);

  useEffect(() => {
    if (visible && user) {
      supabase
        .from('diary_entries')
        .select('*')
        .eq('is_deleted', false)
        .order('entry_date', { ascending: false })
        .limit(30)
        .then(({ data }) => setEntries(data ?? []));
    }
  }, [visible]);

  const reset = () => { setSelected(null); setCaption(''); setAnonymous(false); setStep(1); };

  const checkAndShare = async () => {
  if (!selected || sharing) return;
  setScoring(true);

  // Get content of selected entry
  const entry = entries.find(e => e.id === selected);
  if (!entry) { setScoring(false); return; }

  try {
    const score = await scoreDiary(entry.content);
    setScoreData(score);
    setScoreVisible(true);
  } catch {
    // If scoring fails, just publish
    await doPublish();
  } finally {
    setScoring(false);
  }
};

const doPublish = async () => {
  if (!selected || sharing) return;
  setSharing(true);
  try {
    await createPost({ entry_id: selected, caption, is_anonymous: anonymous });
    onShared();
    onClose();
    reset();
  } finally {
    setSharing(false);
  }
};
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[sm.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[sm.handle, { backgroundColor: C.border }]} />

          {/* Header */}
          <View style={sm.header}>
            <TouchableOpacity onPress={() => { onClose(); reset(); }}>
              <Ionicons name="close" size={22} color={C.textMuted} />
            </TouchableOpacity>
            <Text style={[sm.title, { color: C.textPrimary }]}>Share a page</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Step indicator */}
          <View style={sm.steps}>
            {[1, 2, 3].map(n => (
              <View key={n} style={[
                sm.stepDot,
                { backgroundColor: step >= n ? C.primary : C.border }
              ]} />
            ))}
          </View>

          {/* Step 1 — pick entry */}
          {step === 1 && (
            <>
              <Text style={[sm.stepLabel, { color: C.textMuted }]}>Pick a diary entry</Text>
              <FlatList
                data={entries}
                keyExtractor={i => i.id}
                style={{ maxHeight: 280 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[sm.entryItem, {
                      borderColor:     selected === item.id ? C.primary : C.border,
                      backgroundColor: selected === item.id ? C.primaryFaint : C.background,
                    }]}
                    onPress={() => setSelected(item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[sm.entryDate, { color: C.textMuted }]}>
                        {new Date(item.entry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {item.mood_label ? `  ·  ${MOOD_EMOTION[item.mood_label] ?? item.mood_label}` : ''}
                      </Text>
                      <Text style={[sm.entryPreview, { color: C.textPrimary }]} numberOfLines={2}>
                        {item.title ?? item.content.slice(0, 80)}
                      </Text>
                    </View>
                    {selected === item.id && (
                      <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={[sm.nextBtn, { backgroundColor: selected ? C.primary : C.border }]}
                onPress={() => selected && setStep(2)}
                disabled={!selected}
              >
                <Text style={[sm.nextBtnText, { color: selected ? C.background : C.textMuted }]}>
                  Next →
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2 — caption */}
          {step === 2 && (
            <>
              <Text style={[sm.stepLabel, { color: C.textMuted }]}>Write a caption</Text>
              <TextInput
                style={[sm.captionInput, { borderColor: C.border, color: C.textPrimary, backgroundColor: C.background }]}
                placeholder="Share what this moment means to you..."
                placeholderTextColor={C.textMuted}
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={sm.rowBtns}>
                <TouchableOpacity style={[sm.backBtn, { borderColor: C.border }]} onPress={() => setStep(1)}>
                  <Text style={{ color: C.textMuted }}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sm.nextBtn, { flex: 1, backgroundColor: C.primary }]}
                  onPress={() => setStep(3)}
                >
                  <Text style={[sm.nextBtnText, { color: C.background }]}>Next →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 3 — identity */}
          {step === 3 && (
            <>
              <Text style={[sm.stepLabel, { color: C.textMuted }]}>Who appears on your post?</Text>
              <View style={sm.identityRow}>
                <TouchableOpacity
                  style={[sm.identityOpt, {
                    borderColor:     !anonymous ? C.primary : C.border,
                    backgroundColor: !anonymous ? C.primaryFaint : C.background,
                  }]}
                  onPress={() => setAnonymous(false)}
                >
                  <Ionicons name="person-outline" size={20} color={!anonymous ? C.primary : C.textMuted} />
                  <Text style={[sm.identityLabel, { color: !anonymous ? C.primary : C.textMuted }]}>
                    Show my name
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sm.identityOpt, {
                    borderColor:     anonymous ? C.primary : C.border,
                    backgroundColor: anonymous ? C.primaryFaint : C.background,
                  }]}
                  onPress={() => setAnonymous(true)}
                >
                  <Ionicons name="eye-off-outline" size={20} color={anonymous ? C.primary : C.textMuted} />
                  <Text style={[sm.identityLabel, { color: anonymous ? C.primary : C.textMuted }]}>
                    Stay anonymous
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={sm.rowBtns}>
                <TouchableOpacity style={[sm.backBtn, { borderColor: C.border }]} onPress={() => setStep(2)}>
                  <Text style={{ color: C.textMuted }}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[sm.nextBtn, { flex: 1, backgroundColor: C.primary }]}
                  onPress={checkAndShare}
                  disabled={scoring || sharing}
                >
                  {(scoring || sharing)
                      ? <ActivityIndicator color={C.background} size="small" />
                      : <Text style={[sm.nextBtnText, { color: C.background }]}>Check & Publish</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
          <View style={{ height: 20 }} />
        </View>
      </KeyboardAvoidingView>

      {/* ── Score Card Modal ── */}
<Modal visible={scoreVisible} transparent animationType="fade">
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: SPACING.lg }}>
    <View style={[sc.card, { backgroundColor: C.surface, borderColor: C.border }]}>

      {/* Total score ring */}
      <View style={sc.scoreTop}>
        <View style={[sc.scoreBubble, {
          borderColor: scoreData && scoreData.total_score >= 60 ? '#6A9E72' : '#A05252',
          backgroundColor: scoreData && scoreData.total_score >= 60 ? '#6A9E7220' : '#A0525220',
        }]}>
          <Text style={[sc.scoreNum, { color: scoreData && scoreData.total_score >= 60 ? '#6A9E72' : '#A05252' }]}>
            {scoreData?.total_score ?? 0}
          </Text>
          <Text style={[sc.scoreOf, { color: C.textMuted }]}>/100</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[sc.scoreTitle, { color: C.textPrimary }]}>
            {scoreData && scoreData.total_score >= 60 ? '✨ Great diary!' : '📝 Needs more depth'}
          </Text>
          <Text style={[sc.scoreSub, { color: C.textMuted }]}>
            Emotional Impact: <Text style={{ color: scoreData?.emotional_impact === 'High' ? '#6A9E72' : C.textMuted }}>
              {scoreData?.emotional_impact}
            </Text>
          </Text>
        </View>
      </View>

      {/* Score bars */}
      <View style={sc.bars}>
        <ScoreBar label="Detail & Specificity"  score={scoreData?.detail_score      ?? 0} color="#5B8FA8" textColor={C.textPrimary} />
        <ScoreBar label="Emotional Depth"        score={scoreData?.emotion_score     ?? 0} color="#A05252" textColor={C.textPrimary} />
        <ScoreBar label="Clarity & Readability"  score={scoreData?.clarity_score     ?? 0} color="#6A9E72" textColor={C.textPrimary} />
        <ScoreBar label="Originality"            score={scoreData?.originality_score ?? 0} color="#C8A96E" textColor={C.textPrimary} />
      </View>

      {/* Feedback */}
      {scoreData?.feedback ? (
        <View style={[sc.feedbackBox, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}>
          <Text style={[sc.feedbackText, { color: C.textPrimary }]}>{scoreData.feedback}</Text>
        </View>
      ) : null}

      {/* Improvement tip */}
      {scoreData?.improvement ? (
        <Text style={[sc.improvementText, { color: C.textMuted }]}>💡 {scoreData.improvement}</Text>
      ) : null}

      {/* Actions */}
      {scoreData?.can_publish ? (
        <TouchableOpacity
          style={[sc.actionBtn, { backgroundColor: '#6A9E72' }]}
          onPress={() => { setScoreVisible(false); doPublish(); }}
        >
          <Text style={sc.actionBtnText}>Publish diary 🚀</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[sc.actionBtn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}
          onPress={() => setScoreVisible(false)}
        >
          <Text style={[sc.actionBtnText, { color: C.textPrimary }]}>Go back and improve it</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => setScoreVisible(false)} style={sc.cancelBtn}>
        <Text style={{ color: C.textMuted, fontSize: FONT_SIZE.xs }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </Modal>
  );
}

// ─── Diary Page Card ──────────────────────────────────────────────────────────
// ─── Diary Page Card ──────────────────────────────────────────────────────────

// ─── Content with Medha Modal ────────────────────────────────────────────────
const CONTENT_FORMATS = [
  { id: 'animation',  label: 'Animation Short',   icon: 'film-outline',        desc: 'A short animated story script'     },
  { id: 'creative',   label: 'Creative Rewrite',  icon: 'sparkles-outline',    desc: 'More vivid, literary version'      },
  { id: 'drama',      label: 'Short Film — Drama',icon: 'videocam-outline',    desc: 'Dramatic short film screenplay'    },
  { id: 'comedy',     label: 'Short Film — Comedy',icon: 'happy-outline',      desc: 'Lighthearted comedic adaptation'   },
  { id: 'thriller',   label: 'Short Film — Thriller',icon: 'eye-outline',      desc: 'Suspenseful cinematic version'     },
];

function ContentModal({
  visible, onClose, diaryContent, colors: C,
}: {
  visible: boolean; onClose: () => void; diaryContent: string; colors: any;
}) {
  const [step,      setStep]      = useState<'pick' | 'loading' | 'result'>('pick');
  const [selected,  setSelected]  = useState<string | null>(null);
  const [result,    setResult]    = useState('');

  const [copied, setCopied] = useState(false);
  const reset = () => { setStep('pick'); setSelected(null); setResult(''); setCopied(false); };

  const generate = async (formatId: string) => {
  setSelected(formatId);
  setStep('loading');
  try {
    const text = await generateContent(diaryContent, formatId);
    setResult(text);
    setStep('result');
  } catch (e: any) {
    console.error('generate error:', e?.message);
    setResult('Could not generate content. Please try again.');
    setStep('result');
  }
};

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { onClose(); reset(); }}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={[cm.sheet, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[cm.handle, { backgroundColor: C.border }]} />

          {/* Pick format */}
          {step === 'pick' && (
            <>
              <Text style={[cm.title, { color: C.textPrimary }]}>Make content with Medha</Text>
              <Text style={[cm.sub, { color: C.textMuted }]}>Choose how to transform this diary entry</Text>
              {CONTENT_FORMATS.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[cm.formatRow, { borderColor: C.border, backgroundColor: C.background }]}
                  onPress={() => generate(f.id)}
                  activeOpacity={0.8}
                >
                  <View style={[cm.formatIcon, { backgroundColor: C.primaryFaint }]}>
                    <Ionicons name={f.icon as any} size={18} color={C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[cm.formatLabel, { color: C.textPrimary }]}>{f.label}</Text>
                    <Text style={[cm.formatDesc,  { color: C.textMuted   }]}>{f.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => { onClose(); reset(); }} style={cm.closeBtn}>
                <Text style={{ color: C.textMuted, fontSize: FONT_SIZE.sm }}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <View style={cm.loadingWrap}>
              <ActivityIndicator size="large" color={C.primary} />
              <Text style={[cm.loadingText, { color: C.textMuted }]}>
                Medha is crafting your {CONTENT_FORMATS.find(f => f.id === selected)?.label}...
              </Text>
            </View>
          )}

          {/* Result */}
        {/* Result */}
{step === 'result' && (
  <>
    <View style={cm.resultHeader}>
      <Text style={[cm.title, { color: C.textPrimary }]}>
        {CONTENT_FORMATS.find(f => f.id === selected)?.label}
      </Text>
      <TouchableOpacity onPress={reset}>
        <Text style={{ color: C.primary, fontSize: FONT_SIZE.sm }}>Try another</Text>
      </TouchableOpacity>
    </View>
    <ScrollView style={cm.resultScroll} showsVerticalScrollIndicator={false}>
      <Text style={[cm.resultText, { color: C.textPrimary }]}>{result}</Text>
    </ScrollView>

    {/* ── Copy button ── */}
    <TouchableOpacity
      style={[cm.copyBtn, { borderColor: C.primary, backgroundColor: C.primaryFaint }]}
      onPress={() => {
        Clipboard.setString(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      <Ionicons
        name={copied ? 'checkmark-done-outline' : 'copy-outline'}
        size={16}
        color={C.primary}
      />
      <Text style={[cm.copyBtnText, { color: C.primary }]}>
        {copied ? 'Copied!' : 'Copy to clipboard'}
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[cm.doneBtn, { backgroundColor: C.primary }]}
      onPress={() => { onClose(); reset(); }}
    >
      <Text style={{ color: C.background, fontWeight: FONT_WEIGHT.semibold }}>Done</Text>
    </TouchableOpacity>
  </>
)}
          <View style={{ height: 20 }} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Score Card Modal ─────────────────────────────────────────────────────────
function ScoreBar({ label, score, max = 25, color, textColor }: {
  label: string; score: number; max?: number; color: string; textColor: string;
}) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: FONT_SIZE.xs, color: textColor }}>{label}</Text>
        <Text style={{ fontSize: FONT_SIZE.xs, color: textColor, fontWeight: FONT_WEIGHT.semibold }}>
          {score}/{max}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: color + '30' }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${pct}%` }} />
      </View>
    </View>
  );
}

// ─── Diary Page Card ──────────────────────────────────────────────────────────
const CARD_WIDTH  = Dimensions.get('window').width - SPACING.md * 2;
const CHARS_PER_PAGE = 400;

function splitIntoPages(text: string): string[] {
  const pages: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = i + CHARS_PER_PAGE;
    if (end < text.length) {
      const slice      = text.slice(i, end);
      const lastPeriod = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('.\n'));
      const lastSpace  = slice.lastIndexOf(' ');
      end = i + (lastPeriod > CHARS_PER_PAGE * 0.6 ? lastPeriod + 1 : lastSpace > 0 ? lastSpace : CHARS_PER_PAGE);
    }
    pages.push(text.slice(i, end).trim());
    i = end;
  }
  return pages.filter(p => p.length > 0);
}

function DiaryCard({
  post, colors: C, onComment,
}: {
  post: SocialPost; colors: any; onComment: () => void;
}) {
  const [liked,          setLiked]         = useState(post.liked_by_me);
  const [likesCount,     setLikesCount]    = useState(post.likes_count);
  const [activePage,     setActivePage]    = useState(0);
  const [menuVisible,    setMenuVisible]   = useState(false);
  const [contentVisible, setContentVisible]= useState(false);
  const [menuPos,        setMenuPos]       = useState({ top: 0, right: 0 });  // ← NEW

  const dotBtnRef = useRef<TouchableOpacity>(null);   // ← NEW
  const flatRef   = useRef<FlatList>(null);

  // ── NEW: measure the 3-dot button and compute menu position ──
const openMenu = () => {
  dotBtnRef.current?.measure((x, y, width, height, pageX, pageY) => {
    setMenuPos({
      top:   pageY + height + 4,
      right: Math.max(8, SCREEN_W - pageX - width - 16),
    });
    setMenuVisible(true);
  });
};

  const pages   = splitIntoPages(post.entry_content);
  const isMulti = pages.length > 1;
  const emotion = post.mood_label ? MOOD_EMOTION[post.mood_label] : null;

  const handleLike = async () => {
    const prev = liked;
    setLiked(!prev);
    setLikesCount(c => prev ? c - 1 : c + 1);
    try {
      const res = await toggleLike(post.id);
      setLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch {
      setLiked(prev);
      setLikesCount(post.likes_count);
    }
  };

  const onPageScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActivePage(idx);
  }, []);

  return (
    <View style={[dc.card, { backgroundColor: C.surface, borderColor: C.border }]}>

      {/* ── Header ── */}
      <View style={[dc.header, { borderColor: C.border }]}>
        <View style={[dc.marginAccent, { backgroundColor: C.primary }]} />
        <View style={dc.authorRow}>
          <View style={[dc.avatar, { backgroundColor: C.primaryFaint }]}>
            {post.is_anonymous
              ? <Ionicons name="person-outline" size={13} color={C.textMuted} />
              : <Text style={[dc.avatarText, { color: C.primary }]}>
                  {(post.display_name ?? 'A')[0].toUpperCase()}
                </Text>
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[dc.authorName, { color: C.textPrimary }]}>
              {post.is_anonymous ? 'Anonymous' : (post.display_name ?? 'Someone')}
            </Text>
            <Text style={[dc.authorMeta, { color: C.textMuted }]}>
              {new Date(post.entry_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
              {emotion ? `  ·  ${emotion}` : ''}
            </Text>
          </View>
          {emotion && (
            <View style={[dc.emotionPill, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}>
              <Text style={[dc.emotionText, { color: C.primary }]}>{emotion}</Text>
            </View>
          )}

          {/* 3-dot button — ref attached here */}
          <TouchableOpacity
            ref={dotBtnRef}          // ← attach ref
            onPress={openMenu}       // ← use openMenu instead of setMenuVisible
            style={dc.dotMenu}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 3-dot dropdown — positioned dynamically ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[
            dc.menuCard,
            {
              backgroundColor: C.surface,
              borderColor:      C.border,
              top:              menuPos.top,    // ← dynamic
              right:            menuPos.right,  // ← dynamic
            }
          ]}>
            <TouchableOpacity
              style={dc.menuItem}
              onPress={() => { setMenuVisible(false); setContentVisible(true); }}
            >
              <Ionicons name="sparkles-outline" size={16} color={C.primary} />
              <Text style={[dc.menuItemText, { color: C.textPrimary }]}>
                Make content with Medha
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* rest of the card — pages, dots, caption, footer unchanged */}
      {/* ── Swipeable diary pages ── */}
      <View>
        <View style={dc.linesWrap} pointerEvents="none">
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[dc.line, { borderColor: C.primaryFaint }]} />
          ))}
        </View>
        <View style={[dc.marginLine, { backgroundColor: C.primaryFaint }]} />
        <FlatList
          ref={flatRef}
          data={pages}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onPageScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: CARD_WIDTH, offset: CARD_WIDTH * i, index: i })}
          renderItem={({ item: pageText, index }) => (
            <View style={[dc.page, { width: CARD_WIDTH }]}>
              {isMulti && (
                <Text style={[dc.pageNum, { color: C.textMuted }]}>
                  {index + 1} / {pages.length}
                </Text>
              )}
              <Text style={[dc.entryText, { color: C.textPrimary }]}>
                {index === 0 ? '\u201C' : ''}{pageText}{index === pages.length - 1 ? '\u201D' : ''}
              </Text>
            </View>
          )}
        />
        {isMulti && (
          <View style={dc.dotsRow}>
            {pages.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => flatRef.current?.scrollToIndex({ index: i, animated: true })}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View style={[dc.dot, {
                  backgroundColor: i === activePage ? C.primary : C.border,
                  width:           i === activePage ? 16 : 6,
                }]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {post.caption ? (
        <View style={[dc.captionWrap, { borderColor: C.border }]}>
          <Text style={[dc.captionAuthor, { color: C.textMuted }]}>
            {post.is_anonymous ? 'Anonymous' : (post.display_name ?? 'Someone')}
          </Text>
          <Text style={[dc.captionText, { color: C.textPrimary }]}>{post.caption}</Text>
        </View>
      ) : null}

      <View style={[dc.footer, { borderColor: C.border }]}>
        <Text style={[dc.timeAgo, { color: C.textMuted }]}>{timeAgo(post.created_at)}</Text>
        <View style={dc.actions}>
          <TouchableOpacity style={dc.actionBtn} onPress={handleLike}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? '#e05a5a' : C.textMuted}
            />
            <Text style={[dc.actionCount, { color: liked ? '#e05a5a' : C.textMuted }]}>
              {likesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={dc.actionBtn} onPress={onComment}>
            <Ionicons name="chatbubble-outline" size={18} color={C.textMuted} />
            <Text style={[dc.actionCount, { color: C.textMuted }]}>{post.comments_count}</Text>
          </TouchableOpacity>
          <View style={dc.actionBtn}>
            <Ionicons name="eye-outline" size={18} color={C.textMuted} />
            <Text style={[dc.actionCount, { color: C.textMuted }]}>
              {post.views >= 1000 ? `${(post.views / 1000).toFixed(1)}k` : post.views}
            </Text>
          </View>
        </View>
      </View>

      <ContentModal
        visible={contentVisible}
        onClose={() => setContentVisible(false)}
        diaryContent={post.entry_content}
        colors={C}
      />
    </View>
  );
}
// ─── Main Social Screen ───────────────────────────────────────────────────────
export default function SocialScreen() {
  const { colors: C } = useTheme();
  const [posts,         setPosts]         = useState<SocialPost[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [page,          setPage]          = useState(0);
  const [hasMore,       setHasMore]       = useState(true);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [shareVisible,  setShareVisible]  = useState(false);

  const viewedRef = useRef<Set<string>>(new Set());

  const load = async (p = 0, refresh = false) => {
    try {
      const data = await fetchFeed(p);
      if (refresh || p === 0) setPosts(data);
      else setPosts(prev => [...prev, ...data]);
      setHasMore(data.length === 20);
      setPage(p);
    } catch (e) {
      console.warn('feed error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const onViewableChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    viewableItems.forEach(({ item }) => {
      if (item && !viewedRef.current.has(item.id)) {
        viewedRef.current.add(item.id);
        incrementView(item.id);
      }
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: C.background }]} edges={['top']}>
      {/* Header */}
      <View style={[ss.header, { borderColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={ss.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[ss.title, { color: C.textPrimary }]}>Diaries</Text>
          <Text style={[ss.subtitle, { color: C.textMuted }]}>real people, real pages</Text>
        </View>
        <TouchableOpacity
          style={[ss.shareBtn, { backgroundColor: C.primaryFaint, borderColor: C.primary + '40' }]}
          onPress={() => setShareVisible(true)}
        >
          <Ionicons name="add" size={18} color={C.primary} />
          <Text style={[ss.shareBtnText, { color: C.primary }]}>Share</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onRefresh={() => { setRefreshing(true); load(0, true); }}
        refreshing={refreshing}
        onEndReached={() => { if (hasMore) load(page + 1); }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <DiaryCard
            post={item}
            colors={C}
            onComment={() => setCommentPostId(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={ss.empty}>
            <Ionicons name="journal-outline" size={40} color={C.textMuted} />
            <Text style={[ss.emptyTitle, { color: C.textPrimary }]}>No pages yet</Text>
            <Text style={[ss.emptySub, { color: C.textMuted }]}>
              Be the first to share a diary page with the world
            </Text>
            <TouchableOpacity
              style={[ss.emptyBtn, { backgroundColor: C.primary }]}
              onPress={() => setShareVisible(true)}
            >
              <Text style={{ color: C.background, fontWeight: FONT_WEIGHT.semibold }}>Share yours</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[ss.fab, { backgroundColor: C.primary }]}
        onPress={() => setShareVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color={C.background} />
      </TouchableOpacity>

      <CommentSheet
        postId={commentPostId ?? ''}
        visible={!!commentPostId}
        onClose={() => setCommentPostId(null)}
        colors={C}
      />

      <ShareModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        onShared={() => load(0, true)}
        colors={C}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const cm = StyleSheet.create({
  sheet: {
    borderTopLeftRadius:  BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth:  1,
    padding:      SPACING.md,
    maxHeight:    '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: SPACING.md,
  },
  title:       { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, marginBottom: 4 },
  sub:         { fontSize: FONT_SIZE.sm, marginBottom: SPACING.md },
  formatRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    borderWidth:    1,
    borderRadius:   BORDER_RADIUS.md,
    padding:        SPACING.sm,
    marginBottom:   SPACING.xs,
  },
  formatIcon:  { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  formatLabel: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  formatDesc:  { fontSize: FONT_SIZE.xs, marginTop: 1 },
  closeBtn:    { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  loadingWrap: { alignItems: 'center', paddingVertical: 60, gap: SPACING.md },
  loadingText: { fontSize: FONT_SIZE.sm, textAlign: 'center' },
  resultHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  resultScroll:{ maxHeight: 340, marginBottom: SPACING.md },
  resultText:  { fontSize: FONT_SIZE.sm, lineHeight: 22 },
  doneBtn:     { borderRadius: BORDER_RADIUS.md, padding: SPACING.sm + 2, alignItems: 'center' },

  copyBtn: {
  flexDirection:     'row',
  alignItems:        'center',
  justifyContent:    'center',
  gap:               6,
  borderWidth:       1,
  borderRadius:      BORDER_RADIUS.md,
  padding:           SPACING.sm,
  marginBottom:      SPACING.sm,
},
copyBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});

const dc = StyleSheet.create({
  card:        { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  header:      { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 0.5, gap: 8 },
  marginAccent:{ width: 3, borderRadius: 2, alignSelf: 'stretch' },
  authorRow:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar:      { width: 30, height: 30, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 13, fontWeight: FONT_WEIGHT.bold },
  authorName:  { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  authorMeta:  { fontSize: 10, marginTop: 1 },
  emotionPill: { borderRadius: BORDER_RADIUS.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  emotionText: { fontSize: 10, fontWeight: FONT_WEIGHT.medium },
  dotMenu:     { padding: 4 },
  menuCard: {
    position:     'absolute',
    minWidth:     220,
    borderRadius: BORDER_RADIUS.md,
    borderWidth:  1,
    paddingVertical: 4,
    shadowColor:  '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation:    8,
  },
  menuItem:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  menuItemText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  linesWrap:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 36, paddingHorizontal: SPACING.md },
  line:         { borderBottomWidth: 0.5, marginBottom: 24, opacity: 0.35 },
  marginLine:   { position: 'absolute', left: 46, top: 0, bottom: 0, width: 0.5, opacity: 0.25 },
  page:         { paddingHorizontal: SPACING.md, paddingLeft: 52, paddingTop: SPACING.sm, paddingBottom: SPACING.md, minHeight: 200 },
  pageNum:      { fontSize: 10, textAlign: 'right', marginBottom: 6 },
  entryText:    { fontSize: FONT_SIZE.md, lineHeight: 26, fontStyle: 'italic' },
  dotsRow:      { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingBottom: SPACING.sm },
  dot:          { height: 6, borderRadius: 3 },
  captionWrap:  { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 0.5 },
  captionAuthor:{ fontSize: 11, fontWeight: FONT_WEIGHT.semibold, marginBottom: 2 },
  captionText:  { fontSize: FONT_SIZE.sm, lineHeight: 18 },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 0.5 },
  timeAgo:      { fontSize: 10 },
  actions:      { flexDirection: 'row', gap: SPACING.lg },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount:  { fontSize: FONT_SIZE.sm },
});

const cs = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
    paddingBottom: 0,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: SPACING.md,
  },
  sheetTitle:  { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.md },
  commentRow:  { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  commentAvatar: {
    width: 32, height: 32, borderRadius: BORDER_RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  commentInitial: { fontSize: 13, fontWeight: FONT_WEIGHT.bold },
  commentName:    { fontSize: FONT_SIZE.xs, marginBottom: 2 },
  commentText:    { fontSize: FONT_SIZE.sm, lineHeight: 18 },
  emptyComments:  { textAlign: 'center', paddingVertical: SPACING.lg, fontSize: FONT_SIZE.sm },
  commentInput: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    borderWidth:       1,
    borderRadius:      BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   SPACING.xs,
    margin:            SPACING.sm,
  },
  commentBox: { flex: 1, fontSize: FONT_SIZE.sm, maxHeight: 80 },
});

const sm = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  title:      { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  steps:      { flexDirection: 'row', gap: 6, marginBottom: SPACING.md },
  stepDot:    { flex: 1, height: 3, borderRadius: 2 },
  stepLabel:  { fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  entryDate:    { fontSize: FONT_SIZE.xs, marginBottom: 3 },
  entryPreview: { fontSize: FONT_SIZE.sm, lineHeight: 18 },
  captionInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    minHeight: 100,
    marginBottom: SPACING.md,
  },
  identityRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  identityOpt: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  identityLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
  rowBtns:  { flexDirection: 'row', gap: SPACING.sm },
  backBtn:  { borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, justifyContent: 'center' },
  nextBtn:  { borderRadius: BORDER_RADIUS.md, padding: SPACING.sm + 2, alignItems: 'center' },
  nextBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
});

const ss = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  backBtn:      { padding: 4 },
  title:        { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  subtitle:     { fontSize: FONT_SIZE.xs },
  shareBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  shareBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  empty:        { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle:   { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  emptySub:     { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { marginTop: SPACING.sm, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: SPACING.md,
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const sc = StyleSheet.create({
  card:        { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg, width: '100%' },
  scoreTop:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  scoreBubble: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreNum:    { fontSize: 24, fontWeight: FONT_WEIGHT.bold },
  scoreOf:     { fontSize: 10 },
  scoreTitle:  { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, marginBottom: 4 },
  scoreSub:    { fontSize: FONT_SIZE.xs },
  bars:        { marginBottom: SPACING.md },
  feedbackBox: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm, marginBottom: SPACING.sm },
  feedbackText:{ fontSize: FONT_SIZE.sm, lineHeight: 18 },
  improvementText: { fontSize: FONT_SIZE.xs, lineHeight: 16, marginBottom: SPACING.md },
  actionBtn:   { borderRadius: BORDER_RADIUS.md, padding: SPACING.sm + 2, alignItems: 'center', marginBottom: SPACING.sm },
  actionBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  cancelBtn:   { alignItems: 'center', paddingVertical: 4 },
});