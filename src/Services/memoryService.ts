import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export interface MemoryCard {
  id:           string;
  emotion:      string;
  emoji:        string;
  color:        string;
  gradient_end: string;
  title:        string;
  summary:      string;
  date_range:   string;
  insight:      string;
  type:         'ai';  // AI generated
}

export interface UserMemory {
  id:          string;
  description: string;
  photo_url:   string | null;
  memory_date: string;
  type:        'user';  // user created
}

export type AnyMemory = MemoryCard | UserMemory;

export async function fetchMemoryCards(): Promise<{
  cards:    MemoryCard[];
  unlocked: boolean;
}> {
  const response = await api.get('/api/memory-cards');
  const data = response.data;

  // Filter out any cards missing required fields
  const validCards = (data.cards ?? []).filter(
    (c: any) =>
      c.id &&
      c.title &&
      c.title.trim() !== '' &&
      c.summary &&
      c.summary.trim() !== '' &&
      c.color &&
      c.emoji
  );

  return {
    cards:    validCards,
    unlocked: data.unlocked ?? false,
  };
}

export async function fetchUserMemories(userId: string): Promise<UserMemory[]> {
  const { data } = await supabase
    .from('memories')
    .select('id, description, photo_url, memory_date')
    .eq('user_id', userId)
    .order('memory_date', { ascending: false })
    .limit(20);

  return (data ?? []).map(m => ({ ...m, type: 'user' as const }));
}

export type TrendPoint = {
  date:  string;
  value: number;
};

export type Trend = {
  key:      string;
  label:    string;
  emoji:    string;
  color:    string;
  gradient: string;
  points:   TrendPoint[];
  avg:      number;
  trend:    'up' | 'down' | 'flat';
  latest:   number;
};

export async function fetchTrends(): Promise<{
  trends:   Trend[];
  has_data: boolean;
}> {
  const response = await api.get('/api/trends');
  return response.data;
}