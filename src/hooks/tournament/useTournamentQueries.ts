
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

  // Fetch player by ID with improved error handling
  const fetchPlayerById = async (playerId: string) => {
    if (!playerId) {
      console.warn("No playerId provided to fetchPlayerById");
      return null;
    }
    
    setLoading(true);
    try {
      console.log("Fetching player with ID:", playerId);
      
      // Use single for exact match, but handle the "not found" case properly
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId);

      if (error) {
        console.error("Error in fetchPlayerById:", error);
        toast({
          title: "Error",
          description: "Failed to fetch player data",
          variant: "destructive",
        });
        return null;
      }
      
      if (data && data.length > 0) {
        console.log("Found player data:", data[0]);
        return data[0];
      } else {
        console.warn("Player not found with ID:", playerId);
        return null;
      }
    } catch (error) {
      console.error('Error fetching player:', error);
      toast({
        title: "Error",
        description: "Failed to fetch player data",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to fetch room players",
        variant: "destructive",
      });
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
      
      // Make sure to remove undefined values that can cause issues
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });
      
      // Handle avatar_url separately to avoid conflicts
      const { avatar_url, ...otherUpdates } = updates;
      
      // If there are updates other than avatar_url, process them
      if (Object.keys(otherUpdates).length > 0) {
        const { data, error } = await supabase
          .from('players')
          .update(otherUpdates)
          .eq('id', playerId)
          .select();
  
        if (error) {
          console.error("Error updating player:", error);
          throw error;
        }
      }
      
      // If avatar_url is provided, update it separately
      if (avatar_url !== undefined) {
        const avatarResult = await updatePlayerAvatar(playerId, avatar_url);
        if (!avatarResult.success) {
          return avatarResult; // Return avatar update error if it failed
        }
      }
      
      // Fetch the updated player data
      const { data: updatedPlayer, error: fetchError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();
        
      if (fetchError) {
        console.error("Error fetching updated player:", fetchError);
      }
      
      return { success: true, data: updatedPlayer };
    } catch (error: any) {
      console.error('Error updating player:', error);
      let errorMessage = "Failed to update player";
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Dedicated function for updating player avatar
  const updatePlayerAvatar = async (playerId: string, avatarUrl: string | null) => {
    if (!playerId) {
      console.warn("No playerId provided to updatePlayerAvatar");
      return { success: false, error: "No player ID provided" };
    }
    
    setLoading(true);
    try {
      console.log("Updating player avatar:", playerId, "with URL:", avatarUrl);
      
      // Use a separate update operation just for the avatar_url field
      const { data, error } = await supabase
        .from('players')
        .update({ avatar_url: avatarUrl })
        .eq('id', playerId)
        .select();

      if (error) {
        console.error("Error updating player avatar:", error);
        throw error;
      }
      
      console.log("Avatar update success:", data);
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating player avatar:', error);
      let errorMessage = "Failed to update player avatar";
      
      if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
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
    updatePlayer,
    updatePlayerAvatar
  };
};
