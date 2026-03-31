import { supabase } from "./supabase";

export async function logKill(matchId: string, killerId: string, victimId: string) {
  const { error } = await supabase
    .from("match_events")
    .insert([
      { match_id: matchId, killer_id: killerId, victim_id: victimId }
    ]);
  
  if (error) console.error("Error logging kill:", error);

  // Increment total kills in profile
  await supabase.rpc('increment_kills', { user_id: killerId });
}

export async function logWin(matchId: string, winnerId: string) {
  const { error } = await supabase
    .from("matches")
    .update({ status: 'finished', winner_id: winnerId })
    .eq('id', matchId);
    
  if (error) console.error("Error logging win:", error);

  // Increment total wins in profile
  await supabase.rpc('increment_wins', { user_id: winnerId });
}
