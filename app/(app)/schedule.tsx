import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import {
  fetchTodos, createTodo, toggleTodo,
  deleteTodo, generatePlan, saveMedhaplan,
  MedhaTask,
} from '../../src/Services/scheduleService';
import {
  Todo, TimeBlock, Priority,
  TIME_BLOCKS, PRIORITY_OPTIONS,
} from '../../src/types/database';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';



// ─── Today's date ─────────────────────────────────────────────────────────────
function getTodayDate(): string {
  // Use local date — important for IST timezone
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = String(now.getMonth() + 1).padStart(2, '0');
  const day    = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function ScheduleScreen() {
  const { user }       = useAuth();
  const { colors: C }  = useTheme();

  const [todos,          setTodos]          = useState<Todo[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedDate,   setSelectedDate]   = useState(getTodayDate());

  // Add task modal
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [newTitle,       setNewTitle]       = useState('');
  const [newTimeBlock,   setNewTimeBlock]   = useState<TimeBlock>('anytime');
  const [newPriority,    setNewPriority]    = useState<Priority>('normal');
  const [newTime,        setNewTime]        = useState('');
  const [newNotes,       setNewNotes]       = useState('');
  const [saving,         setSaving]         = useState(false);

  // Medha plan
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [draftTasks,     setDraftTasks]     = useState<MedhaTask[] | null>(null);
  const [planInsight,    setPlanInsight]    = useState('');
  const [showDraftModal, setShowDraftModal] = useState(false);

  useFocusEffect(
    useCallback(() => { loadTodos(); }, [selectedDate])
  );

  const loadTodos = async () => {
    setLoading(true);
    try {
      const data = await fetchTodos(selectedDate);
      setTodos(data);
    } catch (e) {
      console.error('Failed to load todos:', e);
    }
    setLoading(false);
  };

  // ── Add task manually ─────────────────────────────────────────────────────
  const handleAddTask = async () => {
    if (!newTitle.trim() || !user) return;
    setSaving(true);
    try {
      await createTodo({
        user_id:        user.id,
        title:          newTitle.trim(),
        notes:          newNotes.trim() || null,
        time_block:     newTimeBlock,
        scheduled_time: newTime || null,
        priority:       newPriority,
        scheduled_date: selectedDate,
        created_by:     'user',
      });
      await loadTodos();
      resetAddForm();
      setShowAddModal(false);
    } catch (e) {
      Alert.alert('Error', 'Could not save task. Try again.');
    }
    setSaving(false);
  };

  const resetAddForm = () => {
    setNewTitle('');
    setNewTimeBlock('anytime');
    setNewPriority('normal');
    setNewTime('');
    setNewNotes('');
  };

  // ── Toggle complete ───────────────────────────────────────────────────────
  const handleToggle = async (todo: Todo) => {
    // Optimistic update
    setTodos(prev =>
      prev.map(t => t.id === todo.id ? { ...t, is_done: !t.is_done } : t)
    );
    try {
      await toggleTodo(todo.id, !todo.is_done);
    } catch {
      // Revert on error
      setTodos(prev =>
        prev.map(t => t.id === todo.id ? { ...t, is_done: todo.is_done } : t)
      );
    }
  };

  // ── Delete task ───────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    Alert.alert('Delete task', 'Remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setTodos(prev => prev.filter(t => t.id !== id));
          await deleteTodo(id);
        },
      },
    ]);
  };

  // ── Ask Medha to plan ─────────────────────────────────────────────────────
  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      const result = await generatePlan();
      if (result.tasks.length === 0) {
        Alert.alert(
          'Not enough data',
          result.insight || 'Write more diary entries so Medha can understand your goals.',
        );
        return;
      }
      setDraftTasks(result.tasks);
      setPlanInsight(result.insight);
      setShowDraftModal(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not generate plan. Try again.');
    }
    setGeneratingPlan(false);
  };

  // ── Confirm Medha's plan ──────────────────────────────────────────────────
  const handleConfirmPlan = async () => {
    if (!draftTasks || !user) return;
    setSaving(true);
    try {
      await saveMedhaplan(draftTasks, user.id, selectedDate);
      await loadTodos();
      setShowDraftModal(false);
      setDraftTasks(null);
    } catch (e) {
      Alert.alert('Error', 'Could not save plan. Try again.');
    }
    setSaving(false);
  };

  // ── Group todos by time block ─────────────────────────────────────────────
  const grouped = TIME_BLOCKS.reduce((acc, block) => {
    acc[block.value] = todos.filter(t => t.time_block === block.value);
    return acc;
  }, {} as Record<TimeBlock, Todo[]>);

  const unscheduled = todos.filter(t => !t.time_block || t.time_block === 'anytime');
  const done        = todos.filter(t => t.is_done);
  const pending     = todos.filter(t => !t.is_done);

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = todos.length > 0
    ? Math.round((done.length / todos.length) * 100)
    : 0;

  // ── Render a single todo item ─────────────────────────────────────────────
  const renderTodo = (todo: Todo) => {
    const priorityColor = PRIORITY_OPTIONS.find(p => p.value === todo.priority)?.color ?? C.textMuted;

    return (
      <TouchableOpacity
        key={todo.id}
        style={[
          styles.todoItem,
          {
            backgroundColor: C.surface,
            borderColor:     todo.is_done ? C.border : priorityColor + '40',
            opacity:         todo.is_done ? 0.6 : 1,
          },
        ]}
        onPress={() => handleToggle(todo)}
        activeOpacity={0.8}
      >
        {/* Checkbox */}
        <View style={[
          styles.checkbox,
          {
            borderColor:     todo.is_done ? C.primary : priorityColor,
            backgroundColor: todo.is_done ? C.primary : 'transparent',
          },
        ]}>
          {todo.is_done && <Ionicons name="checkmark" size={12} color={C.background} />}
        </View>

        {/* Content */}
        <View style={styles.todoContent}>
          <Text style={[
            styles.todoTitle,
            {
              color:             todo.is_done ? C.textMuted : C.textPrimary,
              textDecorationLine: todo.is_done ? 'line-through' : 'none',
            },
          ]}>
            {todo.title}
          </Text>
          {todo.notes && (
            <Text style={[styles.todoNotes, { color: C.textMuted }]} numberOfLines={1}>
              {todo.notes}
            </Text>
          )}
          <View style={styles.todoMeta}>
            {todo.scheduled_time && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={10} color={C.textMuted} />
                <Text style={[styles.metaText, { color: C.textMuted }]}>{todo.scheduled_time}</Text>
              </View>
            )}
            {todo.created_by === 'medha' && (
              <View style={[styles.metaChip, { backgroundColor: C.primaryFaint }]}>
                <Ionicons name="sparkles-outline" size={10} color={C.primary} />
                <Text style={[styles.metaText, { color: C.primary }]}>Medha</Text>
              </View>
            )}
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          </View>
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(todo.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={14} color={C.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>

      {/* ── Header ── */}
    {/* ── Header with date navigation ── */}
<View style={[styles.header, { borderBottomColor: C.border }]}>
  <TouchableOpacity
    style={styles.addBtn}
    onPress={() => {
      // Go to previous day
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 1);
      setSelectedDate(prev.toISOString().split('T')[0]);
    }}
  >
    <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
  </TouchableOpacity>

  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Schedule</Text>
    <Text style={[styles.headerDate, { color: C.textMuted }]}>
      {selectedDate === getTodayDate()
        ? 'Today'
        : formatDisplayDate(selectedDate)}
    </Text>
  </View>

  <TouchableOpacity
    style={styles.addBtn}
    onPress={() => {
      // Go to next day (but not beyond today)
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + 1);
      const nextStr = next.toISOString().split('T')[0];
      if (nextStr <= getTodayDate()) {
        setSelectedDate(nextStr);
      }
    }}
  >
    <Ionicons name="chevron-forward" size={20} color={C.textSecondary} />
  </TouchableOpacity>
</View>

{/* Add task button — separate row */}
<TouchableOpacity
  style={[styles.addTaskRow, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}
  onPress={() => setShowAddModal(true)}
>
  <Ionicons name="add-circle-outline" size={18} color={C.primary} />
  <Text style={[styles.addTaskText, { color: C.primary }]}>Add task for {selectedDate === getTodayDate() ? 'today' : formatDisplayDate(selectedDate)}</Text>
</TouchableOpacity>

      {/* ── Progress bar ── */}
      {todos.length > 0 && (
        <View style={[styles.progressWrap, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: C.textSecondary }]}>
              {done.length} of {todos.length} tasks done
            </Text>
            <Text style={[styles.progressPct, { color: C.primary }]}>{progress}%</Text>
          </View>
          <View style={[styles.progressBg, { backgroundColor: C.overlay }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: C.primary }]} />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Ask Medha button ── */}
        <TouchableOpacity
          style={[styles.medhaBtn, { backgroundColor: C.primaryFaint, borderColor: C.primary + '40' }]}
          onPress={handleGeneratePlan}
          disabled={generatingPlan}
          activeOpacity={0.8}
        >
          {generatingPlan ? (
            <>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={[styles.medhaBtnText, { color: C.primary }]}>
                Medha is planning your day...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color={C.primary} />
              <View style={styles.medhaBtnBody}>
                <Text style={[styles.medhaBtnText, { color: C.primary }]}>
                  Ask Medha to plan my day
                </Text>
                <Text style={[styles.medhaBtnSub, { color: C.textMuted }]}>
                  Based on your diary goals and habits
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={C.primary} />
            </>
          )}
        </TouchableOpacity>

        {/* ── Empty state ── */}
        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: SPACING.xl }} />
        ) : todos.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No tasks today</Text>
            <Text style={[styles.emptySub, { color: C.textMuted }]}>
              Add tasks manually or ask Medha to plan your day based on your diary
            </Text>
          </View>
        ) : (
          <>
            {/* ── Tasks by time block ── */}
            {TIME_BLOCKS.filter(b => b.value !== 'anytime').map(block => {
              const blockTodos = todos.filter(
                t => t.time_block === block.value && !t.is_done
              );
              if (blockTodos.length === 0) return null;

              return (
                <View key={block.value} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name={block.icon as any} size={14} color={C.primary} />
                    <Text style={[styles.sectionTitle, { color: C.textMuted }]}>
                      {block.label.toUpperCase()}
                    </Text>
                    <Text style={[styles.sectionTime, { color: C.textMuted }]}>
                      {block.time}
                    </Text>
                  </View>
                  {blockTodos.map(renderTodo)}
                </View>
              );
            })}

            {/* ── Anytime tasks ── */}
            {(() => {
              const anytime = todos.filter(t => (!t.time_block || t.time_block === 'anytime') && !t.is_done);
              if (anytime.length === 0) return null;
              return (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="infinite-outline" size={14} color={C.primary} />
                    <Text style={[styles.sectionTitle, { color: C.textMuted }]}>FLEXIBLE</Text>
                  </View>
                  {anytime.map(renderTodo)}
                </View>
              );
            })()}

            {/* ── Completed ── */}
            {done.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={C.textMuted} />
                  <Text style={[styles.sectionTitle, { color: C.textMuted }]}>COMPLETED</Text>
                </View>
                {done.map(renderTodo)}
              </View>
            )}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Add Task Modal ── */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>New task</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); resetAddForm(); }}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.surfaceRaised, borderColor: C.border, color: C.textPrimary }]}
              placeholder="What do you need to do?"
              placeholderTextColor={C.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            {/* Time block */}
            <Text style={[styles.modalLabel, { color: C.textMuted }]}>Time of day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blockRow}>
              {TIME_BLOCKS.map(block => (
                <TouchableOpacity
                  key={block.value}
                  style={[
                    styles.blockChip,
                    {
                      backgroundColor: newTimeBlock === block.value ? C.primary : C.surfaceRaised,
                      borderColor:     newTimeBlock === block.value ? C.primary : C.border,
                    },
                  ]}
                  onPress={() => setNewTimeBlock(block.value)}
                >
                  <Ionicons
                    name={block.icon as any}
                    size={14}
                    color={newTimeBlock === block.value ? C.background : C.textSecondary}
                  />
                  <Text style={[
                    styles.blockChipText,
                    { color: newTimeBlock === block.value ? C.background : C.textSecondary },
                  ]}>
                    {block.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Specific time */}
            <Text style={[styles.modalLabel, { color: C.textMuted }]}>Specific time (optional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.surfaceRaised, borderColor: C.border, color: C.textPrimary }]}
              placeholder="e.g. 09:00"
              placeholderTextColor={C.textMuted}
              value={newTime}
              onChangeText={setNewTime}
              keyboardType="numbers-and-punctuation"
            />

            {/* Priority */}
            <Text style={[styles.modalLabel, { color: C.textMuted }]}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityChip,
                    {
                      backgroundColor: newPriority === p.value ? p.color + '30' : C.surfaceRaised,
                      borderColor:     newPriority === p.value ? p.color : C.border,
                    },
                  ]}
                  onPress={() => setNewPriority(p.value)}
                >
                  <Text style={[styles.priorityChipText, { color: newPriority === p.value ? p.color : C.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={[styles.modalLabel, { color: C.textMuted }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: C.surfaceRaised, borderColor: C.border, color: C.textPrimary }]}
              placeholder="Any extra details..."
              placeholderTextColor={C.textMuted}
              value={newNotes}
              onChangeText={setNewNotes}
            />

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: C.primary }, (!newTitle.trim() || saving) && { opacity: 0.5 }]}
              onPress={handleAddTask}
              disabled={!newTitle.trim() || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.background} />
                : <Text style={[styles.saveBtnText, { color: C.background }]}>Add task</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Medha Draft Plan Modal ── */}
      <Modal visible={showDraftModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: C.surface, borderColor: C.border }]}>

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="sparkles-outline" size={18} color={C.primary} />
                <Text style={[styles.modalTitle, { color: C.textPrimary }]}>Medha's plan</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDraftModal(false)}>
                <Ionicons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {planInsight && (
              <View style={[styles.insightBox, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}>
                <Text style={[styles.insightText, { color: C.textSecondary }]}>
                  {planInsight}
                </Text>
              </View>
            )}

            <ScrollView style={styles.draftScroll} showsVerticalScrollIndicator={false}>
              {draftTasks?.map((task, idx) => {
                const block       = TIME_BLOCKS.find(b => b.value === task.time_block);
                const priorityClr = PRIORITY_OPTIONS.find(p => p.value === task.priority)?.color ?? C.textMuted;
                return (
                  <View key={idx} style={[styles.draftTask, { backgroundColor: C.surfaceRaised, borderColor: C.border }]}>
                    <View style={styles.draftTaskTop}>
                      <View style={[styles.priorityDot, { backgroundColor: priorityClr }]} />
                      <Text style={[styles.draftTaskTitle, { color: C.textPrimary }]}>{task.title}</Text>
                    </View>
                    <View style={styles.draftTaskMeta}>
                      {block && (
                        <View style={styles.metaChip}>
                          <Ionicons name={block.icon as any} size={10} color={C.textMuted} />
                          <Text style={[styles.metaText, { color: C.textMuted }]}>{block.label}</Text>
                        </View>
                      )}
                      {task.scheduled_time && (
                        <View style={styles.metaChip}>
                          <Ionicons name="time-outline" size={10} color={C.textMuted} />
                          <Text style={[styles.metaText, { color: C.textMuted }]}>{task.scheduled_time}</Text>
                        </View>
                      )}
                    </View>
                    {task.notes && (
                      <Text style={[styles.draftTaskNotes, { color: C.textMuted }]}>{task.notes}</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <View style={styles.draftActions}>
              <TouchableOpacity
                style={[styles.draftBtn, { borderColor: C.border }]}
                onPress={() => setShowDraftModal(false)}
              >
                <Text style={[styles.draftBtnText, { color: C.textSecondary }]}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.draftBtn, styles.draftBtnPrimary, { backgroundColor: C.primary }]}
                onPress={handleConfirmPlan}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={C.background} />
                  : <Text style={[styles.draftBtnText, { color: C.background }]}>Add to my day</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop:        SPACING.sm,
    paddingBottom:     SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold },
  headerDate:  { fontSize: FONT_SIZE.sm, marginTop: 2 },
  addBtn: {
    width:          40,
    height:         40,
    borderRadius:   BORDER_RADIUS.full,
    alignItems:     'center',
    justifyContent: 'center',
  },

  progressWrap: {
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 1,
  },
  progressRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   6,
  },
  progressText: { fontSize: FONT_SIZE.sm },
  progressPct:  { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  progressBg:   { height: 4, borderRadius: BORDER_RADIUS.full },
  progressFill: { height: 4, borderRadius: BORDER_RADIUS.full },

  medhaBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            SPACING.sm,
    borderRadius:   BORDER_RADIUS.lg,
    padding:        SPACING.md,
    borderWidth:    1,
    marginBottom:   SPACING.lg,
  },
  medhaBtnBody: { flex: 1 },
  medhaBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  medhaBtnSub:  { fontSize: FONT_SIZE.xs, marginTop: 2 },

  section:       { marginBottom: SPACING.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  8,
  },
  sectionTitle: {
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    letterSpacing: 0.8,
    flex:          1,
  },
  sectionTime: { fontSize: FONT_SIZE.xs },

  todoItem: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            SPACING.sm,
    padding:        SPACING.sm,
    borderRadius:   BORDER_RADIUS.md,
    borderWidth:    1,
    marginBottom:   6,
  },
  checkbox: {
    width:          20,
    height:         20,
    borderRadius:   5,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    marginTop:      1,
  },
  todoContent:  { flex: 1 },
  todoTitle:    { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
  todoNotes:    { fontSize: FONT_SIZE.xs, marginTop: 2 },
  todoMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:     { fontSize: 10 },
  priorityDot:  { width: 6, height: 6, borderRadius: 3 },
  deleteBtn:    { padding: 4 },

  empty: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    gap:        SPACING.sm,
  },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  emptySub:   { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },

  // Modals
  modalOverlay: {
    flex:            1,
    justifyContent:  'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    borderTopLeftRadius:  BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding:              SPACING.lg,
    borderWidth:          1,
    maxHeight:            '90%',
  },
  modalHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   SPACING.md,
  },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle:  { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  modalLabel:  { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.6, marginBottom: 6, marginTop: SPACING.sm },
  modalInput: {
    borderRadius:      BORDER_RADIUS.md,
    borderWidth:       1,
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    fontSize:          FONT_SIZE.md,
    marginBottom:      SPACING.sm,
  },
  blockRow:       { marginBottom: SPACING.sm },
  blockChip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    borderRadius:      BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical:   6,
    borderWidth:       1,
    marginRight:       6,
  },
  blockChipText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
  priorityRow:   { flexDirection: 'row', gap: 8, marginBottom: SPACING.sm },
  priorityChip: {
    flex:              1,
    alignItems:        'center',
    paddingVertical:   8,
    borderRadius:      BORDER_RADIUS.md,
    borderWidth:       1,
  },
  priorityChipText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  saveBtn: {
    borderRadius:   BORDER_RADIUS.md,
    padding:        SPACING.md,
    alignItems:     'center',
    marginTop:      SPACING.sm,
  },
  saveBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },

  insightBox: {
    borderRadius:  BORDER_RADIUS.md,
    padding:       SPACING.sm,
    borderWidth:   1,
    marginBottom:  SPACING.md,
  },
  insightText:  { fontSize: FONT_SIZE.sm, lineHeight: 18, fontStyle: 'italic' },
  draftScroll:  { maxHeight: 320, marginBottom: SPACING.md },
  draftTask: {
    borderRadius:  BORDER_RADIUS.md,
    padding:       SPACING.sm,
    borderWidth:   1,
    marginBottom:  8,
  },
  draftTaskTop:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  draftTaskTitle: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, flex: 1 },
  draftTaskMeta:  { flexDirection: 'row', gap: 8, marginBottom: 4 },
  draftTaskNotes: { fontSize: FONT_SIZE.xs, lineHeight: 16 },
  draftActions: { flexDirection: 'row', gap: SPACING.sm },
  draftBtn: {
    flex:           1,
    alignItems:     'center',
    paddingVertical: SPACING.sm,
    borderRadius:   BORDER_RADIUS.md,
    borderWidth:    1,
  },
  draftBtnPrimary: { borderWidth: 0 },
  draftBtnText:    { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },


  addTaskRow: {
  flexDirection:     'row',
  alignItems:        'center',
  gap:               SPACING.sm,
  marginHorizontal:  SPACING.md,
  marginTop:         SPACING.sm,
  padding:           SPACING.sm,
  borderRadius:      BORDER_RADIUS.md,
  borderWidth:       1,
},
addTaskText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
});