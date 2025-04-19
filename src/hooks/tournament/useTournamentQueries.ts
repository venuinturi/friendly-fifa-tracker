
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { supabase, logError } from "@/integrations/supabase/client";
import { TournamentMatch, Tournament } from "@/types/game";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export const useTournamentQueries = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch all tournaments in a room
  const fetchTournaments = async (roomId: string): Promise<Tournament[]> => {
    if (!roomId) {
      console.warn("No roomId provided to fetchTournaments");
      return [];
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error in fetchTournaments:", error);
        throw error;
      }
      
      if (!data) {
        return [];
      }
      
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
    if (!tournamentId) {
      console.warn("No tournamentId provided to fetchTournamentMatches");
      return [];
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) {
        console.error("Error in fetchTournamentMatches:", error);
        throw error;
      }
      
      if (!data) {
        return [];
      }
      
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

  // Add function to fetch player by ID with better error handling
  const fetchPlayerById = async (playerId: string) => {
    if (!playerId) {
      console.warn("No playerId provided to fetchPlayerById");
      return null;
    }
    
    setLoading(true);
    try {
      console.log("Fetching player with ID:", playerId);
      
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found, log the error but don't throw
          console.warn("Player not found:", playerId);
          return null;
        }
        console.error("Error in fetchPlayerById:", error);
        throw error;
      }
      
      console.log("Found player data:", data);
      return data;
    } catch (error) {
      console.error('Error fetching player:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add function to fetch all players in a room
  const fetchRoomPlayers = async (roomId: string) => {
    if (!roomId) {
      console.warn("No roomId provided to fetchRoomPlayers");
      return [];
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('name', { ascending: true });

      if (error) {
        console.error("Error in fetchRoomPlayers:", error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching room players:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Update player with improved error handling
  const updatePlayer = async (playerId: string, updates: any) => {
    if (!playerId) {
      console.warn("No playerId provided to updatePlayer");
      return { success: false, error: "No player ID provided" };
    }
    
    setLoading(true);
    try {
      console.log("Updating player:", playerId, "with:", updates);
      
      const { data, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', playerId)
        .select()
        .single();

      if (error) {
        console.error("Error updating player:", error);
        throw error;
      }
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating player:', error);
      let errorMessage = "Failed to update player";
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchTournaments,
    fetchTournamentMatches,
    fetchPlayerById,
    fetchRoomPlayers,
    updatePlayer
  };
};
