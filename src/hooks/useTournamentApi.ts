
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

  // Create tournament matches
  const createTournamentMatches = async (matches: Omit<TournamentMatch, 'id'>[]) => {
    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('tournament_matches')
        .insert(matches);

      if (error) throw error;
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

  // Save match result and create game record
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
    saveMatchResult
  };
};
