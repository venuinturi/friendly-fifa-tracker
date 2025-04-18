
import { supabase, logError } from '@/integrations/supabase/client';
import { TournamentMatch } from '@/types/game';
import { generateNextRoundMatches, generateWalkover } from './matchGeneration';

export async function handleMatchWalkovers(matches: TournamentMatch[]) {
  try {
    // Group matches by round
    const matchesByRound = new Map<number, TournamentMatch[]>();
    
    matches.forEach(match => {
      if (!matchesByRound.has(match.round)) {
        matchesByRound.set(match.round, []);
      }
      matchesByRound.get(match.round)?.push(match);
    });
    
    // Sort rounds in ascending order
    const sortedRounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);
    
    for (const round of sortedRounds) {
      const roundMatches = matchesByRound.get(round) || [];
      
      // Skip the highest round as there's no next round to check/create
      if (round === Math.max(...sortedRounds)) continue;
      
      // Check if all matches in this round are complete
      const allCompleted = roundMatches.every(match => match.status === 'completed');
      if (!allCompleted) continue;
      
      // Get the tournament ID (all matches should have the same tournament ID)
      const tournamentId = roundMatches[0]?.tournament_id;
      if (!tournamentId) continue;
      
      // Check if next round already exists
      const nextRound = round + 1;
      const nextRoundExists = matchesByRound.has(nextRound) && matchesByRound.get(nextRound)?.length > 0;
      
      // If next round doesn't exist, we need to create it
      if (!nextRoundExists) {
        // Inform the server that we're creating the next round
        console.log(`Creating next round (${nextRound}) for tournament ${tournamentId}`);
        
        // Handle special case for final round
        if (nextRound === sortedRounds.length && roundMatches.length === 2) {
          // Get the winners of the two semifinal matches
          const match1 = roundMatches[0];
          const match2 = roundMatches[1];
          
          if (!match1.winner || !match2.winner) {
            console.error('Cannot create final round: winners not determined for both semifinal matches');
            continue;
          }
          
          // Create final match
          await supabase
            .from('tournament_matches')
            .insert([{
              tournament_id: tournamentId,
              team1: match1.winner,
              team2: match2.winner,
              team1_player1: match1.team1 === match1.winner ? match1.team1_player1 : match1.team2_player1,
              team1_player2: match1.team1 === match1.winner ? match1.team1_player2 : match1.team2_player2,
              team2_player1: match2.team1 === match2.winner ? match2.team1_player1 : match2.team2_player1, 
              team2_player2: match2.team1 === match2.winner ? match2.team1_player2 : match2.team2_player2,
              round: nextRound,
              match_number: 1,
              status: 'pending'
            }]);
        }
        
        // Update to pass the correct number of arguments
        const nextRoundMatches = generateNextRoundMatches(tournamentId, roundMatches, nextRound);
        
        if (nextRoundMatches.length > 0) {
          try {
            const { error } = await supabase
              .from('tournament_matches')
              .insert(nextRoundMatches);
              
            if (error) {
              console.error('Error creating next round matches:', error);
            } else {
              console.log(`Successfully created ${nextRoundMatches.length} matches for round ${nextRound}`);
            }
          } catch (error) {
            console.error('Exception creating next round matches:', error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error handling match walkovers:', error);
  }
}

export async function advanceRoundRobin(
  tournamentId: string, 
  currentRoundNumber: number,
  allMatchesComplete: boolean
) {
  try {
    if (!allMatchesComplete) {
      console.error('Cannot advance round robin: not all matches in current round are complete');
      return false;
    }
    
    // Get current tournament data
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();
      
    if (tournamentError) {
      console.error('Error fetching tournament:', tournamentError);
      return false;
    }
    
    // Get all matches for this tournament
    const { data: matches, error: matchesError } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId);
      
    if (matchesError || !matches) {
      console.error('Error fetching tournament matches:', matchesError);
      return false;
    }
    
    // TODO: Implement round-robin specific logic here
    
    return true;
  } catch (error) {
    console.error('Error advancing round robin:', error);
    return false;
  }
}
