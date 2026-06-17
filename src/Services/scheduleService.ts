import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { Todo, InsertTodo, TimeBlock, Priority } from '../types/database';

// ─── Fetch todos for a specific date ─────────────────────────────────────────
export async function fetchTodos(date: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('scheduled_date', date)
    .order('is_done',        { ascending: true  })
    .order('scheduled_time', { ascending: true, nullsFirst: true })
    .order('created_at',     { ascending: true  });

  if (error) {
    console.error('Fetch todos error:', error);
    throw error;
  }
  return data ?? [];
}

// ─── Create a todo ────────────────────────────────────────────────────────────
export async function createTodo(todo: InsertTodo): Promise<Todo> {
  const { data, error } = await supabase
    .from('todos')
    .insert(todo)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Toggle done ──────────────────────────────────────────────────────────────
export async function toggleTodo(id: string, isDone: boolean): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update({ is_done: isDone })
    .eq('id', id);

  if (error) throw error;
}

// ─── Delete a todo ────────────────────────────────────────────────────────────
export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Update a todo ────────────────────────────────────────────────────────────
export async function updateTodo(
  id: string,
  updates: Partial<InsertTodo>
): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

// ─── Ask Medha to generate a plan ────────────────────────────────────────────
export interface MedhaTask {
  title:          string;
  time_block:     TimeBlock;
  scheduled_time: string | null;
  priority:       Priority;
  notes:          string | null;
}

export interface PlanResponse {
  tasks:   MedhaTask[];
  insight: string;
}

export async function generatePlan(): Promise<PlanResponse> {
  const response = await api.post('/api/plan');
  return response.data;
}

// ─── Save Medha's suggested tasks to Supabase ─────────────────────────────────
export async function saveMedhaplan(
  tasks:   MedhaTask[],
  userId:  string,
  date:    string,
): Promise<void> {
  const inserts: InsertTodo[] = tasks.map(task => ({
    user_id:        userId,
    title:          task.title,
    notes:          task.notes,
    time_block:     task.time_block,
    scheduled_time: task.scheduled_time,
    priority:       task.priority,
    scheduled_date: date,
    created_by:     'medha',
  }));

  const { error } = await supabase
    .from('todos')
    .insert(inserts);

  if (error) throw error;
}