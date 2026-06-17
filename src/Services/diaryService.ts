import { api } from '../lib/api';

// ─── Ingest a diary entry into Pinecone ──────────────────────────────────────
// Called after saving an entry to Supabase.
// Runs in background — user doesn't wait for it.
export async function ingestEntry(params: {
  entry_id:   string;
  content:    string;
  entry_date: string;
  mood_label?: string | null;
  title?:      string | null;
}): Promise<void> {
  try {
    await api.post('/api/ingest', params);
  } catch (error) {
    // Silently fail — entry is already saved in Supabase.
    // Pinecone will get it on next ingest attempt.
    console.warn('Ingest failed — will retry later:', error);
  }
}
export async function extractPeople(params: {
  entry_id:   string;
  content:    string;
  entry_date: string;
}): Promise<void> {
  try {
    await api.post('/api/extract-people', params);
  } catch (error) {
    console.warn('People extraction failed:', error);
  }
}