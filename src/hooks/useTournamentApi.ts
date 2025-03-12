
import { useState } from 'react';
import { supabase, logError } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch } from '@/types/game';
import { useToast } from '@/components/ui/use-toast';

export const useTournamentApi = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all tournaments in a room
  const fetchTournaments = async (roomId: string): Promise<Tournament[]> => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('tournaments')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) throw logError(error, 'fetchTournaments');
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

      if (error) throw logError(error, 'fetchTournamentMatches');
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

      if (error) throw logError(error, 'createTournament');
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

      if (error) throw logError(error, 'createTournamentMatches');
      
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
      logError(error, 'createNextRoundMatches');
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
      
      if (fetchError) throw logError(fetchError, 'generateNextRoundMatches');
      if (!completedMatches || completedMatches.length === 0) return;
      
      // Check if all matches in the current round are completed
      const { count, error: countError } = await (supabase as any)
        .from('tournament_matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound);
      
      if (countError) throw logError(countError, 'generateNextRoundMatches');
      
      // Only proceed if all matches in the round are completed
      if (completedMatches.length !== count) return;
      
      // Create pairs for the next round
      const nextRound = currentRound + 1;
      const nextRoundMatches = [];
      
      // Handle odd number of winners - if there's an odd number, give first winner a bye
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
        
        // Now pair the rest
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
              match_number: Math.floor(i / 2) + 2 // +2 because we've already used match number 1 for the bye
            });
          }
        }
      } else {
        // Even number of winners, create regular pairs
        for (let i = 0; i < completedMatches.length; i += 2) {
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
              match_number: Math.floor(i / 2) + 1
            });
          }
        }
      }
      
      if (nextRoundMatches.length > 0) {
        // Insert the next round matches
        const { error: insertError } = await (supabase as any)
          .from('tournament_matches')
          .insert(nextRoundMatches);
        
        if (insertError) throw logError(insertError, 'generateNextRoundMatches');
        
        // Process walkovers in the next round
        await createNextRoundMatches(nextRoundMatches as TournamentMatch[]);
      }
    } catch (error) {
      console.error('Error generating next round matches:', error);
      logError(error, 'generateNextRoundMatches');
    }
  };

  // Handle 2v2 tournament with fewer than 4 players
  const handleSmall2v2Tournament = async (tournamentId: string) => {
    try {
      // Get tournament details
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
          description: "Need at least 3 players for a tournament",
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

      // Select teams
      const selectedTeams = teams.length > 4 ? teams.slice(0, 4) : teams;
      
      // Create knockout tournament matches
      const matches = [];
      let matchNumber = 1;
      
      if (selectedTeams.length <= 1) {
        toast({
          title: "Error",
          description: "Not enough teams to create a tournament",
          variant: "destructive",
        });
        return false;
      }
      
      // Handle odd number of teams - give first team a bye
      if (selectedTeams.length % 2 !== 0) {
        matches.push({
          tournament_id: tournamentId,
          team1: selectedTeams[0].name,
          team2: 'BYE',
          team1_player1: selectedTeams[0].player1,
          team1_player2: selectedTeams[0].player2,
          status: 'pending',
          round: 1,
          match_number: matchNumber++
        });
        
        // Pair the rest
        for (let i = 1; i < selectedTeams.length - 1; i += 2) {
          matches.push({
            tournament_id: tournamentId,
            team1: selectedTeams[i].name,
            team2: selectedTeams[i + 1].name,
            team1_player1: selectedTeams[i].player1,
            team1_player2: selectedTeams[i].player2,
            team2_player1: selectedTeams[i + 1].player1,
            team2_player2: selectedTeams[i + 1].player2,
            status: 'pending',
            round: 1,
            match_number: matchNumber++
          });
        }
      } else {
        // Even number of teams
        for (let i = 0; i < selectedTeams.length; i += 2) {
          matches.push({
            tournament_id: tournamentId,
            team1: selectedTeams[i].name,
            team2: selectedTeams[i + 1].name,
            team1_player1: selectedTeams[i].player1,
            team1_player2: selectedTeams[i].player2,
            team2_player1: selectedTeams[i + 1].player1,
            team2_player2: selectedTeams[i + 1].player2,
            status: 'pending',
            round: 1,
            match_number: matchNumber++
          });
        }
      }

      if (matches.length === 0) return false;

      // Insert the matches
      const { error: insertError } = await (supabase as any)
        .from('tournament_matches')
        .insert(matches);

      if (insertError) throw logError(insertError, 'handleSmall2v2Tournament');

      toast({
        title: "Success",
        description: `Created a tournament with ${selectedTeams.length} teams`,
      });
      return true;
    } catch (error) {
      console.error('Error creating small 2v2 tournament:', error);
      logError(error, 'handleSmall2v2Tournament');
      return false;
    }
  };

  // Advance to next round
  const advanceToNextRound = async (tournamentId: string, currentRound: number) => {
    setLoading(true);
    try {
      // Check if all matches in the current round are completed
      const { data: roundMatches, error: matchesError } = await (supabase as any)
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', currentRound);
      
      if (matchesError) throw logError(matchesError, 'advanceToNextRound');
      
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
      
      // Generate next round by winners
      await generateNextRoundMatches(tournamentId, currentRound);
      return true;
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

  // Get the room ID for a tournament
  const getRoomIdForTournament = async (tournamentId: string): Promise<string | null> => {
    try {
      const { data, error } = await (supabase as any)
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

      if (error) throw logError(error, 'updateTournamentMatch');
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

      if (matchesError) throw logError(matchesError, 'deleteTournament');

      // Then delete the tournament
      const { error: tournamentError } = await (supabase as any)
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (tournamentError) throw logError(tournamentError, 'deleteTournament');
      
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

  // Save match result and create game record with proper user attribution
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
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .update({
          score1,
          score2,
          winner,
          status: 'completed'
        })
        .eq('id', match.id);
      
      if (matchError) throw logError(matchError, 'saveMatchResult - updating match');
      
      console.log('Saving match result with user:', {
        team1: match.team1,
        team2: match.team2,
        score1,
        score2,
        winner,
        type: match.team1_player2 ? "2v2" : "1v1",
        tournament_id: tournamentId,
        room_id: roomId,
        created_by: userName || userEmail || 'Unknown',
        updated_by: userName || userEmail || 'Unknown'
      });
      
      // Create a game record that will show in match history and affect leaderboard
      const { error: gameError } = await supabase
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
          created_by: userName || userEmail || 'Unknown',
          updated_by: userName || userEmail || 'Unknown',
          tournament_id: tournamentId,
          room_id: roomId
        }]);
      
      if (gameError) {
        console.error('Error creating game record:', gameError);
        throw logError(gameError, 'saveMatchResult - creating game record');
      }
      
      console.log('Successfully saved game record');
      
      // Check if we need to generate next round matches
      const { data: roundMatches, error: roundError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', match.round);
      
      if (roundError) throw logError(roundError, 'saveMatchResult - checking round matches');
      
      // Check if all matches in this round are completed
      const allCompleted = roundMatches.every(m => m.status === 'completed');
      
      if (allCompleted) {
        // If all matches are completed, check if we should auto-advance
        const { data: tournament, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();
        
        if (tournamentError) throw logError(tournamentError, 'saveMatchResult - checking tournament');
        
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
    handleSmall2v2Tournament,
    advanceToNextRound
  };
};
