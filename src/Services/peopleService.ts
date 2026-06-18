import { api } from '../lib/api';

export interface Person {
  id:             string;
  name:           string;
  relationship:   string;
  sentiment_avg:  number;
  mention_count:  number;
  last_mentioned: string;
  notes:          string | null;
  vibe:           string;
  vibe_color:     string;
  vibe_emoji:     string;
}

export interface TrendPoint {
  month:     string;
  sentiment: number;
  count:     number;
}

export interface PersonAnalysis {
  person:      Person;
  trend:       TrendPoint[];
  breakdown:   { positive: number; neutral: number; negative: number };
  key_moments: { text: string; sentiment: number }[];
  ai_summary:  string;
  role:        string;
  vibe:        string;
  vibe_emoji:  string;
  vibe_color:  string;
}

export async function fetchPeople(): Promise<Person[]> {
  const response = await api.get('/api/people');
  return response.data.people;
}

export async function fetchPersonAnalysis(personId: string): Promise<PersonAnalysis> {
  const response = await api.get(`/api/people/${personId}`);
  return response.data;
}
export async function extractAllPeople(): Promise<void> {
  await api.post('/api/extract-people/all');
}