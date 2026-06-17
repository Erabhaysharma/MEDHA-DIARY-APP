// ─── Database type map ────────────────────────────────────────────────────────
// These types mirror the Supabase schema exactly.
// Pass `Database` to createClient<Database>() for full type-safety on all queries.

export type Database = {
  public: {
    Tables: {

      profiles: {
        Row: {
          id:               string;
          display_name:     string | null;
          ai_name:          string;
          timezone:         string;
          onboarding_done:  boolean;
          total_entries:    number;
          created_at:       string;
          updated_at:       string;
        };
        Insert: {
          id:               string;
          display_name?:    string | null;
          ai_name?:         string;
          timezone?:        string;
          onboarding_done?: boolean;
          total_entries?:   number;
        };
        Update: {
          display_name?:    string | null;
          ai_name?:         string;
          timezone?:        string;
          onboarding_done?: boolean;
        };
      };

      diary_entries: {
        Row: {
          id:               string;
          user_id:          string;
          title:            string | null;
          content:          string;
          word_count:       number;
          entry_date:       string;
          mood_score:       number | null;
          mood_label:       MoodLabel | null;
          people_mentioned: string[];
          tags:             string[];
          is_indexed:       boolean;
          is_deleted:       boolean;
          created_at:       string;
          updated_at:       string;
        };
        Insert: {
          user_id:           string;
          content:           string;
          title?:            string | null;
          entry_date?:       string;
          mood_score?:       number | null;
          mood_label?:       MoodLabel | null;
          people_mentioned?: string[];
          tags?:             string[];
        };
        Update: {
          title?:            string | null;
          content?:          string;
          entry_date?:       string;
          mood_score?:       number | null;
          mood_label?:       MoodLabel | null;
          people_mentioned?: string[];
          tags?:             string[];
          is_indexed?:       boolean;
          is_deleted?:       boolean;
        };
      };

      entry_chunks: {
        Row: {
          id:                 string;
          entry_id:           string;
          user_id:            string;
          chunk_index:        number;
          chunk_text:         string;
          pinecone_vector_id: string | null;
          token_count:        number;
          created_at:         string;
        };
        Insert: {
          entry_id:            string;
          user_id:             string;
          chunk_index:         number;
          chunk_text:          string;
          pinecone_vector_id?: string | null;
          token_count?:        number;
        };
        Update: {
          pinecone_vector_id?: string | null;
        };
      };

      people: {
        Row: {
          id:             string;
          user_id:        string;
          name:           string;
          aliases:        string[];
          relationship:   RelationshipType | null;
          sentiment_avg:  number | null;
          mention_count:  number;
          last_mentioned: string | null;
          notes:          string | null;
          created_at:     string;
          updated_at:     string;
        };
        Insert: {
          user_id:       string;
          name:          string;
          aliases?:      string[];
          relationship?: RelationshipType | null;
          notes?:        string | null;
        };
        Update: {
          aliases?:       string[];
          relationship?:  RelationshipType | null;
          sentiment_avg?: number | null;
          mention_count?: number;
          last_mentioned?: string | null;
          notes?:         string | null;
        };
      };

      entry_people: {
        Row: {
          id:              string;
          entry_id:        string;
          person_id:       string;
          user_id:         string;
          sentiment_score: number | null;
          context_snippet: string | null;
        };
        Insert: {
          entry_id:         string;
          person_id:        string;
          user_id:          string;
          sentiment_score?: number | null;
          context_snippet?: string | null;
        };
        Update: {
          sentiment_score?: number | null;
          context_snippet?: string | null;
        };
      };

      chat_sessions: {
        Row: {
          id:              string;
          user_id:         string;
          title:           string;
          message_count:   number;
          last_message_at: string;
          created_at:      string;
        };
        Insert: {
          user_id: string;
          title?:  string;
        };
        Update: {
          title?: string;
        };
      };

      chat_messages: {
        Row: {
          id:               string;
          session_id:       string;
          user_id:          string;
          role:             'user' | 'assistant';
          content:          string;
          source_entry_ids: string[];
          source_dates:     string[];
          created_at:       string;
        };
        Insert: {
          session_id:        string;
          user_id:           string;
          role:              'user' | 'assistant';
          content:           string;
          source_entry_ids?: string[];
          source_dates?:     string[];
        };
        Update: never;
      };
      todos: {
  Row: {
    id:             string;
    user_id:        string;
    title:          string;
    notes:          string | null;
    time_block:     TimeBlock | null;
    scheduled_time: string | null;
    priority:       Priority;
    is_done:        boolean;
    scheduled_date: string;
    created_by:     'user' | 'medha';
    created_at:     string;
    updated_at:     string;
  };
  Insert: {
    user_id:        string;
    title:          string;
    notes?:         string | null;
    time_block?:    TimeBlock | null;
    scheduled_time?: string | null;
    priority?:      Priority;
    is_done?:       boolean;
    scheduled_date?: string;
    created_by?:    'user' | 'medha';
  };
  Update: {
    title?:         string;
    notes?:         string | null;
    time_block?:    TimeBlock | null;
    scheduled_time?: string | null;
    priority?:      Priority;
    is_done?:       boolean;
    scheduled_date?: string;
  };
};

  // Add to Tables section:
memories: {
  Row: {
    id:          string;
    user_id:     string;
    description: string;
    photo_url:   string | null;
    memory_date: string;
    tags:        string[];
    is_indexed:  boolean;
    created_at:  string;
  };
  Insert: {
    user_id:     string;
    description: string;
    photo_url?:  string | null;
    memory_date?: string;
    tags?:       string[];
  };
  Update: {
    description?: string;
    photo_url?:   string | null;
    memory_date?: string;
    tags?:        string[];
  };
};

// Add alias:

    };

    Views: {
      v_entries_with_stats: {
        Row: Database['public']['Tables']['diary_entries']['Row'] & { people_count: number };
      };
      v_people_summary: {
        Row: Database['public']['Tables']['people']['Row'] & {
          sentiment_category: 'positive' | 'neutral' | 'negative';
        };
      };
      v_unindexed_entries: {
        Row: Pick<
          Database['public']['Tables']['diary_entries']['Row'],
          'id' | 'user_id' | 'content' | 'entry_date' | 'mood_score' | 'mood_label' | 'created_at'
        >;
      };
    };
  };
};

// ─── Convenience aliases — import these in your screens ──────────────────────
export type Profile      = Database['public']['Tables']['profiles']['Row'];
export type DiaryEntry   = Database['public']['Tables']['diary_entries']['Row'];
export type EntryChunk   = Database['public']['Tables']['entry_chunks']['Row'];
export type Person       = Database['public']['Tables']['people']['Row'];
export type ChatSession  = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatMessage  = Database['public']['Tables']['chat_messages']['Row'];

export type InsertDiaryEntry  = Database['public']['Tables']['diary_entries']['Insert'];
export type InsertChatMessage = Database['public']['Tables']['chat_messages']['Insert'];
export type InsertPerson      = Database['public']['Tables']['people']['Insert'];

export type MoodLabel        = 'amazing' | 'good' | 'neutral' | 'bad' | 'awful';
export type RelationshipType = 'friend' | 'family' | 'colleague' | 'romantic' | 'acquaintance' | 'other';

export const MOOD_OPTIONS = [
  { label: 'amazing' as MoodLabel, score: 5, emoji: '🤩', color: '#4CAF50' },
  { label: 'good'    as MoodLabel, score: 4, emoji: '😊', color: '#8BC34A' },
  { label: 'neutral' as MoodLabel, score: 3, emoji: '😐', color: '#FFC107' },
  { label: 'bad'     as MoodLabel, score: 2, emoji: '😔', color: '#FF9800' },
  { label: 'awful'   as MoodLabel, score: 1, emoji: '😞', color: '#F44336' },
];
//____________________________LATER ADDED FAETURE____________________________________
export type Todo       = Database['public']['Tables']['todos']['Row'];
export type InsertTodo = Database['public']['Tables']['todos']['Insert'];
export type TimeBlock  = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
export type Priority   = 'high' | 'normal' | 'low';

export const TIME_BLOCKS: { value: TimeBlock; label: string; icon: string; time: string }[] = [
  { value: 'morning',   label: 'Morning',   icon: 'sunny-outline',       time: '6am – 12pm' },
  { value: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline', time: '12pm – 5pm' },
  { value: 'evening',   label: 'Evening',   icon: 'moon-outline',         time: '5pm – 9pm'  },
  { value: 'night',     label: 'Night',     icon: 'star-outline',         time: '9pm – 12am' },
  { value: 'anytime',   label: 'Anytime',   icon: 'infinite-outline',     time: 'Flexible'   },
];

export const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'High',   color: '#A05252' },
  { value: 'normal', label: 'Normal', color: '#C8A96E' },
  { value: 'low',    label: 'Low',    color: '#6A9E72' },

];

//____________________impliment memories feature________________
export type Memory = Database['public']['Tables']['memories']['Row'];