import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch } from '@/types/game';
import { useToast } from '@/components/ui/use-toast';

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
            await supabase.from('games').insert([{
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
    userEmail: string
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
      
      // Create a game record
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
          created_by: userEmail,
          tournament_id: tournamentId,
          room_id: roomId
        }]);
      
      if (gameError) throw gameError;
      
      // Check if we need to generate next round matches
      await generateNextRoundMatches(tournamentId, match.round);
      
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
    generateNextRoundMatches
  };
};
