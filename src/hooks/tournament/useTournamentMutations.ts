
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tournament, TournamentMatch } from '@/types/game';
import { useToast } from '@/components/ui/use-toast';

export const useTournamentMutations = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createTournament = async (tournament: Omit<Tournament, 'id' | 'created_at'>) => {
    setLoading(true);
    try {
      // Make sure required fields are present
      const tournamentData = {
        name: tournament.name,
        type: tournament.type,
        room_id: tournament.room_id,
        created_by: tournament.created_by || null,
        status: tournament.status || 'active',
        auto_advance: tournament.auto_advance || false,
        has_round_robin: tournament.has_round_robin || true,
        matches_per_player: tournament.matches_per_player || 1
      };

      console.log('Creating tournament with data:', tournamentData);
      
      const { data, error } = await supabase
        .from('tournaments')
        .insert([tournamentData])
        .select()
        .single();

      if (error) {
        console.error('Tournament creation error:', error);
        throw error;
      }
      
      console.log('Tournament created successfully:', data);
      return data as Tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: "Failed to create tournament",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createTournamentMatches = async (matches: Omit<TournamentMatch, 'id'>[]) => {
    setLoading(true);
    try {
      console.log('Creating tournament matches:', matches);
      const { data, error } = await supabase
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
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateTournamentMatch = async (matchId: string, updates: Partial<TournamentMatch>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .update(updates)
        .eq('id', matchId)
        .select();

      if (error) throw error;
      return data[0] as TournamentMatch;
    } catch (error) {
      console.error('Error updating tournament match:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament match",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    setLoading(true);
    try {
      // First, delete all matches associated with the tournament
      const { error: matchesError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);

      if (matchesError) throw matchesError;

      // Then, delete the tournament itself
      const { error: tournamentError } = await supabase
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
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createTournament,
    createTournamentMatches,
    updateTournamentMatch,
    deleteTournament
  };
};
