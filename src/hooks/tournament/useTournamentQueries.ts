
import { useQuery } from "@tanstack/react-query";
import { supabase, logError } from "@/integrations/supabase/client";
import { TournamentMatch, Tournament } from "@/types/game";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export const useTournamentQueries = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTournaments = async (roomId: string): Promise<Tournament[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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

  const fetchTournamentMatches = async (tournamentId: string): Promise<TournamentMatch[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
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

  return {
    loading,
    fetchTournaments,
    fetchTournamentMatches
  };
};
