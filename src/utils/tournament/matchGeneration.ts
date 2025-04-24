
import { supabase, logError } from '@/integrations/supabase/client';
import { TournamentMatch } from '@/types/game';

export async function generateNextRoundMatches(tournamentId: string, currentRound: number) {
  try {
    const { data: completedMatches, error: fetchError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round', currentRound)
      .eq('status', 'completed')
      .order('match_number', { ascending: true });
    
    if (fetchError) throw logError(fetchError, 'generateNextRoundMatches');
    if (!completedMatches || completedMatches.length === 0) return;
    
    const { count, error: countError } = await supabase
      .from('tournament_matches')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('round', currentRound);
    
    if (countError) throw logError(countError, 'generateNextRoundMatches');
    if (completedMatches.length !== count) return;
    
    const nextRound = currentRound + 1;
    const nextRoundMatches = [];
    
    // Handle odd number of winners
    if (completedMatches.length % 2 !== 0) {
      const firstWinner = completedMatches[0];
      nextRoundMatches.push({
        tournament_id: tournamentId,
        team1: firstWinner.winner,
        team2: 'BYE',
        team1_player1: firstWinner.winner === firstWinner.team1 ? firstWinner.team1_player1 : firstWinner.team2_player1,
        team1_player2: firstWinner.winner === firstWinner.team1 ? firstWinner.team1_player2 : firstWinner.team2_player2,
        status: 'pending',
        round: nextRound,
        match_number: 1
      });
      
      for (let i = 1; i < completedMatches.length; i += 2) {
        const match1 = completedMatches[i];
        const match2 = i + 1 < completedMatches.length ? completedMatches[i + 1] : null;
        
        if (match2) {
          nextRoundMatches.push({
            tournament_id: tournamentId,
            team1: match1.winner,
            team2: match2.winner,
            team1_player1: match1.winner === match1.team1 ? match1.team1_player1 : match1.team2_player1,
            team1_player2: match1.winner === match1.team1 ? match1.team1_player2 : match1.team2_player2,
            team2_player1: match2.winner === match2.team1 ? match2.team1_player1 : match2.team2_player1,
            team2_player2: match2.winner === match2.team1 ? match2.team1_player2 : match2.team2_player2,
            status: 'pending',
            round: nextRound,
            match_number: Math.floor(i / 2) + 2
          });
        }
      }
    } else {
      // Even number of winners
      for (let i = 0; i < completedMatches.length; i += 2) {
        const match1 = completedMatches[i];
        const match2 = completedMatches[i + 1];
        
        nextRoundMatches.push({
          tournament_id: tournamentId,
          team1: match1.winner,
          team2: match2.winner,
          team1_player1: match1.winner === match1.team1 ? match1.team1_player1 : match1.team2_player1,
          team1_player2: match1.winner === match1.team1 ? match1.team1_player2 : match1.team2_player2,
          team2_player1: match2.winner === match2.team1 ? match2.team1_player1 : match2.team2_player1,
          team2_player2: match2.winner === match2.team1 ? match2.team1_player2 : match2.team2_player2,
          status: 'pending',
          round: nextRound,
          match_number: Math.floor(i / 2) + 1
        });
      }
    }
    
    if (nextRoundMatches.length > 0) {
      const { error: insertError } = await supabase
        .from('tournament_matches')
        .insert(nextRoundMatches);
      
      if (insertError) throw logError(insertError, 'generateNextRoundMatches');
    }
  } catch (error) {
    console.error('Error generating next round matches:', error);
    logError(error, 'generateNextRoundMatches');
  }
}
