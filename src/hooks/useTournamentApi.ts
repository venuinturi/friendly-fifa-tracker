import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch } from '@/types/game';
import { useToast } from '@/components/ui/use-toast';

// Define TeamStats interface to fix the type errors
interface TeamStats {
  name?: string;
  wins: number;
  goalDiff: number;
}

export const useTournamentApi = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all tournaments in a room
  const fetchTournaments = async (roomId: string): Promise<Tournament[]> => {
    setLoading(true);
    try {
      // We need to use the "any" type here because the Supabase TypeScript types
      // are not aware of our custom tables yet
      const { data, error } = await (supabase as any)
        .from('tournaments')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Tournament[];
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch matches for a specific tournament
  const fetchTournamentMatches = async (tournamentId: string): Promise<TournamentMatch[]> => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      return data as TournamentMatch[];
    } catch (error) {
      console.error('Error loading matches:', error);
      toast({
        title: "Error",
        description: "Failed to load tournament matches",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create a new tournament
  const createTournament = async (
    tournamentData: {
      name: string;
      type: "1v1" | "2v2";
      room_id: string;
      created_by: string;
      status: "pending" | "active" | "completed";
      auto_advance?: boolean;
    }
  ): Promise<Tournament | null> => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tournaments')
        .insert([tournamentData])
        .select();

      if (error) throw error;
      return data[0] as Tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create tournament matches with walkovers for knockout stages
  const createTournamentMatches = async (matches: Omit<TournamentMatch, 'id'>[]) => {
    setLoading(true);
    try {
      // Insert all initial matches
      const { error, data } = await (supabase as any)
        .from('tournament_matches')
        .insert(matches)
        .select();

      if (error) throw error;
      
      // Check if we need to generate next round matches (for walkovers)
      if (data && data.length > 0) {
        await createNextRoundMatches(data);
      }
      
      return true;
    } catch (error) {
      console.error('Error creating tournament matches:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament matches",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Generate next round matches for byes/walkovers
  const createNextRoundMatches = async (currentMatches: TournamentMatch[]) => {
    try {
      // Group matches by round
      const matchesByRound = currentMatches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
      }, {} as Record<number, TournamentMatch[]>);
      
      // Process each round, starting from the lowest
      const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
      
      for (const round of rounds) {
        const roundMatches = matchesByRound[round];
        const tournamentId = roundMatches[0]?.tournament_id;
        
        if (!tournamentId) continue;
        
        // Find matches with BYE and mark them as completed with walkover
        const matchesWithBye = roundMatches.filter(
          match => match.team1 === 'BYE' || match.team2 === 'BYE'
        );
        
        if (matchesWithBye.length > 0) {
          for (const match of matchesWithBye) {
            // Mark match as completed with winner being the non-BYE team
            const winner = match.team1 === 'BYE' ? match.team2 : match.team1;
            const score1 = match.team1 === 'BYE' ? 0 : 3;
            const score2 = match.team2 === 'BYE' ? 0 : 3;
            
            // Update the match status
            await (supabase as any)
              .from('tournament_matches')
              .update({
                status: 'completed',
                winner,
                score1,
                score2
              })
              .eq('id', match.id);
            
            // Create game record for the walkover
            await (supabase as any)
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
                room_id: await getRoomIdForTournament(match.tournament_id)
              }]);
          }
          
          // After processing walkovers, check if we need to generate next round matches
          await generateNextRoundMatches(tournamentId, round);
        }
      }
    } catch (error) {
      console.error('Error handling walkovers:', error);
    }
  };

  // Generate matches for the next round based on current round winners
  const generateNextRoundMatches = async (tournamentId: string, currentRound: number) => {
    try {
      // Get all completed matches from the current round
      const { data: completedMatches, error: fetchError } = await (supabase as any)
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound)
        .eq('status', 'completed')
        .order('match_number', { ascending: true });
      
      if (fetchError) throw fetchError;
      if (!completedMatches || completedMatches.length === 0) return;
      
      // Check if all matches in the current round are completed
      const { count, error: countError } = await (supabase as any)
        .from('tournament_matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound);
      
      if (countError) throw countError;
      
      // Only proceed if all matches in the round are completed
      if (completedMatches.length !== count) return;
      
      // Check if we have exactly 3 winners - need special handling for round-robin
      if (completedMatches.length === 3) {
        // Don't auto-create next round, this will be handled by the round-robin creation
        return;
      }
      
      // Create pairs for the next round
      const nextRound = currentRound + 1;
      const nextRoundMatches = [];
      
      for (let i = 0; i < completedMatches.length; i += 2) {
        const match1 = completedMatches[i];
        const match2 = i + 1 < completedMatches.length ? completedMatches[i + 1] : null;
        
        if (match2) {
          // Regular next round match with two winners
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
        } else {
          // If there's an odd number of winners, one gets a bye to the next round
          nextRoundMatches.push({
            tournament_id: tournamentId,
            team1: match1.winner,
            team2: 'BYE',
            team1_player1: match1.winner === match1.team1 ? match1.team1_player1 : match1.team2_player1,
            team1_player2: match1.winner === match1.team1 ? match1.team1_player2 : match1.team2_player2,
            status: 'pending',
            round: nextRound,
            match_number: Math.floor(i / 2) + 1
          });
        }
      }
      
      if (nextRoundMatches.length > 0) {
        // Insert the next round matches
        const { error: insertError } = await (supabase as any)
          .from('tournament_matches')
          .insert(nextRoundMatches);
        
        if (insertError) throw insertError;
        
        // Process walkovers in the next round
        await createNextRoundMatches(nextRoundMatches as TournamentMatch[]);
      }
    } catch (error) {
      console.error('Error generating next round matches:', error);
    }
  };

  // Create round robin matches when we have 3 teams left or when 2v2 tournament has fewer than 4 players
  const createRoundRobinMatches = async (tournamentId: string) => {
    setLoading(true);
    try {
      // First, get tournament details to check type
      const { data: tournament, error: tournamentError } = await (supabase as any)
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      
      if (tournamentError) throw tournamentError;
      
      // For 2v2 tournaments with few players, handle differently
      if (tournament.type === "2v2") {
        return await handleSmall2v2Tournament(tournamentId);
      }

      // Standard case - get all winners from the last round
      const { data: lastRoundData, error: roundError } = await (supabase as any)
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: false })
        .limit(10); // Get enough to determine the last round
      
      if (roundError) throw roundError;
      if (!lastRoundData || lastRoundData.length === 0) return false;
      
      // Determine the last round number
      const lastRound = Math.max(...lastRoundData.map(match => match.round));
      
      // Get completed matches from the last round
      const lastRoundMatches = lastRoundData.filter(match => match.round === lastRound);
      const completedMatches = lastRoundMatches.filter(match => match.status === 'completed');
      
      // Get winners
      const winners = completedMatches.map(match => ({
        name: match.winner,
        player1: match.winner === match.team1 ? match.team1_player1 : match.team2_player1,
        player2: match.winner === match.team1 ? match.team1_player2 : match.team2_player2,
      }));
      
      // Add team with BYE if present
      const byeMatch = lastRoundMatches.find(match => match.team1 === 'BYE' || match.team2 === 'BYE');
      if (byeMatch) {
        const byeTeamName = byeMatch.team1 === 'BYE' ? byeMatch.team2 : byeMatch.team1;
        const byeTeamPlayer1 = byeMatch.team1 === 'BYE' ? byeMatch.team2_player1 : byeMatch.team1_player1;
        const byeTeamPlayer2 = byeMatch.team1 === 'BYE' ? byeMatch.team2_player2 : byeMatch.team1_player2;
        
        winners.push({
          name: byeTeamName,
          player1: byeTeamPlayer1,
          player2: byeTeamPlayer2
        });
      }
      
      // If we don't have exactly 3 teams, don't proceed
      if (winners.length !== 3) {
        toast({
          title: "Error",
          description: `Round-robin requires exactly 3 teams, but found ${winners.length}`,
          variant: "destructive",
        });
        return false;
      }
      
      // Create round-robin matches (each team plays against the other two)
      const roundRobinRound = lastRound + 1;
      const roundRobinMatches = [
        // Match 1: Team 0 vs Team 1
        {
          tournament_id: tournamentId,
          team1: winners[0].name,
          team2: winners[1].name,
          team1_player1: winners[0].player1,
          team1_player2: winners[0].player2,
          team2_player1: winners[1].player1,
          team2_player2: winners[1].player2,
          status: 'pending',
          round: roundRobinRound,
          match_number: 1
        },
        // Match 2: Team 0 vs Team 2
        {
          tournament_id: tournamentId,
          team1: winners[0].name,
          team2: winners[2].name,
          team1_player1: winners[0].player1,
          team1_player2: winners[0].player2,
          team2_player1: winners[2].player1,
          team2_player2: winners[2].player2,
          status: 'pending',
          round: roundRobinRound,
          match_number: 2
        },
        // Match 3: Team 1 vs Team 2
        {
          tournament_id: tournamentId,
          team1: winners[1].name,
          team2: winners[2].name,
          team1_player1: winners[1].player1,
          team1_player2: winners[1].player2,
          team2_player1: winners[2].player1,
          team2_player2: winners[2].player2,
          status: 'pending',
          round: roundRobinRound,
          match_number: 3
        }
      ];
      
      // Insert the round-robin matches
      const { error: insertError } = await (supabase as any)
        .from('tournament_matches')
        .insert(roundRobinMatches);
      
      if (insertError) throw insertError;
      
      // Update tournament metadata to include round-robin info
      await (supabase as any)
        .from('tournaments')
        .update({ 
          has_round_robin: true,
          round_robin_round: roundRobinRound,
          round_robin_team1: winners[0].name,
          round_robin_team2: winners[1].name,
          round_robin_team3: winners[2].name
        })
        .eq('id', tournamentId);
      
      return true;
    } catch (error) {
      console.error('Error creating round-robin matches:', error);
      toast({
        title: "Error",
        description: "Failed to create round-robin matches",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Special handling for 2v2 tournaments with fewer than 4 players
  const handleSmall2v2Tournament = async (tournamentId: string) => {
    try {
      // Get all players for this tournament from the room
      const { data: tournament } = await (supabase as any)
        .from('tournaments')
        .select('room_id')
        .eq('id', tournamentId)
        .single();

      if (!tournament || !tournament.room_id) return false;

      // Get players from room
      const { data: players } = await (supabase as any)
        .from('players')
        .select('id, name')
        .eq('room_id', tournament.room_id);

      if (!players || players.length < 3) {
        toast({
          title: "Error",
          description: "Need at least 3 players for a round-robin tournament",
          variant: "destructive",
        });
        return false;
      }

      // Create all possible team combinations
      const teams = [];
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          teams.push({
            name: `${players[i].name} & ${players[j].name}`,
            player1: players[i].id,
            player2: players[j].id
          });
        }
      }

      // If we have too many teams, limit to a reasonable number
      const selectedTeams = teams.length > 4 ? teams.slice(0, 4) : teams;
      
      // Generate round-robin matches (each team plays against all others)
      const roundRobinMatches = [];
      let matchNumber = 1;

      for (let i = 0; i < selectedTeams.length; i++) {
        for (let j = i + 1; j < selectedTeams.length; j++) {
          roundRobinMatches.push({
            tournament_id: tournamentId,
            team1: selectedTeams[i].name,
            team2: selectedTeams[j].name,
            team1_player1: selectedTeams[i].player1,
            team1_player2: selectedTeams[i].player2,
            team2_player1: selectedTeams[j].player1,
            team2_player2: selectedTeams[j].player2,
            status: 'pending',
            round: 1,
            match_number: matchNumber++
          });
        }
      }

      if (roundRobinMatches.length === 0) return false;

      // Insert the round-robin matches
      const { error: insertError } = await (supabase as any)
        .from('tournament_matches')
        .insert(roundRobinMatches);

      if (insertError) throw insertError;

      // Update tournament metadata
      await (supabase as any)
        .from('tournaments')
        .update({
          has_round_robin: true,
          round_robin_round: 1
        })
        .eq('id', tournamentId);

      toast({
        title: "Success",
        description: `Created a round-robin tournament with ${selectedTeams.length} teams`,
      });
      return true;
    } catch (error) {
      console.error('Error creating small 2v2 tournament:', error);
      return false;
    }
  };

  // Advance from round-robin to final based on scores
  const advanceToNextRound = async (tournamentId: string, currentRound: number) => {
    setLoading(true);
    try {
      // First check if all matches in the current round are completed
      const { data: roundMatches, error: matchesError } = await (supabase as any)
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound);
      
      if (matchesError) throw matchesError;
      
      // Check if all matches are completed
      const allCompleted = roundMatches.every(match => match.status === 'completed');
      if (!allCompleted) {
        toast({
          title: "Error",
          description: "All matches in this round must be completed first",
          variant: "destructive",
        });
        return false;
      }
      
      // Get tournament to check if it's a round-robin
      const { data: tournament, error: tournamentError } = await (supabase as any)
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();
      
      if (tournamentError) throw tournamentError;
      
      // Type guard to ensure tournament is the correct type before accessing properties
      if (!tournament) {
        throw new Error("Tournament not found");
      }
      
      // Define a type guard function to check if a property exists in tournament
      const hasTournamentProperty = <T extends string>(obj: any, prop: T): obj is { [K in T]: any } => {
        return obj && typeof obj === 'object' && prop in obj;
      };
      
      // If this is a round-robin round (meaning we have 3 teams left)
      if (hasTournamentProperty(tournament, 'has_round_robin') && tournament.has_round_robin && 
          hasTournamentProperty(tournament, 'round_robin_round') && tournament.round_robin_round === currentRound) {
        // Calculate team stats
        const teamStats: Record<string, TeamStats> = {};
        
        // Extract all team names from matches
        const teamNames = Array.from(new Set(
          roundMatches.flatMap(match => [match.team1, match.team2])
        ));
        
        // Initialize team stats for each team
        teamNames.forEach(team => {
          if (typeof team === 'string') {
            teamStats[team] = { wins: 0, goalDiff: 0 };
          }
        });
        
        // Calculate wins and goal difference
        roundMatches.forEach(match => {
          if (match.status !== 'completed') return;
          
          const team1 = match.team1;
          const team2 = match.team2;
          
          if (match.score1 > match.score2) {
            teamStats[team1].wins += 1;
          } else if (match.score2 > match.score1) {
            teamStats[team2].wins += 1;
          } else {
            // Draw - half win for both
            teamStats[team1].wins += 0.5;
            teamStats[team2].wins += 0.5;
          }
          
          teamStats[team1].goalDiff += (match.score1 - match.score2);
          teamStats[team2].goalDiff += (match.score2 - match.score1);
        });
        
        console.log('Team stats for round robin:', teamStats);
        
        // Sort teams by wins, then goal difference
        const sortedTeams = Object.entries(teamStats).sort((a, b) => {
          if (b[1].wins !== a[1].wins) {
            return b[1].wins - a[1].wins;
          }
          return b[1].goalDiff - a[1].goalDiff;
        });
        
        console.log('Sorted teams:', sortedTeams);
        
        // Check if there's a tie for second place that needs to be resolved by goal difference
        if (sortedTeams.length >= 3 && 
            sortedTeams[1][1].wins === sortedTeams[2][1].wins && 
            sortedTeams[1][1].goalDiff === sortedTeams[2][1].goalDiff) {
          toast({
            title: "Another round-robin needed",
            description: "There's a tie in both wins and goal difference. Creating another round-robin.",
          });
          
          // Create another round-robin with the same teams
          return await createRoundRobinMatches(tournamentId);
        } else {
          // Get the top 2 teams for the final
          const finalist1 = sortedTeams[0][0];
          const finalist2 = sortedTeams[1][0];
          
          console.log('Finalists:', finalist1, finalist2);
          
          // Get player details for the finalists
          const finalist1Details = roundMatches.find(match => match.team1 === finalist1 || match.team2 === finalist1);
          const finalist2Details = roundMatches.find(match => match.team1 === finalist2 || match.team2 === finalist2);
          
          if (!finalist1Details || !finalist2Details) {
            throw new Error("Could not find details for finalists");
          }
          
          // Create the final match
          const finalMatch = {
            tournament_id: tournamentId,
            team1: finalist1,
            team2: finalist2,
            team1_player1: finalist1 === finalist1Details.team1 ? finalist1Details.team1_player1 : finalist1Details.team2_player1,
            team1_player2: finalist1 === finalist1Details.team1 ? finalist1Details.team1_player2 : finalist1Details.team2_player2,
            team2_player1: finalist2 === finalist2Details.team1 ? finalist2Details.team1_player1 : finalist2Details.team2_player1,
            team2_player2: finalist2 === finalist2Details.team1 ? finalist2Details.team1_player2 : finalist2Details.team2_player2,
            status: 'pending',
            round: currentRound + 1,
            match_number: 1
          };
          
          console.log('Creating final match:', finalMatch);
          
          // Insert the final match
          const { error: insertError } = await (supabase as any)
            .from('tournament_matches')
            .insert([finalMatch]);
          
          if (insertError) throw insertError;
          
          toast({
            title: "Success",
            description: `Final created between ${finalist1} and ${finalist2}`,
          });
          return true;
        }
      } else {
        // Regular advancement - generate next round by winners
        await generateNextRoundMatches(tournamentId, currentRound);
        return true;
      }
    } catch (error) {
      console.error('Error advancing to next round:', error);
      toast({
        title: "Error",
        description: "Failed to advance to next round",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate round-robin results
  const calculateRoundRobinResults = (matches: TournamentMatch[]): TeamStats[] => {
    // Extract unique team names
    const teamNames = Array.from(new Set(
      matches.flatMap(match => [match.team1, match.team2])
    ));
    
    // Initialize team stats
    const teamStats: Record<string, TeamStats> = {};
    teamNames.forEach(team => {
      teamStats[team] = { name: team, wins: 0, goalDiff: 0 };
    });
    
    // Calculate stats
    matches.forEach(match => {
      if (match.status !== 'completed' || match.score1 === null || match.score2 === null) return;
      
      const team1 = match.team1;
      const team2 = match.team2;
      
      if (match.score1 > match.score2) {
        teamStats[team1].wins += 1;
      } else if (match.score2 > match.score1) {
        teamStats[team2].wins += 1;
      } else {
        // Draw - half win for both
        teamStats[team1].wins += 0.5;
        teamStats[team2].wins += 0.5;
      }
      
      teamStats[team1].goalDiff += (match.score1 - match.score2);
      teamStats[team2].goalDiff += (match.score2 - match.score1);
    });
    
    // Convert to array and sort
    return Object.values(teamStats)
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.goalDiff - a.goalDiff;
      });
  };

  // Get the room ID for a tournament
  const getRoomIdForTournament = async (tournamentId: string): Promise<string | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from('tournaments')
        .select('room_id')
        .eq('id', tournamentId)
        .single();
      
      if (error) throw error;
      return data?.room_id || null;
    } catch (error) {
      console.error('Error getting room ID for tournament:', error);
      return null;
    }
  };

  // Update a tournament match
  const updateTournamentMatch = async (
    matchId: string, 
    updateData: Partial<TournamentMatch>
  ) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('tournament_matches')
        .update(updateData)
        .eq('id', matchId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating match:', error);
      toast({
        title: "Error",
        description: "Failed to update match",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete a tournament and its matches
  const deleteTournament = async (tournamentId: string) => {
    setLoading(true);
    try {
      // Delete matches first
      const { error: matchesError } = await (supabase as any)
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);

      if (matchesError) throw matchesError;

      // Then delete the tournament
      const { error: tournamentError } = await (supabase as any)
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (tournamentError) throw tournamentError;
      
      return true;
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: "Error",
        description: "Failed to delete tournament",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Save match result and create game record - updated to handle advancing to next round
  const saveMatchResult = async (
    match: TournamentMatch,
    score1: number,
    score2: number,
    tournamentId: string,
    roomId: string,
    userEmail: string,
    userName: string = "Unknown"
  ) => {
    setLoading(true);
    try {
      let winner = '';
      if (score1 > score2) winner = match.team1;
      else if (score2 > score1) winner = match.team2;
      else winner = 'Draw';
      
      // Update the match
      const { error: matchError } = await (supabase as any)
        .from('tournament_matches')
        .update({
          score1,
          score2,
          winner,
          status: 'completed'
        })
        .eq('id', match.id);
      
      if (matchError) throw matchError;
      
      console.log('Saving match result:', {
        team1: match.team1,
        team2: match.team2,
        score1,
        score2,
        winner,
        type: match.team1_player2 ? "2v2" : "1v1",
        tournament_id: tournamentId,
        room_id: roomId,
        created_by: userName,
        team1_player1: match.team1_player1,
        team1_player2: match.team1_player2,
        team2_player1: match.team2_player1,
        team2_player2: match.team2_player2
      });
      
      // Create a game record that will show in match history and affect leaderboard
      const { error: gameError } = await (supabase as any)
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
          created_by: userName,
          tournament_id: tournamentId,
          room_id: roomId
        }]);
      
      if (gameError) {
        console.error('Error creating game record:', gameError);
        throw gameError;
      }
      
      console.log('Successfully saved game record');
      
      // Check if we need to generate next round matches
      const { data: roundMatches, error: roundError } = await (supabase as any)
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', match.round);
      
      if (roundError) throw roundError;
      
      // Check if all matches in this round are completed
      const allCompleted = roundMatches.every(m => m.status === 'completed');
      
      if (allCompleted) {
        // If all matches are completed, check if we should auto-advance
        const { data: tournament, error: tournamentError } = await (supabase as any)
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();
        
        if (tournamentError) throw tournamentError;
        
        // Define a type guard function for tournament properties
        const hasTournamentProperty = <T extends string>(obj: any, prop: T): obj is { [K in T]: any } => {
          return obj && typeof obj === 'object' && prop in obj;
        };
        
        // For tournaments with auto-advance enabled, generate next round
        if (tournament && hasTournamentProperty(tournament, 'auto_advance') && tournament.auto_advance) {
          await generateNextRoundMatches(tournamentId, match.round);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving match result:', error);
      toast({
        title: "Error",
        description: "Failed to save match result",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchTournaments,
    fetchTournamentMatches,
    createTournament,
    createTournamentMatches,
    updateTournamentMatch,
    deleteTournament,
    saveMatchResult,
    createNextRoundMatches,
    generateNextRoundMatches,
    createRoundRobinMatches,
    advanceToNextRound,
    calculateRoundRobinResults
  };
};
