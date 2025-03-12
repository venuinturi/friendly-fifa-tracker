
import { supabase, logError } from '@/integrations/supabase/client';
import { TournamentMatch } from '@/types/game';
import { generateNextRoundMatches } from './matchGeneration';

export async function handleMatchWalkovers(matches: TournamentMatch[]) {
  try {
    const matchesByRound = matches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, TournamentMatch[]>);
    
    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    
    for (const round of rounds) {
      const roundMatches = matchesByRound[round];
      const tournamentId = roundMatches[0]?.tournament_id;
      
      if (!tournamentId) continue;
      
      const matchesWithBye = roundMatches.filter(
        match => match.team1 === 'BYE' || match.team2 === 'BYE'
      );
      
      if (matchesWithBye.length > 0) {
        for (const match of matchesWithBye) {
          const winner = match.team1 === 'BYE' ? match.team2 : match.team1;
          const score1 = match.team1 === 'BYE' ? 0 : 3;
          const score2 = match.team2 === 'BYE' ? 0 : 3;
          
          await supabase
            .from('tournament_matches')
            .update({
              status: 'completed',
              winner,
              score1,
              score2
            })
            .eq('id', match.id);
          
          const roomId = await getRoomIdForTournament(match.tournament_id);
          
          await supabase
            .from('games')
            .insert([{
              team1: match.team1,
              team2: match.team2,
              score1,
              score2,
              winner,
              type: match.team1_player2 ? "2v2" : "1v1",
              team1_player1: match.team1_player1,
              team1_player2: match.team1_player2,
              team2_player1: match.team2_player1,
              team2_player2: match.team2_player2,
              created_by: 'system',
              tournament_id: match.tournament_id,
              room_id: roomId
            }]);
        }
        
        await generateNextRoundMatches(tournamentId, round);
      }
    }
  } catch (error) {
    console.error('Error handling walkovers:', error);
    logError(error, 'handleMatchWalkovers');
  }
}

async function getRoomIdForTournament(tournamentId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('room_id')
      .eq('id', tournamentId)
      .single();
    
    if (error) throw logError(error, 'getRoomIdForTournament');
    return data?.room_id || null;
  } catch (error) {
    console.error('Error getting room ID for tournament:', error);
    return null;
  }
}
