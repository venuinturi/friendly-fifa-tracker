
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TournamentMatch, Tournament } from '@/types/game';
import { useToast } from '@/components/ui/use-toast';

export const useTournamentMutations = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createTournament = async (
    name: string,
    type: "1v1" | "2v2",
    roomId: string,
    createdBy: string,
    autoAdvance: boolean = false,
    hasRoundRobin: boolean = false,
    matchesPerPlayer: number = 1
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert([
          {
            name,
            type,
            room_id: roomId,
            created_by: createdBy,
            auto_advance: autoAdvance,
            has_round_robin: hasRoundRobin,
            matches_per_player: matchesPerPlayer,
            status: 'pending'
          }
        ])
        .select();
        
      if (error) throw error;
      
      return data?.[0] as Tournament;
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
  
  const createTournamentMatches = async (matches: Omit<TournamentMatch, 'id'>[]) => {
    setLoading(true);
    try {
      console.log('Creating tournament matches:', matches);
      
      const { error } = await supabase
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
  
  const updateTournamentMatch = async (
    matchId: string, 
    updates: Partial<TournamentMatch>
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tournament_matches')
        .update(updates)
        .eq('id', matchId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating tournament match:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament match",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    setLoading(true);
    try {
      // First, delete all matches for this tournament
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournamentId);
        
      if (matchError) throw matchError;
      
      // Then delete the tournament itself
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);
        
      if (error) throw error;
      
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
  
  const updateTournamentStatus = async (tournamentId: string, status: 'pending' | 'active' | 'completed') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status })
        .eq('id', tournamentId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating tournament status:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createTournament,
    createTournamentMatches,
    updateTournamentMatch,
    deleteTournament,
    updateTournamentStatus
  };
};
