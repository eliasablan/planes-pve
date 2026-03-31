import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Check your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Types ---

export type Profile = {
  id: string;
  username: string;
  total_kills: number;
  total_wins: number;
  ranking_points: number;
  updated_at: string;
};

export type MatchStatus = 'lobby' | 'playing' | 'finished';

export type Match = {
  id: string;
  room_name: string;
  status: MatchStatus;
  start_time: string | null;
  winner_id: string | null;
  created_at: string;
};

export type MatchEvent = {
  id: string;
  match_id: string;
  killer_id: string;
  victim_id: string;
  created_at: string;
};
